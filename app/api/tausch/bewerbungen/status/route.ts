import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTauschBewerbungenCollection, getMessagesCollection, getMessageConversationsCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { invalidateUnreadCountCacheMany } from "@/lib/messages-unread-cache";
import type { TauschBewerbungStatus } from "@/lib/discussions";

const ALLOWED_STATUS: TauschBewerbungStatus[] = ["angenommen", "abgelehnt", "zurueckgezogen"];

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { bewerbungId?: string; status?: string };
    const bewerbungId = body.bewerbungId?.trim();
    const newStatus = body.status?.trim() as TauschBewerbungStatus | undefined;

    if (!bewerbungId || !ObjectId.isValid(bewerbungId) || !newStatus || !ALLOWED_STATUS.includes(newStatus)) {
      return NextResponse.json({ message: "Ungueltige Anfrage." }, { status: 400 });
    }

    const col = await getTauschBewerbungenCollection();
    const bewerbung = await col.findOne({ _id: new ObjectId(bewerbungId) });

    if (!bewerbung) {
      return NextResponse.json({ message: "Bewerbung nicht gefunden." }, { status: 404 });
    }

    // Zurueckziehen darf nur der Bewerber selbst
    if (newStatus === "zurueckgezogen") {
      if (bewerbung.bewerberUsername !== account.username) {
        return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
      }
    } else {
      // Annehmen/Ablehnen darf nur der Inserent oder Admin
      if (
        bewerbung.tauschAuthorUsername !== account.username &&
        account.role !== "SUPERADMIN" &&
        account.role !== "ADMIN"
      ) {
        return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
      }
    }

    const now = new Date();
    await col.updateOne(
      { _id: new ObjectId(bewerbungId) },
      { $set: { status: newStatus, updatedAt: now } }
    );

    // Benachrichtigung per Privatnachricht
    let notifyUsername: string | null = null;
    let subject = "";
    let msgBody = "";

    if (newStatus === "angenommen") {
      notifyUsername = bewerbung.bewerberUsername;
      subject = `Deine Bewerbung wurde angenommen`;
      msgBody = `Gute Nachrichten! Deine Bewerbung auf das Tauschangebot von ${bewerbung.tauschAuthorUsername} wurde angenommen.\n\nZur Tauschboerse: /tauschboerse`;
    } else if (newStatus === "abgelehnt") {
      notifyUsername = bewerbung.bewerberUsername;
      subject = `Rueckmeldung zu deiner Bewerbung`;
      msgBody = `Leider wurde deine Bewerbung auf das Tauschangebot von ${bewerbung.tauschAuthorUsername} nicht angenommen.\n\nZur Tauschboerse: /tauschboerse`;
    }

    if (notifyUsername) {
      const users = await getUsersCollection();
      const recipient = await users.findOne(
        { username: notifyUsername, status: { $ne: "deactivated" } },
        { projection: { _id: 1 } }
      );
      if (recipient) {
        const messages = await getMessagesCollection();
        const convCol = await getMessageConversationsCollection();
        const senderUsername = account.username;
        const insertResult = await messages.insertOne({
          senderUsername,
          recipientUsername: notifyUsername,
          subject,
          body: msgBody,
          read: false,
          deletedBySender: false,
          deletedByRecipient: false,
          createdAt: now,
        });
        await messages.updateOne(
          { _id: insertResult.insertedId },
          { $set: { threadId: insertResult.insertedId } }
        );
        const [userA, userB] = [senderUsername, notifyUsername].sort();
        const isA = senderUsername === userA;
        await convCol.updateOne(
          { userA, userB },
          {
            $set: {
              latestMessageId: insertResult.insertedId,
              latestSender: senderUsername,
              latestRecipient: notifyUsername,
              latestSubject: subject,
              latestBody: msgBody,
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
          { upsert: true }
        );
        invalidateUnreadCountCacheMany([senderUsername, notifyUsername]);
      }
    }

    return NextResponse.json({ message: "Status aktualisiert." });
  } catch {
    return NextResponse.json({ message: "Status konnte nicht aktualisiert werden." }, { status: 500 });
  }
}
