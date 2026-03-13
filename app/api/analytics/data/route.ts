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

    return NextResponse.json({
      visitorsPerDay: visitorsPerDay.map((d) => ({
        date: d._id,
        count: d.count,
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
      days: lookbackDays,
    });
  } catch {
    return NextResponse.json(
      { error: "Analytics-Daten konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
