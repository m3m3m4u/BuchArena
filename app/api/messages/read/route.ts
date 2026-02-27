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
    const result = await messages.updateOne(
      { _id: new ObjectId(id), recipientUsername: account.username },
      { $set: { read: true, readAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Nachricht nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ message: "Als gelesen markiert." });
  } catch (err) {
    console.error("POST /api/messages/read error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
