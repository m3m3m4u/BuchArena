import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBuchzirkelCollection, getBuchzirkelTeilnahmenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { canAccessBuchzirkel } from "@/lib/buchzirkel-access";

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

    if (!dateiId || typeof dateiId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(dateiId)) {
      return NextResponse.json({ message: "dateiId fehlt." }, { status: 400 });
    }

    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { veranstalterUsername: 1, typ: 1, agbPflicht: 1, dateien: 1 } }
    );
    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }

    const teilnahmen = await getBuchzirkelTeilnahmenCollection();


    if (!await canAccessBuchzirkel(zirkel, account.username)) {
      return NextResponse.json({ message: "Keine Teilnahme gefunden." }, { status: 403 });
    }
    if (!zirkel.dateien?.some((datei) => datei.id === dateiId)) {
      return NextResponse.json({ message: "Datei nicht gefunden." }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (typeof cfi === "string" && cfi && cfi.length <= 2000) {
      update[`lesePositionen.${dateiId}.cfi`] = cfi;
    }
    if (typeof pdfPage === "number" && Number.isSafeInteger(pdfPage) && pdfPage >= 1) {
      update[`lesePositionen.${dateiId}.pdfPage`] = pdfPage;
    }

    if (Object.keys(update).length > 0) {
      await teilnahmen.updateOne(
        { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
        {
          $set: update,
          $setOnInsert: {
            abgeschlosseneAbschnitte: [],
            persoenlicheDateien: [],
            rezensionsLinks: [],
            fragebogenAntworten: [],
            abgebrochen: false,
            beigetreten: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel leseposition POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
