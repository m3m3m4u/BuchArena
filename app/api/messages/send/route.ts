import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getUsersCollection, getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";
import type { SendMessagePayload } from "@/lib/messages";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
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

    // Prüfe ob Empfänger existiert
    const users = await getUsersCollection();
    const recipient = await users.findOne(
      { username: recipientUsername, status: { $ne: "deactivated" } },
      { projection: { _id: 1 } }
    );
    if (!recipient) {
      return NextResponse.json({ message: "Empfänger nicht gefunden." }, { status: 404 });
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

    return NextResponse.json({ message: "Nachricht gesendet." });
  } catch (err) {
    console.error("POST /api/messages/send error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
