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

    // ── Konversationsliste: Aggregation gruppiert nach Gesprächspartner ──
    const me = account.username;
    const aggResult = await messages
      .aggregate<{
        _id: string;
        latestDoc: {
          _id: ObjectId;
          senderUsername: string;
          recipientUsername: string;
          subject: string;
          body: string;
          read: boolean;
          readAt: Date | null;
          threadId: ObjectId | null;
          kooperationId: string | null;
          bookCoAuthorId: string | null;
          createdAt: Date;
        };
        unreadCount: number;
      }>([
        {
          $match: {
            $or: [
              { senderUsername: me, deletedBySender: { $ne: true } },
              { recipientUsername: me, deletedByRecipient: { $ne: true } },
            ],
          },
        },
        // Nur benötigte Felder laden – reduziert Sort- und Group-Aufwand erheblich
        {
          $project: {
            senderUsername: 1,
            recipientUsername: 1,
            subject: 1,
            body: 1,
            read: 1,
            readAt: 1,
            threadId: 1,
            kooperationId: 1,
            bookCoAuthorId: 1,
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $addFields: {
            partner: {
              $cond: [{ $eq: ["$senderUsername", me] }, "$recipientUsername", "$senderUsername"],
            },
            isUnread: {
              $cond: [
                { $and: [{ $eq: ["$recipientUsername", me] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: "$partner",
            latestDoc: { $first: "$$ROOT" },
            unreadCount: { $sum: "$isUnread" },
          },
        },
        { $sort: { "latestDoc.createdAt": -1 } },
      ])
      .toArray();

    const partnerUsernames = aggResult.map((r) => r._id);
    const usersCol = await getUsersCollection();
    const userDocs = await usersCol
      .find(
        { username: { $in: partnerUsernames } },
        { projection: { username: 1, profile: 1, displayName: 1 } },
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

    const items = aggResult.map((r) => {
      const d = r.latestDoc;
      const partner = r._id;
      return {
        id: d._id.toHexString(),
        senderUsername: d.senderUsername,
        recipientUsername: d.recipientUsername,
        partner,
        displayName: displayNameMap.get(partner) ?? "",
        profileImage: profileImageMap.get(partner) ?? "",
        subject: d.subject,
        body: d.body,
        read: d.read,
        readAt: d.readAt?.toISOString() ?? null,
        threadId: d.threadId?.toHexString() ?? null,
        unreadCount: r.unreadCount,
        createdAt: d.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ conversations: items });
  } catch (err) {
    console.error("GET /api/messages/list error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
