import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getMessagesCollection, getMessageConversationsCollection, getUsersCollection } from "@/lib/mongodb";
import { getProfileDisplayName } from "@/lib/profile";

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

    // ── Chat-Modus: Nachrichten mit einem bestimmten Partner (paginiert) ──
    if (partner) {
      const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
      const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 100);
      const beforeParam = searchParams.get("before");
      const beforeDate = beforeParam ? new Date(beforeParam) : null;
      const hasBefore = beforeDate && !isNaN(beforeDate.getTime());

      const projection = {
        senderUsername: 1,
        recipientUsername: 1,
        subject: 1,
        body: 1,
        read: 1,
        readAt: 1,
        threadId: 1,
        kooperationId: 1,
        bookCoAuthorId: 1,
        buchzirkelEinladungId: 1,
        createdAt: 1,
      } as const;

      const dateFilter = hasBefore ? { createdAt: { $lt: beforeDate } } : {};

      // Zwei separate Queries statt $or → jede nutzt ihren Compound-Index direkt
      // und stoppt mit sort({ createdAt: -1 }).limit(N) früh (kein In-Memory-Sort).
      // Pro Richtung `limit` laden, dann mergen und `limit` neueste behalten.
      const [sentDocs, receivedDocs] = await Promise.all([
        messages
          .find(
            { senderUsername: account.username, recipientUsername: partner, deletedBySender: { $ne: true }, ...dateFilter },
            { projection },
          )
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray(),
        messages
          .find(
            { senderUsername: partner, recipientUsername: account.username, deletedByRecipient: { $ne: true }, ...dateFilter },
            { projection },
          )
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray(),
      ]);

      // Mergen, neueste zuerst, auf `limit` begrenzen, dann für UI älteste zuerst
      const mergedDesc = [...sentDocs, ...receivedDocs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

      // hasMore: wenn beide Richtungen `limit` zurückgaben, gibt es potenziell ältere
      const hasMore = sentDocs.length === limit || receivedDocs.length === limit;

      const merged = mergedDesc.slice().reverse();

      const items = merged.map((d) => ({
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
        buchzirkelEinladungId: d.buchzirkelEinladungId ?? null,
        createdAt: d.createdAt.toISOString(),
      }));

      return NextResponse.json({ messages: items, hasMore });
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
        }, {
          projection: {
            senderUsername: 1,
            recipientUsername: 1,
            subject: 1,
            body: 1,
            read: 1,
            readAt: 1,
            threadId: 1,
            kooperationId: 1,
            bookCoAuthorId: 1,
            buchzirkelEinladungId: 1,
            createdAt: 1,
          },
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
        buchzirkelEinladungId: d.buchzirkelEinladungId ?? null,
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

    // Filter out conversations that do not have at least one message visible to `me`
    const visibleConvDocs = (
      await Promise.all(
        convDocs.map(async (c) => {
          const partner = c.userA === me ? c.userB : c.userA;
          const hasVisible = await messages.findOne({
            $or: [
              { senderUsername: me, recipientUsername: partner, deletedBySender: { $ne: true } },
              { recipientUsername: me, senderUsername: partner, deletedByRecipient: { $ne: true } },
            ],
          }, { projection: { _id: 1 } });
          return hasVisible ? c : null;
        })
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    const partnerUsernames = Array.from(new Set(visibleConvDocs.map((c) => (c.userA === me ? c.userB : c.userA))));
    const usersCol = await getUsersCollection();
    const userDocs = partnerUsernames.length
      ? await usersCol
          .find(
            { username: { $in: partnerUsernames } },
            {
              projection: {
                username: 1,
                displayName: 1,
                "profile.name.value": 1,
                "lektorenProfile.name.value": 1,
                "verlageProfile.name.value": 1,
                "testleserProfile.name.value": 1,
                "bloggerProfile.name.value": 1,
                "speakerProfile.name.value": 1,
                "profile.profileImage.value": 1,
              },
            },
          )
          .toArray()
      : [];
    const displayNameMap = new Map<string, string>();
    const profileImageMap = new Map<string, string>();
    for (const u of userDocs) {
      const name =
        getProfileDisplayName(u) ||
        "";
      displayNameMap.set(u.username, name);
      profileImageMap.set(u.username, u.profile?.profileImage?.value ?? "");
    }

    const items = visibleConvDocs.map((c) => {
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
