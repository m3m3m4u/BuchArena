import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTauschCollection, getTauschBewerbungenCollection, getMessagesCollection, getMessageConversationsCollection, getUsersCollection, isDuplicateKeyError } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { invalidateUnreadCountCacheMany } from "@/lib/messages-unread-cache";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { tauschId?: string; nachricht?: string };
    const tauschId = body.tauschId?.trim();
    const nachricht = (body.nachricht ?? "").trim();

    if (!tauschId || !ObjectId.isValid(tauschId)) {
      return NextResponse.json({ message: "Ungueltige Tausch-ID." }, { status: 400 });
    }
    if (nachricht.length > 1000) {
      return NextResponse.json({ message: "Nachricht darf maximal 1000 Zeichen lang sein." }, { status: 400 });
    }

    const tauschCol = await getTauschCollection();
    const inserat = await tauschCol.findOne({ _id: new ObjectId(tauschId) });

    if (!inserat) {
      return NextResponse.json({ message: "Inserat nicht gefunden." }, { status: 404 });
    }
    if (inserat.authorUsername === account.username) {
      return NextResponse.json({ message: "Du kannst dich nicht auf dein eigenes Inserat bewerben." }, { status: 400 });
    }
    if (inserat.status !== "offen") {
      return NextResponse.json({ message: "Dieses Inserat nimmt keine Bewerbungen mehr an." }, { status: 400 });
    }

    const bewerbungenCol = await getTauschBewerbungenCollection();
    const now = new Date();

    try {
      await bewerbungenCol.insertOne({
        tauschId: new ObjectId(tauschId),
        tauschAuthorUsername: inserat.authorUsername,
        bewerberUsername: account.username,
        nachricht,
        status: "ausstehend",
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return NextResponse.json({ message: "Du hast dich bereits fuer dieses Inserat beworben." }, { status: 409 });
      }
      throw err;
    }

    // Inserenten per Privatnachricht benachrichtigen
    const recipientUsername = inserat.authorUsername;
    const users = await getUsersCollection();
    const recipient = await users.findOne(
      { username: recipientUsername, status: { $ne: "deactivated" } },
      { projection: { _id: 1 } }
    );

    if (recipient) {
      const subject = `Neue Bewerbung: ${inserat.title}`;
      const msgBody = `${account.username} hat sich auf dein Tauschangebot "${inserat.title}" beworben.${nachricht ? `\n\nNachricht: ${nachricht}` : ""}\n\nZu den Bewerbungen: /tauschboerse`;
      const messages = await getMessagesCollection();
      const convCol = await getMessageConversationsCollection();
      const insertResult = await messages.insertOne({
        senderUsername: account.username,
        recipientUsername,
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
      const [userA, userB] = [account.username, recipientUsername].sort();
      const isA = account.username === userA;
      await convCol.updateOne(
        { userA, userB },
        {
          $set: {
            latestMessageId: insertResult.insertedId,
            latestSender: account.username,
            latestRecipient: recipientUsername,
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
      invalidateUnreadCountCacheMany([account.username, recipientUsername]);
    }

    return NextResponse.json({ message: "Bewerbung gesendet." });
  } catch {
    return NextResponse.json({ message: "Bewerbung konnte nicht gesendet werden." }, { status: 500 });
  }
}
