import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// POST: Leseabschnitt als abgeschlossen markieren
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

    const body = (await request.json()) as { abschnittId?: string };
    if (!body.abschnittId) {
      return NextResponse.json({ message: "abschnittId fehlt." }, { status: 400 });
    }

    // Prüfen ob Abschnitt im Zirkel existiert
    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { leseabschnitte: 1 } }
    );
    const abschnitt = zirkel?.leseabschnitte.find((a) => a.id === body.abschnittId);
    if (!abschnitt) {
      return NextResponse.json({ message: "Leseabschnitt nicht gefunden." }, { status: 404 });
    }

    const bereits = teilnahme.abgeschlosseneAbschnitte.includes(body.abschnittId);

    if (bereits) {
      // Rückgängig machen
      await teilnahmen.updateOne(
        { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
        { $pull: { abgeschlosseneAbschnitte: body.abschnittId } }
      );
    } else {
      await teilnahmen.updateOne(
        { buchzirkelId: new ObjectId(id), teilnehmerUsername: account.username },
        { $addToSet: { abgeschlosseneAbschnitte: body.abschnittId } }
      );
    }

    return NextResponse.json({ ok: true, abgeschlossen: !bereits });
  } catch (err) {
    console.error("buchzirkel/[id]/fortschritt:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
