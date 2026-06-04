import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";
import { invalidateUnreadCountCache } from "@/lib/messages-unread-cache";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const { id } = (await request.json()) as { id?: string };
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige Nachrichten-ID." }, { status: 400 });
    }

    const messages = await getMessagesCollection();
    const oid = new ObjectId(id);

    // Prüfe ob der User Sender oder Empfänger ist
    const doc = await messages.findOne(
      { _id: oid, $or: [{ senderUsername: account.username }, { recipientUsername: account.username }] },
      { projection: { senderUsername: 1, recipientUsername: 1, read: 1, deletedBySender: 1 } }
    );

    if (!doc) {
      return NextResponse.json({ message: "Nachricht nicht gefunden." }, { status: 404 });
    }

    const isSender = doc.senderUsername === account.username;

    if (isSender) {
      // Absender löscht → für beide Seiten entfernen (sofort physisch löschen)
      // Wenn die Nachricht noch ungelesen war, Unread-Count für Empfänger dekrementieren
      if (!doc.read && !doc.deletedBySender) {
        const [userA, userB] = [doc.senderUsername, doc.recipientUsername].sort();
        const recipientIsA = doc.recipientUsername === userA;
        const convCol = await getMessageConversationsCollection();
        await convCol.updateOne(
          { userA, userB, [recipientIsA ? "unreadForA" : "unreadForB"]: { $gt: 0 } },
          { $inc: { [recipientIsA ? "unreadForA" : "unreadForB"]: -1 } },
        );
        invalidateUnreadCountCache(doc.recipientUsername);
      }
      await messages.deleteOne({ _id: oid });
    } else if (doc.recipientUsername === account.username) {
      // Empfänger löscht → nur für Empfänger unsichtbar, Absender sieht sie weiterhin
      await messages.updateOne({ _id: oid }, { $set: { deletedByRecipient: true } });
    }

    return NextResponse.json({ message: "Nachricht gelöscht." });
  } catch (err) {
    console.error("POST /api/messages/delete error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
