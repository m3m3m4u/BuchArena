import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const teilnahmen = await getBuchzirkelTeilnahmenCollection();
    const teilnahme = await teilnahmen.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: account.username,
    });

    if (!teilnahme) {
      return NextResponse.json({ message: "Du nimmst nicht an diesem Zirkel teil." }, { status: 403 });
    }

    const body = (await request.json()) as {
      antworten?: { frageId: string; antwort: string }[];
    };

    if (!Array.isArray(body.antworten) || body.antworten.length === 0) {
      return NextResponse.json({ message: "Antworten fehlen." }, { status: 400 });
    }

    // Prüfen ob Fragen existieren
    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { fragebogen: 1 } }
    );

    const validIds = new Set(zirkel?.fragebogen.map((f) => f.id) ?? []);
    const jetzt = new Date();

    const neueAntworten = body.antworten
      .filter((a) => validIds.has(a.frageId) && a.antwort?.trim())
      .map((a) => ({
        frageId: a.frageId,
        antwort: a.antwort.trim().slice(0, 2000),
        abgegebenAm: jetzt,
      }));

    if (neueAntworten.length === 0) {
      return NextResponse.json({ message: "Keine gültigen Antworten." }, { status: 400 });
    }

    // Bestehende Antworten ersetzen
    const bestehende = teilnahme.fragebogenAntworten.filter(
      (a) => !neueAntworten.find((n) => n.frageId === a.frageId)
    );

    await teilnahmen.updateOne(
      { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
      { $set: { fragebogenAntworten: [...bestehende, ...neueAntworten] } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id]/fragebogen:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
