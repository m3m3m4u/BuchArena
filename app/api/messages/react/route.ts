import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMessagesCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ALLOWED_EMOJIS } from "@/lib/discussions";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      messageId?: string;
      emoji?: string;
    };

    const messageId = body.messageId?.trim();
    // Normalize emoji to NFC to handle variation selector differences (e.g. ❤️)
    const emoji = body.emoji?.normalize("NFC");

    if (!messageId || !ObjectId.isValid(messageId)) {
      return NextResponse.json({ message: "Ungültige Nachrichten-ID." }, { status: 400 });
    }

    if (!emoji || !ALLOWED_EMOJIS.map(e => e.normalize("NFC")).includes(emoji)) {
      return NextResponse.json({ message: "Ungültiges Emoji." }, { status: 400 });
    }

    const messages = await getMessagesCollection();
    const username = account.username;

    // Verify user is sender or recipient of this message
    const msg = await messages.findOne(
      { _id: new ObjectId(messageId) },
      { projection: { senderUsername: 1, recipientUsername: 1 } }
    );

    if (!msg) {
      return NextResponse.json({ message: "Nachricht nicht gefunden." }, { status: 404 });
    }

    if (msg.senderUsername !== username && msg.recipientUsername !== username) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    // Toggle reaction
    const existing = await messages.findOne({
      _id: new ObjectId(messageId),
      reactions: { $elemMatch: { username, emoji } },
    });

    if (existing) {
      await messages.updateOne(
        { _id: new ObjectId(messageId) },
        { $pull: { reactions: { username, emoji } } }
      );
    } else {
      await messages.updateOne(
        { _id: new ObjectId(messageId) },
        { $push: { reactions: { username, emoji } } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/messages/react error:", err);
    return NextResponse.json(
      { message: "Reaktion konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
