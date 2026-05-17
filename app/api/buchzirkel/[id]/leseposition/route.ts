import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBuchzirkelTeilnahmenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

/** GET – liefert alle gespeicherten Lesepositionen des angemeldeten Nutzers für diesen Zirkel */
export async function GET(
  _req: Request,
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
    const teilnahme = await teilnahmen.findOne(
      { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
      { projection: { lesePositionen: 1 } }
    );

    return NextResponse.json({ lesePositionen: teilnahme?.lesePositionen ?? {} });
  } catch (err) {
    console.error("buchzirkel leseposition GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

/** POST – speichert Leseposition für eine Datei */
export async function POST(
  req: Request,
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

    const body = await req.json() as { dateiId?: string; cfi?: string; pdfPage?: number };
    const { dateiId, cfi, pdfPage } = body;

    if (!dateiId || typeof dateiId !== "string") {
      return NextResponse.json({ message: "dateiId fehlt." }, { status: 400 });
    }

    const teilnahmen = await getBuchzirkelTeilnahmenCollection();

    // Prüfen ob der Nutzer überhaupt Teilnehmer ist
    const existing = await teilnahmen.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: account.username,
    });
    if (!existing) {
      return NextResponse.json({ message: "Keine Teilnahme gefunden." }, { status: 403 });
    }

    const update: Record<string, unknown> = {};
    if (typeof cfi === "string" && cfi) {
      update[`lesePositionen.${dateiId}.cfi`] = cfi;
    }
    if (typeof pdfPage === "number" && pdfPage >= 1) {
      update[`lesePositionen.${dateiId}.pdfPage`] = pdfPage;
    }

    if (Object.keys(update).length > 0) {
      await teilnahmen.updateOne(
        { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
        { $set: update }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel leseposition POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
