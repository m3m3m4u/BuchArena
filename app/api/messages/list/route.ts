import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection, getMessageConversationsCollection, getUsersCollection } from "@/lib/mongodb";

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
        kooperationId: d.kooperationId ?? null,
        bookCoAuthorId: d.bookCoAuthorId ?? null,
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
        kooperationId: d.kooperationId ?? null,
        bookCoAuthorId: d.bookCoAuthorId ?? null,
        createdAt: d.createdAt.toISOString(),
      }));

      return NextResponse.json({ messages: items });
    }

    // ── Konversationsliste: schnelle Abfrage aus messageConversations-Collection ──
    const me = account.username;
    const convCol = await getMessageConversationsCollection();

    // Zwei parallele Queries statt $or → beide nutzen je ihren Compound-Index
    // { userA: 1, updatedAt: -1 } und { userB: 1, updatedAt: -1 }
    const [convDocsA, convDocsB] = await Promise.all([
      convCol.find({ userA: me }).sort({ updatedAt: -1 }).limit(200).toArray(),
      convCol.find({ userB: me }).sort({ updatedAt: -1 }).limit(200).toArray(),
    ]);
    // Zusammenführen und nach updatedAt sortieren
    const convDocs = [...convDocsA, ...convDocsB].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    ).slice(0, 200);

    const partnerUsernames = convDocs.map((c) => (c.userA === me ? c.userB : c.userA));
    const usersCol = await getUsersCollection();
    const userDocs = await usersCol
      .find(
        { username: { $in: partnerUsernames } },
        {
          projection: {
            username: 1,
            displayName: 1,
            "profile.name.value": 1,
            "profile.name.visibility": 1,
            "profile.profileImage.value": 1,
          },
        },
      )
      .toArray();
    const displayNameMap = new Map<string, string>();
    const profileImageMap = new Map<string, string>();
    for (const u of userDocs) {
      const name =
        u.displayName ||
        (u.profile?.name?.visibility === "public" && u.profile?.name?.value
          ? u.profile.name.value
          : "");
      displayNameMap.set(u.username, name);
      profileImageMap.set(u.username, u.profile?.profileImage?.value ?? "");
    }

    const items = convDocs.map((c) => {
      const partner = c.userA === me ? c.userB : c.userA;
      const unreadCount = c.userA === me ? c.unreadForA : c.unreadForB;
      return {
        id: c.latestMessageId.toHexString(),
        senderUsername: c.latestSender,
        recipientUsername: c.latestRecipient,
        partner,
        displayName: displayNameMap.get(partner) ?? "",
        profileImage: profileImageMap.get(partner) ?? "",
        subject: c.latestSubject,
        body: c.latestBody,
        read: unreadCount === 0,
        readAt: null,
        threadId: null,
        unreadCount,
        createdAt: c.latestCreatedAt.toISOString(),
      };
    });

    return NextResponse.json({ conversations: items });
  } catch (err) {
    console.error("GET /api/messages/list error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
