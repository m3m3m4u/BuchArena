import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelBewerbungenCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige Buchzirkel-ID." }, { status: 400 });
    }

    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne({ _id: new ObjectId(id) });
    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }

    // Prüfen, ob der Nutzer Veranstalter oder Teilnehmer ist
    const isVeranstalter = account.username === zirkel.veranstalterUsername;
    const teilnahmenCol = await getBuchzirkelTeilnahmenCollection();
    const teilnahme = await teilnahmenCol.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: account.username,
    });

    if (!isVeranstalter && !teilnahme) {
      return NextResponse.json({ message: "Du nimmst nicht an diesem Buchzirkel teil." }, { status: 403 });
    }

    const now = new Date();
    const bewerbungenCol = await getBuchzirkelBewerbungenCollection();

    await bewerbungenCol.updateOne(
      {
        buchzirkelId: new ObjectId(id),
        bewerberUsername: account.username,
      },
      {
        $set: {
          agbAkzeptiert: true,
          agbAkzeptiertAt: now,
          status: "angenommen",
        },
        $setOnInsert: {
          antworten: [],
          bewirbtSichAm: now,
          entschiedenAm: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, message: "Verschwiegenheitserklärung erfolgreich akzeptiert." });
  } catch (err) {
    console.error("buchzirkel agb-akzeptieren POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
