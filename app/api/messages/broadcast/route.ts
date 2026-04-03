import { NextResponse } from "next/server";
import { getUsersCollection, getMessagesCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

type BroadcastPayload = {
  subject?: string;
  body?: string;
};

/**
 * Sendet eine Nachricht an alle aktiven Benutzer (nur ADMIN / SUPERADMIN).
 * Jede Nachricht wird als individuelle Nachricht erstellt,
 * sodass Antworten direkt an den Absender (Admin) zurückgehen.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Nur Admins dürfen Nachrichten an alle senden." },
        { status: 403 },
      );
    }

    const payload = (await request.json()) as BroadcastPayload;
    const subject = (payload.subject ?? "").trim();
    const body = (payload.body ?? "").trim();

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

    const users = await getUsersCollection();
    const allUsers = await users
      .find(
        { username: { $ne: admin.username }, status: { $ne: "deactivated" } },
        { projection: { username: 1 } },
      )
      .toArray();

    if (allUsers.length === 0) {
      return NextResponse.json({ message: "Keine Empfänger vorhanden." }, { status: 400 });
    }

    const messages = await getMessagesCollection();
    const now = new Date();

    const docs = allUsers.map((u) => ({
      senderUsername: admin.username,
      recipientUsername: u.username,
      subject,
      body,
      read: false,
      deletedBySender: false,
      deletedByRecipient: false,
      broadcast: true,
      createdAt: now,
    }));

    await messages.insertMany(docs);

    return NextResponse.json({
      message: `Nachricht an ${allUsers.length} Benutzer gesendet.`,
      count: allUsers.length,
    });
  } catch (err) {
    console.error("POST /api/messages/broadcast error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
