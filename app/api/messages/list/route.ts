import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection, getUsersCollection } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") ?? "inbox";
    const threadId = searchParams.get("threadId");
    const partner = searchParams.get("partner");

    const messages = await getMessagesCollection();

    // ── Chat-Modus: alle Nachrichten mit einem bestimmten Partner ──
    if (partner) {
      const docs = await messages
        .find({
          $or: [
            { senderUsername: account.username, recipientUsername: partner, deletedBySender: { $ne: true } },
            { senderUsername: partner, recipientUsername: account.username, deletedByRecipient: { $ne: true } },
          ],
        })
        .sort({ createdAt: 1 })
        .limit(500)
        .toArray();

      const items = docs.map((d) => ({
        id: d._id!.toHexString(),
        senderUsername: d.senderUsername,
        recipientUsername: d.recipientUsername,
        subject: d.subject,
        body: d.body,
        read: d.read,
        readAt: d.readAt?.toISOString() ?? null,
        threadId: d.threadId?.toHexString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }));

      return NextResponse.json({ messages: items });
    }

    // ── Thread-Modus (legacy): alle Nachrichten eines Threads laden ──
    if (threadId && ObjectId.isValid(threadId)) {
      const docs = await messages
        .find({
          threadId: new ObjectId(threadId),
          $or: [
            { senderUsername: account.username, deletedBySender: { $ne: true } },
            { recipientUsername: account.username, deletedByRecipient: { $ne: true } },
          ],
        })
        .sort({ createdAt: 1 })
        .limit(500)
        .toArray();

      const items = docs.map((d) => ({
        id: d._id!.toHexString(),
        senderUsername: d.senderUsername,
        recipientUsername: d.recipientUsername,
        subject: d.subject,
        body: d.body,
        read: d.read,
        readAt: d.readAt?.toISOString() ?? null,
        threadId: d.threadId?.toHexString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }));

      return NextResponse.json({ messages: items });
    }

    // ── Konversationsliste: alle Chats gruppiert nach Gesprächspartner ──
    const docs = await messages
      .find({
        $or: [
          { senderUsername: account.username, deletedBySender: { $ne: true } },
          { recipientUsername: account.username, deletedByRecipient: { $ne: true } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    // Nach Partner gruppieren – pro Partner nur die neueste Nachricht
    const partnerMap = new Map<string, typeof docs[number] & { unread: number }>();
    for (const d of docs) {
      const p = d.senderUsername === account.username ? d.recipientUsername : d.senderUsername;
      if (!partnerMap.has(p)) {
        partnerMap.set(p, { ...d, unread: 0 });
      }
      // Ungelesene zählen (nur empfangene)
      if (d.recipientUsername === account.username && !d.read) {
        partnerMap.get(p)!.unread += 1;
      }
    }

    const partnerUsernames = [...partnerMap.keys()];
    const usersCol = await getUsersCollection();
    const userDocs = await usersCol
      .find(
        { username: { $in: partnerUsernames } },
        { projection: { username: 1, profile: 1 } },
      )
      .toArray();
    const displayNameMap = new Map<string, string>();
    const profileImageMap = new Map<string, string>();
    for (const u of userDocs) {
      const name =
        u.profile?.name?.visibility === "public" && u.profile?.name?.value
          ? u.profile.name.value
          : "";
      displayNameMap.set(u.username, name);
      profileImageMap.set(u.username, u.profile?.profileImage?.value ?? "");
    }

    const items = [...partnerMap.values()].map((d) => ({
      id: d._id!.toHexString(),
      senderUsername: d.senderUsername,
      recipientUsername: d.recipientUsername,
      partner: d.senderUsername === account.username ? d.recipientUsername : d.senderUsername,
      displayName: displayNameMap.get(
        d.senderUsername === account.username ? d.recipientUsername : d.senderUsername,
      ) ?? "",
      profileImage: profileImageMap.get(
        d.senderUsername === account.username ? d.recipientUsername : d.senderUsername,
      ) ?? "",
      subject: d.subject,
      body: d.body,
      read: d.read,
      readAt: d.readAt?.toISOString() ?? null,
      threadId: d.threadId?.toHexString() ?? null,
      unreadCount: d.unread,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ conversations: items });
  } catch (err) {
    console.error("GET /api/messages/list error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
