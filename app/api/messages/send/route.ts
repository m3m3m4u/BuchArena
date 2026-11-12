import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getUsersCollection, getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";
import type { SendMessagePayload } from "@/lib/messages";
import { invalidateUnreadCountCacheMany } from "@/lib/messages-unread-cache";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isSenderTrusted,
  containsUrl,
  getColdOutreachCount24h,
  hasPriorConversation,
} from "@/lib/spam-protection";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    // Rate-Limit: max 15 Nachrichten pro Minute pro Account (gesenkt von 30).
    if (!checkRateLimit(`messages:send:${account.username}`, 15, 60_000)) {
      return NextResponse.json(
        { message: "Zu viele Nachrichten in kurzer Zeit. Bitte kurz warten." },
        { status: 429 },
      );
    }

    const payload = (await request.json()) as SendMessagePayload;

    const recipientUsername = (payload.recipientUsername ?? "").trim();
    const subject = (payload.subject ?? "").trim();
    const body = (payload.body ?? "").trim();
    const rawThreadId = (payload.threadId ?? "").trim();

    if (!recipientUsername) {
      return NextResponse.json({ message: "Empfänger fehlt." }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ message: "Betreff fehlt." }, { status: 400 });
    }
    if (!body) {
      return NextResponse.json({ message: "Nachricht fehlt." }, { status: 400 });
    }
    if (subject.length > 200) {
      return NextResponse.json({ message: "Betreff zu lang (max. 200 Zeichen)." }, { status: 400 });
    }
    if (body.length > 5000) {
      return NextResponse.json({ message: "Nachricht zu lang (max. 5000 Zeichen)." }, { status: 400 });
    }
    if (recipientUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dir selbst keine Nachricht senden." }, { status: 400 });
    }

    // Absender und Empfänger aus DB laden
    const users = await getUsersCollection();
    const [senderUser, recipient] = await Promise.all([
      users.findOne(
        { username: account.username },
        {
          projection: {
            role: 1,
            status: 1,
            spamFlagged: 1,
            blockedUsers: 1,
            profile: 1,
            speakerProfile: 1,
            bloggerProfile: 1,
            testleserProfile: 1,
            lektorenProfile: 1,
            verlageProfile: 1,
          },
        }
      ),
      users.findOne(
        { username: recipientUsername, status: { $ne: "deactivated" } },
        { projection: { _id: 1, blockedUsers: 1 } }
      ),
    ]);

    if (!recipient) {
      return NextResponse.json({ message: "Empfänger nicht gefunden oder deaktiviert." }, { status: 404 });
    }

    // Prüfe ob Absender wegen Spam gesperrt oder deaktiviert ist
    if (senderUser?.status === "deactivated" || senderUser?.spamFlagged) {
      return NextResponse.json(
        { message: "Dein Konto ist für den Nachrichtenversand gesperrt." },
        { status: 403 }
      );
    }

    // Prüfe ob der Empfänger den Absender blockiert hat
    if (recipient.blockedUsers?.includes(account.username)) {
      return NextResponse.json(
        { message: "Dieser Benutzer empfängt derzeit keine Nachrichten von dir." },
        { status: 403 }
      );
    }

    // Prüfe ob der Absender den Empfänger selbst blockiert hat
    if (senderUser?.blockedUsers?.includes(recipientUsername)) {
      return NextResponse.json(
        { message: "Du hast diesen Benutzer blockiert. Hebe die Blockierung zuerst auf." },
        { status: 400 }
      );
    }

    // ── SPAM-SCHUTZ: Erstkontakt (Cold Outreach) prüfen ──
    const hasPrior = await hasPriorConversation(account.username, recipientUsername);
    if (!hasPrior && !rawThreadId) {
      const isTrusted = await isSenderTrusted(account.username, senderUser);

      if (!isTrusted) {
        // Nicht-vertrauenswürdiger / neuer Account ohne Profil oder Buch:
        // 1. Keine externen Links erlaubt
        if (containsUrl(subject) || containsUrl(body)) {
          return NextResponse.json(
            {
              message:
                "Aus Sicherheitsgründen dürfen Konten ohne ausgefülltes Profil oder Bücher keine Web-Links versenden.",
            },
            { status: 400 }
          );
        }

        // 2. Strenges Limit für neue Kontakte: max 3 pro 24 Stunden
        const coldCount = await getColdOutreachCount24h(account.username);
        if (coldCount >= 3) {
          return NextResponse.json(
            {
              message:
                "Sicherheitslimit erreicht: Konten ohne Profil können maximal 3 neue Kontakte pro 24 Stunden anschreiben. Bitte vervollständige dein Profil oder warte bis morgen.",
            },
            { status: 429 }
          );
        }
      } else {
        // Auch für etablierte Accounts: Massenanschreiben begrenzen (max 20 neue Kontakte pro 24h)
        const coldCount = await getColdOutreachCount24h(account.username);
        if (coldCount >= 20) {
          return NextResponse.json(
            {
              message: "Tageslimit für neue Konversationen erreicht (maximal 20 neue Kontakte pro Tag).",
            },
            { status: 429 }
          );
        }
      }
    }

    const messages = await getMessagesCollection();

    // Thread-ID bestimmen: wenn Antwort, existierenden Thread nutzen
    let threadId: ObjectId | undefined;
    if (rawThreadId && ObjectId.isValid(rawThreadId)) {
      threadId = new ObjectId(rawThreadId);
    }

    const now = new Date();
    const insertResult = await messages.insertOne({
      senderUsername: account.username,
      recipientUsername,
      subject,
      body,
      read: false,
      threadId,
      deletedBySender: false,
      deletedByRecipient: false,
      createdAt: now,
    });

    // Wenn neue Nachricht (kein Thread), setze _id als threadId
    if (!threadId) {
      await messages.updateOne(
        { _id: insertResult.insertedId },
        { $set: { threadId: insertResult.insertedId } },
      );
    }

    // ── messageConversations aktuell halten (für schnelle Konversationsliste) ──
    const [userA, userB] = [account.username, recipientUsername].sort();
    const isA = account.username === userA;
    const convCol = await getMessageConversationsCollection();
    await convCol.updateOne(
      { userA, userB },
      {
        $set: {
          latestMessageId: insertResult.insertedId,
          latestSender: account.username,
          latestRecipient: recipientUsername,
          latestSubject: subject,
          latestBody: body,
          latestCreatedAt: now,
          updatedAt: now,
        },
        $inc: { [isA ? "unreadForB" : "unreadForA"]: 1 },
        $setOnInsert: {
          userA,
          userB,
          [isA ? "unreadForA" : "unreadForB"]: 0,
        },
      },
      { upsert: true },
    );

    invalidateUnreadCountCacheMany([account.username, recipientUsername]);

    return NextResponse.json({ message: "Nachricht gesendet." });
  } catch (err) {
    console.error("POST /api/messages/send error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
