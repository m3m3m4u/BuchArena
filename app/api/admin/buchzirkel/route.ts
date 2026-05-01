import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelBewerbungenCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";

export async function GET() {
  try {
    const collection = await getBuchzirkelCollection();
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .project({
        _id: 1,
        typ: 1,
        titel: 1,
        genre: 1,
        status: 1,
        veranstalterUsername: 1,
        bewerbungBis: 1,
        maxTeilnehmer: 1,
        createdAt: 1,
        updatedAt: 1,
        buchId: 1,
        leseabschnitte: 1,
        genreFilter: 1,
      })
      .toArray();

    const ids = docs.map((d) => new ObjectId(d._id));

    const [bewerbungenRaw, teilnahmenRaw] = await Promise.all([
      (await getBuchzirkelBewerbungenCollection())
        .find({ buchzirkelId: { $in: ids } }, { projection: { buchzirkelId: 1, status: 1 } })
        .toArray(),
      (await getBuchzirkelTeilnahmenCollection())
        .find({ buchzirkelId: { $in: ids } }, { projection: { buchzirkelId: 1 } })
        .toArray(),
    ]);

    // Zähler je Buchzirkel aufbauen
    type BewerbungCount = { ausstehend: number; angenommen: number; abgelehnt: number; gesamt: number };
    const bewerbungMap = new Map<string, BewerbungCount>();
    for (const b of bewerbungenRaw) {
      const key = b.buchzirkelId.toString();
      if (!bewerbungMap.has(key)) bewerbungMap.set(key, { ausstehend: 0, angenommen: 0, abgelehnt: 0, gesamt: 0 });
      const c = bewerbungMap.get(key)!;
      c.gesamt++;
      if (b.status === "ausstehend") c.ausstehend++;
      else if (b.status === "angenommen") c.angenommen++;
      else if (b.status === "abgelehnt") c.abgelehnt++;
    }

    const teilnahmenMap = new Map<string, number>();
    for (const t of teilnahmenRaw) {
      const key = t.buchzirkelId.toString();
      teilnahmenMap.set(key, (teilnahmenMap.get(key) ?? 0) + 1);
    }

    const result = docs.map((d) => {
      const key = d._id.toString();
      const bew = bewerbungMap.get(key) ?? { ausstehend: 0, angenommen: 0, abgelehnt: 0, gesamt: 0 };
      return {
        ...d,
        bewerbungen: bew,
        teilnehmerAnzahl: teilnahmenMap.get(key) ?? 0,
        leseabschnitteAnzahl: Array.isArray(d.leseabschnitte) ? d.leseabschnitte.length : 0,
      };
    });

    return NextResponse.json({ docs: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const VALID_STATUSES = ["entwurf", "bewerbung", "aktiv", "abgeschlossen", "archiviert"] as const;

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: string; status?: string };
    const { id, status } = body;
    if (!id || !status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: "Ungültige Parameter." }, { status: 400 });
    }
    const collection = await getBuchzirkelCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status as import("@/lib/buchzirkel").BuchzirkelStatus, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Buchzirkel nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
