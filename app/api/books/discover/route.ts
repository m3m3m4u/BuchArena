import { NextRequest, NextResponse } from "next/server";
import { getBooksCollection, getDatabase } from "@/lib/mongodb";
import { applyAmazonOverride } from "@/lib/books";
import { normalizeGenre, getGenreVariants } from "@/lib/genres";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const books = await getBooksCollection();
    const db = await getDatabase();
    const empfCol = db.collection("buchempfehlungen");

    // Server-seitige Suche per ?q= und Genre-Filter per ?genre=
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const genreParam = request.nextUrl.searchParams.get("genre")?.trim();

    // Bücher laden – Lookup zuerst, damit Anzeigename für Suche verfügbar ist
    const pipeline: object[] = [
      {
        $lookup: {
          from: "users",
          localField: "ownerUsername",
          foreignField: "username",
          as: "_owner",
          pipeline: [{ $project: { status: 1, username: 1, displayName: 1, "profile.name.value": 1, "profile.deaktiviert": 1 } }],
        },
      },
      { $unwind: { path: "$_owner", preserveNullAndEmptyArrays: true } },
      // Deaktivierte User ausschließen
      { $match: { "_owner.status": { $ne: "deactivated" }, "_owner.profile.deaktiviert": { $ne: true } } },
    ];

    // Suchfilter nach Lookup anwenden, damit _owner.profile.name.value und _owner.displayName verfügbar sind
    const matchConditions: object[] = [];
    if (q) {
      // Zerlege Suchbegriff in einzelne Wörter (Token), damit z. B. "Autor Titel" oder mehrere Suchwörter gleichzeitig matchen
      const tokens = q.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const escaped = escapeRegex(token);
        matchConditions.push({
          $or: [
            { title: { $regex: escaped, $options: "i" } },
            { subtitle: { $regex: escaped, $options: "i" } },
            { publisher: { $regex: escaped, $options: "i" } },
            { isbn: { $regex: escaped, $options: "i" } },
            { ownerUsername: { $regex: escaped, $options: "i" } },
            { "_owner.profile.name.value": { $regex: escaped, $options: "i" } },
            { "_owner.displayName": { $regex: escaped, $options: "i" } },
            { "coAuthors.username": { $regex: escaped, $options: "i" } },
          ],
        });
      }
    }
    if (genreParam) {
      // Normalize the incoming param (e.g. "High-Fantasy" → "Fantasy – High Fantasy"),
      // then match any variant stored in the DB (canonical form OR legacy aliases).
      const canonical = normalizeGenre(genreParam);
      const variants = getGenreVariants(canonical);
      // Each variant is matched as a whole "word" within the comma-separated genre field.
      const variantConditions = variants.map((v) => ({
        genre: { $regex: escapeRegex(v), $options: "i" },
      }));
      matchConditions.push(variantConditions.length === 1 ? variantConditions[0] : { $or: variantConditions });
    }
    if (matchConditions.length > 0) {
      pipeline.push({ $match: matchConditions.length === 1 ? matchConditions[0] : { $and: matchConditions } });
    }

    pipeline.push(
      { $sort: { createdAt: -1 as const } },
      {
        $project: {
          _id: 1,
          ownerUsername: 1,
          coverImageUrl: 1,
          title: 1,
          subtitle: 1,
          publicationYear: 1,
          genre: 1,
          ageFrom: 1,
          ageTo: 1,
          publisher: 1,
          isbn: 1,
          pageCount: 1,
          language: 1,
          description: 1,
          buyLinks: 1,
          amazonOverrideUrl: 1,
          presentationVideoUrl: 1,
          createdAt: 1,
          _owner: 1,
        },
      },
    );
    const raw = await books.aggregate(pipeline).toArray();

    // Empfehlungen-Anzahl pro Buch laden
    const empfCounts = await empfCol
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$bookId", count: { $sum: 1 } } },
      ])
      .toArray();
    const countMap = new Map(empfCounts.map((e) => [e._id, e.count]));

    const list = raw.map((b) => {
      const owner = b._owner as { username?: string; displayName?: string; profile?: { name?: { value?: string } } } | undefined;
      const displayName = owner?.profile?.name?.value || owner?.displayName || owner?.username || b.ownerUsername || "";
      return {
        ...b,
        id: b._id.toString(),
        _id: undefined,
        _owner: undefined,
        subtitle: b.subtitle ?? "",
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
