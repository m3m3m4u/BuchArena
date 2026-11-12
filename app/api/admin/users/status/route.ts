import { NextResponse } from "next/server";
import {
  getUsersCollection,
  getBooksCollection,
  getSupportCollection,
  getMessagesCollection,
  getMessageConversationsCollection,
  getMessageReportsCollection,
} from "@/lib/mongodb";
import type { UserStatus } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";
import { invalidateUnreadCountCacheMany } from "@/lib/messages-unread-cache";

type StatusPayload = {
  targetUsername?: string;
  action?: "activate" | "deactivate" | "delete" | "ban_and_purge";
};

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Kein Zugriff." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as StatusPayload;
    const targetUsername = body.targetUsername?.trim();
    const action = body.action;

    if (!targetUsername || !action) {
      return NextResponse.json(
        { message: "Fehlende Parameter." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const target = await users.findOne(
      { username: targetUsername },
      { projection: { role: 1 } }
    );

    if (!target) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { message: "Das SuperAdmin-Konto kann nicht geändert werden." },
        { status: 403 }
      );
    }

    if (action === "ban_and_purge") {
      // 1. Account dauerhaft deaktivieren und als Spammer markieren
      await users.updateOne(
        { username: targetUsername },
        { $set: { status: "deactivated", spamFlagged: true } }
      );

      // 2. Alle vom Spammer versendeten Nachrichten finden und löschen
      const messages = await getMessagesCollection();
      const sentMessages = await messages
        .find({ senderUsername: targetUsername }, { projection: { recipientUsername: 1 } })
        .toArray();
      const affectedRecipients = Array.from(new Set(sentMessages.map((m) => m.recipientUsername)));

      const deleteResult = await messages.deleteMany({ senderUsername: targetUsername });

      // 3. Konversationen bereinigen
      const convCol = await getMessageConversationsCollection();
      await convCol.deleteMany({
        $or: [{ userA: targetUsername }, { userB: targetUsername }],
      });

      // 4. Cache der betroffenen Empfänger sofort invalidieren
      if (affectedRecipients.length > 0) {
        invalidateUnreadCountCacheMany(affectedRecipients);
      }

      // 5. Gemeldete Spam-Einträge als erledigt markieren
      const reportsCol = await getMessageReportsCollection();
      await reportsCol.updateMany(
        { reportedUsername: targetUsername },
        { $set: { status: "resolved" } }
      );

      return NextResponse.json({
        message: `Spammer „${targetUsername}“ wurde gesperrt und ${deleteResult.deletedCount} Nachricht(en) wurden aus allen Postfächern gelöscht.`,
      });
    }

    if (action === "delete") {
      await users.deleteOne({ username: targetUsername });

      const books = await getBooksCollection();
      await books.deleteMany({ ownerUsername: targetUsername });

      const support = await getSupportCollection();
      await support.deleteMany({ username: targetUsername });

      // Auch Nachrichten und Konversationen aufräumen
      const messages = await getMessagesCollection();
      const sentMessages = await messages
        .find({ senderUsername: targetUsername }, { projection: { recipientUsername: 1 } })
        .toArray();
      const affectedRecipients = Array.from(new Set(sentMessages.map((m) => m.recipientUsername)));
      await messages.deleteMany({
        $or: [{ senderUsername: targetUsername }, { recipientUsername: targetUsername }],
      });
      const convCol = await getMessageConversationsCollection();
      await convCol.deleteMany({
        $or: [{ userA: targetUsername }, { userB: targetUsername }],
      });
      if (affectedRecipients.length > 0) {
        invalidateUnreadCountCacheMany(affectedRecipients);
      }

      return NextResponse.json({
        message: `Benutzer „${targetUsername}" wurde gelöscht.`,
      });
    }

    const newStatus: UserStatus = action === "deactivate" ? "deactivated" : "active";
    await users.updateOne({ username: targetUsername }, { $set: { status: newStatus } });

    const label = newStatus === "deactivated" ? "deaktiviert" : "aktiviert";
    return NextResponse.json({
      message: `Benutzer „${targetUsername}" wurde ${label}.`,
    });
  } catch {
    return NextResponse.json(
      { message: "Aktion fehlgeschlagen." },
      { status: 500 }
    );
  }
}
