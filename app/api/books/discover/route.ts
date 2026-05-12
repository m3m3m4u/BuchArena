import { NextRequest, NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection, getDatabase } from "@/lib/mongodb";
import { applyAmazonOverride } from "@/lib/books";

export async function GET(request: NextRequest) {
  try {
    const books = await getBooksCollection();
    const db = await getDatabase();
    const empfCol = db.collection("buchempfehlungen");

    // Optional: Server-seitige Suche per ?q= und Genre-Filter per ?genre=
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const genreParam = request.nextUrl.searchParams.get("genre")?.trim();

    const matchConditions: object[] = [];
    if (q) {
      matchConditions.push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { publisher: { $regex: q, $options: "i" } },
          { isbn: { $regex: q, $options: "i" } },
          { ownerUsername: { $regex: q, $options: "i" } },
        ],
      });
    }
    if (genreParam) {
      // Genre-Feld kann kommagetrennte Liste sein – prüfe ob genreParam darin enthalten ist
      matchConditions.push({ genre: { $regex: genreParam, $options: "i" } });
    }
    const matchStage = matchConditions.length > 0
      ? { $match: matchConditions.length === 1 ? matchConditions[0] : { $and: matchConditions } }
      : null;

    const hasFilter = !!q || !!genreParam;

    // Bücher laden, deaktivierte User per Lookup ausschließen
    const pipeline: object[] = [
      ...(matchStage ? [matchStage] : []),
      { $sort: { createdAt: -1 as const } },
      ...(hasFilter ? [] : [{ $limit: 500 }]),
      {
        $lookup: {
          from: "users",
          localField: "ownerUsername",
          foreignField: "username",
          as: "_owner",
          pipeline: [{ $project: { status: 1, username: 1, "profile.name.value": 1, "profile.deaktiviert": 1 } }],
        },
      },
      { $unwind: { path: "$_owner", preserveNullAndEmptyArrays: true } },
      { $match: { "_owner.status": { $ne: "deactivated" }, "_owner.profile.deaktiviert": { $ne: true } } },
    ];
    const raw = await books.aggregate(pipeline).toArray();

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
        buyLinks: applyAmazonOverride(b.buyLinks, b.amazonOverrideUrl),
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
