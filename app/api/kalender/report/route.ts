import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getKalenderCollection, getMessagesCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

const ADMIN_USERNAME = "Kopernikus";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      eventId?: string;
      text?: string;
    };

    const eventId = body.eventId?.trim();
    const text = body.text?.trim();

    if (!eventId || !ObjectId.isValid(eventId)) {
      return NextResponse.json({ message: "Ungültige Termin-ID." }, { status: 400 });
    }
    if (!text || text.length < 5) {
      return NextResponse.json({ message: "Bitte beschreibe den Fehler (mind. 5 Zeichen)." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ message: "Fehlerbeschreibung zu lang (max. 2000 Zeichen)." }, { status: 400 });
    }

    const kalender = await getKalenderCollection();
    const event = await kalender.findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return NextResponse.json({ message: "Termin nicht gefunden." }, { status: 404 });
    }

    const messages = await getMessagesCollection();
    const now = new Date();

    const subject = `Fehler gemeldet: ${event.title}`;
    const msgBody =
      `${account.username} hat einen Fehler im Termin „${event.title}" (${event.date}) gemeldet:\n\n` +
      text;

    // Recipients: admin + event creator (avoid duplicates)
    const recipients = new Set([ADMIN_USERNAME]);
    if (event.createdBy !== account.username) {
      recipients.add(event.createdBy);
    }

    for (const recipient of recipients) {
      const result = await messages.insertOne({
        senderUsername: account.username,
        recipientUsername: recipient,
        subject,
        body: msgBody,
        read: false,
        deletedBySender: false,
        deletedByRecipient: false,
        createdAt: now,
      });
      await messages.updateOne(
        { _id: result.insertedId },
        { $set: { threadId: result.insertedId } },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kalender report error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
