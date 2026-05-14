import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { days } = body as { days?: number };
    const lookbackDays = Math.min(Math.max(days ?? 30, 1), 365);

    const db = await getDatabase();
    const collection = db.collection("analytics");

    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    since.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Alle Aggregationen in einer einzigen $facet-Pipeline
    const [result] = await collection
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $facet: {
            visitorsPerDay: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                  },
                  count: { $sum: 1 },
                  uniqueVisitors: { $addToSet: "$visitorId" },
                  loggedInVisitors: {
                    $addToSet: {
                      $cond: [{ $and: [{ $ne: ["$username", ""] }, { $ne: ["$username", null] }] }, "$visitorId", "$$REMOVE"],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  count: 1,
                  unique: { $size: "$uniqueVisitors" },
                  loggedIn: { $size: "$loggedInVisitors" },
                },
              },
              { $sort: { _id: 1 } },
            ],
            topPages: [
              { $group: { _id: "$page", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 30 },
            ],
            topReferrers: [
              { $match: { referrer: { $ne: "" } } },
              {
                $addFields: {
                  referrerHost: {
                    $let: {
                      vars: {
                        m: {
                          $regexFind: {
                            input: "$referrer",
                            regex: "^(?:https?://)?([^/?#:]+)",
                          },
                        },
                      },
                      in: {
                        $ifNull: [{ $arrayElemAt: ["$$m.captures", 0] }, "$referrer"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  referrerHost: {
                    $nin: ["bucharena.org", "www.bucharena.org"],
                  },
                },
              },
              { $group: { _id: "$referrerHost", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 20 },
            ],
            totalViews: [
              { $count: "count" },
            ],
            todayStats: [
              { $match: { timestamp: { $gte: todayStart } } },
              {
                $group: {
                  _id: null,
                  todayViews: { $sum: 1 },
                  uniqueVisitors: { $addToSet: "$visitorId" },
                  loggedInVisitors: {
                    $addToSet: {
                      $cond: [{ $and: [{ $ne: ["$username", ""] }, { $ne: ["$username", null] }] }, "$visitorId", "$$REMOVE"],
                    },
                  },
                },
              },
              {
                $project: {
                  todayViews: 1,
                  todayUniqueVisitors: { $size: "$uniqueVisitors" },
                  todayLoggedInUsers: { $size: "$loggedInVisitors" },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const totalViews = result.totalViews[0]?.count ?? 0;
    const today = result.todayStats[0] ?? { todayViews: 0, todayUniqueVisitors: 0, todayLoggedInUsers: 0 };
    const todayViews = today.todayViews ?? 0;
    const todayUniqueVisitors = today.todayUniqueVisitors ?? 0;
    const todayLoggedInUsers = today.todayLoggedInUsers ?? 0;
    const todayAnonymousUsers = Math.max(0, todayUniqueVisitors - todayLoggedInUsers);

    return NextResponse.json({
      visitorsPerDay: (result.visitorsPerDay as Array<{ _id: string; count: number; unique?: number; loggedIn?: number }>).map((d) => ({
        date: d._id,
        count: d.count,
        unique: d.unique ?? 0,
        loggedIn: d.loggedIn ?? 0,
        anonymous: Math.max(0, (d.unique ?? 0) - (d.loggedIn ?? 0)),
      })),
      topPages: (result.topPages as Array<{ _id: string; count: number }>).map((p) => ({
        page: p._id,
        count: p.count,
      })),
      topReferrers: (result.topReferrers as Array<{ _id: string; count: number }>).map((r) => ({
        referrer: r._id,
        count: r.count,
      })),
      totalViews,
      todayViews,
      todayUniqueVisitors,
      todayLoggedInUsers,
      todayAnonymousUsers,
      days: lookbackDays,
    });
  } catch {
    return NextResponse.json(
      { error: "Analytics-Daten konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
