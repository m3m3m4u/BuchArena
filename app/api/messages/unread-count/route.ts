import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getMessageConversationsCollection } from "@/lib/mongodb";
import { getCachedUnreadCount, setCachedUnreadCount } from "@/lib/messages-unread-cache";

export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ count: 0 });
    }

    const me = account.username;
    const cached = getCachedUnreadCount(me);
    if (cached !== null) {
      return NextResponse.json({ count: cached });
    }

    const convCol = await getMessageConversationsCollection();

    // Summe aus messageConversations – identische Datenquelle wie die Konversationsliste
    const [resA, resB] = await Promise.all([
      convCol.aggregate<{ total: number }>([
        { $match: { userA: me } },
        { $group: { _id: null, total: { $sum: "$unreadForA" } } },
      ]).toArray(),
      convCol.aggregate<{ total: number }>([
        { $match: { userB: me } },
        { $group: { _id: null, total: { $sum: "$unreadForB" } } },
      ]).toArray(),
    ]);

    const count = (resA[0]?.total ?? 0) + (resB[0]?.total ?? 0);
    setCachedUnreadCount(me, count);
    return NextResponse.json({ count });
  } catch (err) {
    console.error("GET /api/messages/unread-count error:", err);
    return NextResponse.json({ count: 0 });
  }
}
