import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBuchzirkelCollection, getBuchzirkelBewerbungenCollection, getBuchzirkelTeilnahmenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typ = searchParams.get("typ");
    const status = searchParams.get("status") ?? "bewerbung";
    const genre = searchParams.get("genre");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const collection = await getBuchzirkelCollection();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (typ === "testleser" || typ === "betaleser") filter.typ = typ;
    if (status === "aktiv") {
      filter.status = { $in: ["bewerbung", "aktiv"] };
    } else {
      filter.status = status;
    }
    if (genre) filter.genre = genre;

    const docs = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        _id: 1, typ: 1, titel: 1, beschreibung: 1, coverImageUrl: 1,
        genre: 1, status: 1, veranstalterUsername: 1,
        bewerbungBis: 1, maxTeilnehmer: 1, createdAt: 1,
      })
      .toArray();

    // User-spezifische Flags (isBeworben, isTeilnehmer)
    const account = await getServerAccount();
    let beworbenIds = new Set<string>();
    let teilnehmerIds = new Set<string>();
    if (account) {
      const ids = docs.map((d) => new ObjectId(d._id));
      const [bewerbungen, teilnahmen] = await Promise.all([
        (await getBuchzirkelBewerbungenCollection()).find(
          { buchzirkelId: { $in: ids }, bewerberUsername: account.username },
          { projection: { buchzirkelId: 1 } }
        ).toArray(),
        (await getBuchzirkelTeilnahmenCollection()).find(
          { buchzirkelId: { $in: ids }, teilnehmerUsername: account.username },
          { projection: { buchzirkelId: 1 } }
        ).toArray(),
      ]);
      beworbenIds = new Set(bewerbungen.map((b) => b.buchzirkelId.toString()));
      teilnehmerIds = new Set(teilnahmen.map((t) => t.buchzirkelId.toString()));
    }

    const result = docs.map((d) => ({
      ...d,
      isBeworben: beworbenIds.has(d._id.toString()),
      isTeilnehmer: teilnehmerIds.has(d._id.toString()),
    }));

    return NextResponse.json({ zirkel: result });
  } catch (err) {
    console.error("buchzirkel/list:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
