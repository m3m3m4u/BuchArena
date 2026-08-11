import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelTeilnahmenCollection,
  getBuchzirkelBewerbungenCollection,
  getBuchzirkelCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { STANDARD_AGB_TEXT } from "@/lib/buchzirkel";

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
    const teilnahme = await teilnahmen.findOne({
      buchzirkelId: new ObjectId(id),
      teilnehmerUsername: account.username,
    });

    const bewerbungen = await getBuchzirkelBewerbungenCollection();
    const bewerbung = await bewerbungen.findOne({
      buchzirkelId: new ObjectId(id),
      bewerberUsername: account.username,
    });

    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { agbPflicht: 1, agbText: 1, typ: 1 } }
    );

    const isAgbPflicht = zirkel?.typ === "betaleser" || zirkel?.agbPflicht;
    const agbAkzeptiert = bewerbung?.agbAkzeptiert === true;
    const agbText = zirkel?.agbText || STANDARD_AGB_TEXT;

    return NextResponse.json({
      teilnahme: teilnahme ?? null,
      agbPflicht: isAgbPflicht ?? false,
      agbAkzeptiert,
      agbText,
    });
  } catch (err) {
    console.error("buchzirkel meine-teilnahme:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
