import { NextResponse } from "next/server";
import { getKalenderCollection } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ message: "Ungültige Parameter." }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const col = await getKalenderCollection();
    const events = await col
      .find({ date: { $gte: startDate, $lt: endDate } })
      .sort({ date: 1, timeFrom: 1 })
      .toArray();

    const list = events.map((e) => ({
      id: e._id!.toString(),
      title: e.title,
      description: e.description,
      category: e.category,
      date: e.date,
      timeFrom: e.timeFrom ?? null,
      timeTo: e.timeTo ?? null,
      location: e.location ?? null,
      createdBy: e.createdBy,
      participantCount: e.participants.length,
      participants: e.participants,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ events: list });
  } catch (err) {
    console.error("Kalender list error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
