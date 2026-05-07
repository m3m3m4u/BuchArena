import { NextResponse } from "next/server";
import { getKalenderCollection, getUsersCollection } from "@/lib/mongodb";

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
      .find({
        $or: [
          // Events that start within the month
          { date: { $gte: startDate, $lt: endDate } },
          // Multi-day events that started before but extend into the month
          { date: { $lt: endDate }, dateTo: { $gte: startDate } },
        ],
      })
      .sort({ date: 1, timeFrom: 1 })
      .toArray();

    // Look up displayNames for all creators AND participants
    // createdBy may contain an old email-as-username, so match on both username and email
    const creatorUsernames = [...new Set(events.map((e) => e.createdBy))];
    const allParticipants = [...new Set(events.flatMap((e) => e.participants as string[]))];
    const allLookupIds = [...new Set([...creatorUsernames, ...allParticipants])];

    const usersCol = await getUsersCollection();
    const foundUsers = await usersCol
      .find(
        { $or: [{ username: { $in: allLookupIds } }, { email: { $in: allLookupIds } }] },
        { projection: { username: 1, email: 1, displayName: 1 } }
      )
      .toArray();

    const displayNameMap = new Map<string, string>();
    const usernameMap = new Map<string, string>(); // legacy-id -> real username
    for (const u of foundUsers) {
      const name = (u.displayName as string | undefined) || (u.username as string);
      const realUsername = u.username as string;
      if (allLookupIds.includes(realUsername)) {
        displayNameMap.set(realUsername, name);
        usernameMap.set(realUsername, realUsername);
      }
      // legacy: stored as email
      if (allLookupIds.includes(u.email as string)) {
        displayNameMap.set(u.email as string, name);
        usernameMap.set(u.email as string, realUsername);
      }
    }

    const list = events.map((e) => ({
      id: e._id!.toString(),
      title: e.title,
      description: e.description,
      category: e.category,
      date: e.date,
      dateTo: e.dateTo ?? null,
      timeFrom: e.timeFrom ?? null,
      timeTo: e.timeTo ?? null,
      location: e.location ?? null,
      link: e.link ?? null,
      createdBy: e.createdBy,
      createdByUsername: usernameMap.get(e.createdBy) || e.createdBy,
      createdByDisplayName: displayNameMap.get(e.createdBy) || e.createdBy,
      participantCount: e.participants.length,
      participants: e.participants as string[],
      participantDisplayNames: Object.fromEntries(
        (e.participants as string[]).map((p) => [p, displayNameMap.get(p) || p])
      ),
      participantUsernames: Object.fromEntries(
        (e.participants as string[]).map((p) => [p, usernameMap.get(p) || p])
      ),
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ events: list });
  } catch (err) {
    console.error("Kalender list error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
