import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection, getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const books = await getBooksCollection();
    const db = await getDatabase();
    const empfCol = db.collection("buchempfehlungen");

    // Bücher laden, deaktivierte User per Lookup ausschließen
    const raw = await books
      .aggregate([
        { $sort: { createdAt: -1 as const } },
        { $limit: 500 },
        {
          $lookup: {
            from: "users",
            localField: "ownerUsername",
            foreignField: "username",
            as: "_owner",
            pipeline: [{ $project: { status: 1, username: 1, "profile.name.value": 1 } }],
          },
        },
        { $unwind: { path: "$_owner", preserveNullAndEmptyArrays: true } },
        { $match: { "_owner.status": { $ne: "deactivated" } } },
      ])
      .toArray();

    // Empfehlungen-Anzahl pro Buch laden
    const empfCounts = await empfCol
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$bookId", count: { $sum: 1 } } },
      ])
      .toArray();
    const countMap = new Map(empfCounts.map((e) => [e._id, e.count]));

    const list = raw.map((b) => {
      const owner = b._owner as { username?: string; profile?: { name?: { value?: string } } } | undefined;
      const displayName = owner?.profile?.name?.value || owner?.username || b.ownerUsername;
      return {
        ...b,
        id: b._id.toString(),
        _id: undefined,
        _owner: undefined,
        authorDisplayName: displayName,
        empfehlungenCount: countMap.get(b._id.toString()) ?? 0,
      };
    });

    const res = NextResponse.json({ books: list });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch {
    return NextResponse.json(
      { message: "Bücher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
