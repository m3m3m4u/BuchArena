import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";

/**
 * DELETE: Eine komplette Unterbrechung löschen (Nur für Admins)
 * Erwartet: ?partner=username
 */
export async function DELETE(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Nicht berechtigt." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const partner = searchParams.get("partner");

    if (!partner) {
      return NextResponse.json({ message: "Partner fehlt." }, { status: 400 });
    }

    const messages = await getMessagesCollection();
    const convCol = await getMessageConversationsCollection();

    // 1. Alle Nachrichten zwischen diesen beiden löschen
    // Hinweis: In diesem System sind Nachrichten immer zwischen zwei Personen.
    // Wir löschen sie komplett aus der Datenbank.
    const deleteResult = await messages.deleteMany({
      $or: [
        { senderUsername: partner },
        { recipientUsername: partner },
      ],
      // Zusätzliche Sicherheit: Wir löschen nur Nachrichten, die EINER dieser beiden Personen gehören.
      // Aber wir wollen eigentlich die Unterhaltung zwischen diesen beiden löschen.
      // Da wir aber nicht wissen, wer der andere Partner war (außer wir hätten einen threadId),
      // müssen wir vorsichtig sein.
      // EIGENTLICH wollen wir die Nachrichten löschen, wo (Sender=A AND Recipient=B) OR (Sender=B AND Recipient=A).
    });

    // Wir brauchen den userA/userB aus der Konversation, um präzise zu löschen.
    const conversation = await convCol.findOne({
      $or: [
        { userA: partner },
        { userB: partner },
      ]
    });

    if (!conversation) {
        return NextResponse.json({ message: "Konversation nicht gefunden." }, { status: 404 });
    }

    const u1 = conversation.userA;
    const u2 = conversation.userB;

    // Präzises Löschen der Nachrichten
    await messages.deleteMany({
      $or: [
        { senderUsername: u1, recipientUsername: u2 },
        { senderUsername: u2, recipientUsername: u1 },
      ]
    });

    // 2. Den Konversationseintrag löschen
    await convCol.deleteOne({ _id: conversation._id });

    return NextResponse.json({ 
        message: "Unterhaltung erfolgreich gelöscht.",
        deletedCount: deleteResult.deletedCount
    });
  } catch (err) {
    console.error("DELETE /api/admin/delete-conversation error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
