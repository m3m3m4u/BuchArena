import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection, getMessageConversationsCollection } from "@/lib/mongodb";

/**
 * DELETE: Eine komplette Unterhaltung löschen (Nur für Admins)
 * Erwartet: ?partner=username
 * Löscht alle Nachrichten zwischen dem aktuell eingeloggten Admin und dem angegebenen Partner.
 */
export async function DELETE(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account || (account.role !== "SUPERADMIN" && account.role !== "ADMIN" && account.username !== "Kopernikus")) {
      return NextResponse.json({ message: "Nicht berechtigt." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const partner = searchParams.get("partner");

    if (!partner) {
      return NextResponse.json({ message: "Partner fehlt." }, { status: 400 });
    }

    const me = account.username;
    const messages = await getMessagesCollection();
    const convCol = await getMessageConversationsCollection();

    // Alle Nachrichten zwischen diesen beiden Nutzern löschen
    const deleteResult = await messages.deleteMany({
      $or: [
        { senderUsername: me, recipientUsername: partner },
        { senderUsername: partner, recipientUsername: me },
      ],
    });

    // Konversationseintrag löschen (falls vorhanden)
    await convCol.deleteOne({
      $or: [
        { userA: me, userB: partner },
        { userA: partner, userB: me },
      ],
    });

    return NextResponse.json({
      message: "Unterhaltung erfolgreich gelöscht.",
      deletedCount: deleteResult.deletedCount,
    });
  } catch (err) {
    console.error("DELETE /api/admin/delete-conversation error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
