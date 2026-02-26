import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection } from "@/lib/mongodb";

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
      { projection: { senderUsername: 1, recipientUsername: 1 } }
    );

    if (!doc) {
      return NextResponse.json({ message: "Nachricht nicht gefunden." }, { status: 404 });
    }

    if (doc.senderUsername === account.username) {
      await messages.updateOne({ _id: oid }, { $set: { deletedBySender: true } });
    }
    if (doc.recipientUsername === account.username) {
      await messages.updateOne({ _id: oid }, { $set: { deletedByRecipient: true } });
    }

    // Wenn beide gelöscht haben, komplett entfernen
    const updated = await messages.findOne({ _id: oid }, { projection: { deletedBySender: 1, deletedByRecipient: 1 } });
    if (updated && updated.deletedBySender && updated.deletedByRecipient) {
      await messages.deleteOne({ _id: oid });
    }

    return NextResponse.json({ message: "Nachricht gelöscht." });
  } catch (err) {
    console.error("POST /api/messages/delete error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
