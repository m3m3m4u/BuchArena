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

    // 1. Besucher pro Tag
    const visitorsPerDay = await collection
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
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
      ])
      .toArray();

    // 2. Beliebteste Seiten
    const topPages = await collection
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: "$page",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ])
      .toArray();

    // 3. Referrer-Quellen (nur externe)
    const topReferrers = await collection
      .aggregate([
        {
          $match: {
            timestamp: { $gte: since },
            referrer: { $ne: "" },
          },
        },
        {
          $group: {
            _id: "$referrer",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    // 4. Gesamtstatistiken
    const totalViews = await collection.countDocuments({
      timestamp: { $gte: since },
    });

    // Heute
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayViews = await collection.countDocuments({
      timestamp: { $gte: todayStart },
    });

    // Eindeutige Besucher heute
    const todayUniqueResult = await collection
      .aggregate([
        { $match: { timestamp: { $gte: todayStart }, visitorId: { $exists: true } } },
        { $group: { _id: "$visitorId" } },
        { $count: "count" },
      ])
      .toArray();
    const todayUniqueVisitors = todayUniqueResult[0]?.count ?? 0;

    // Eingeloggte vs. anonyme Besucher heute
    const todayLoggedIn = await collection
      .aggregate([
        { $match: { timestamp: { $gte: todayStart }, username: { $ne: "" } } },
        { $group: { _id: "$visitorId" } },
        { $count: "count" },
      ])
      .toArray();
    const todayLoggedInUsers = todayLoggedIn[0]?.count ?? 0;
    const todayAnonymousUsers = Math.max(0, todayUniqueVisitors - todayLoggedInUsers);

    return NextResponse.json({
      visitorsPerDay: visitorsPerDay.map((d) => ({
        date: d._id,
        count: d.count,
        unique: d.unique ?? 0,
        loggedIn: d.loggedIn ?? 0,
        anonymous: Math.max(0, (d.unique ?? 0) - (d.loggedIn ?? 0)),
      })),
      topPages: topPages.map((p) => ({
        page: p._id,
        count: p.count,
      })),
      topReferrers: topReferrers.map((r) => ({
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
