import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
  getBuchzirkelBewerbungenCollection,
  getMessagesCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// POST /api/buchzirkel/einladung/annehmen
// Eingeladener Benutzer nimmt die Einladung an und wird Teilnehmer.
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { buchzirkelId?: string };
    const buchzirkelId = body.buchzirkelId?.trim();
    if (!buchzirkelId || !ObjectId.isValid(buchzirkelId)) {
      return NextResponse.json({ message: "Ungültige Buchzirkel-ID." }, { status: 400 });
    }

    // Prüfe, ob eine gültige Einladung existiert
    const messagesCol = await getMessagesCollection();
    const einladung = await messagesCol.findOne({
      buchzirkelEinladungId: buchzirkelId,
      recipientUsername: account.username,
    });
    if (!einladung) {
      return NextResponse.json({ message: "Keine Einladung gefunden." }, { status: 404 });
    }

    // Buchzirkel laden
    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne({ _id: new ObjectId(buchzirkelId) });
    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }

    if (zirkel.status !== "aktiv" && zirkel.status !== "bewerbung") {
      return NextResponse.json({ message: "Dieser Buchzirkel nimmt keine neuen Teilnehmer mehr auf." }, { status: 400 });
    }

    // Maximale Teilnehmerzahl prüfen
    const teilnahmenCol = await getBuchzirkelTeilnahmenCollection();
    const aktuelleAnzahl = await teilnahmenCol.countDocuments({
      buchzirkelId: new ObjectId(buchzirkelId),
      abgebrochen: { $ne: true },
    });
    if (aktuelleAnzahl >= zirkel.maxTeilnehmer) {
      return NextResponse.json({ message: "Der Buchzirkel hat bereits die maximale Teilnehmerzahl erreicht." }, { status: 400 });
    }

    // Bereits Teilnehmer?
    const bereitsTeils = await teilnahmenCol.findOne({
      buchzirkelId: new ObjectId(buchzirkelId),
      teilnehmerUsername: account.username,
    });
    if (bereitsTeils) {
      return NextResponse.json({ message: "Du nimmst bereits teil." }, { status: 400 });
    }

    const now = new Date();

    // Teilnahme erstellen
    await teilnahmenCol.insertOne({
      buchzirkelId: new ObjectId(buchzirkelId),
      teilnehmerUsername: account.username,
      abgeschlosseneAbschnitte: [],
      persoenlicheDateien: [],
      rezensionsLinks: [],
      fragebogenAntworten: [],
      abgebrochen: false,
      beigetreten: now,
    });

    // Bewerbungs-Dokument anlegen (Status "angenommen"), damit der Benutzer
    // im Dashboard unter "Teilnehmer" erscheint (direkte Einladung ohne Bewerbung).
    const bewerbungenCol = await getBuchzirkelBewerbungenCollection();
    const bereitsBewerbung = await bewerbungenCol.findOne({
      buchzirkelId: new ObjectId(buchzirkelId),
      bewerberUsername: account.username,
    });
    if (!bereitsBewerbung) {
      await bewerbungenCol.insertOne({
        buchzirkelId: new ObjectId(buchzirkelId),
        bewerberUsername: account.username,
        status: "angenommen",
        antworten: [],
        agbAkzeptiert: false,
        bewirbtSichAm: now,
        entschiedenAm: now,
      });
    }

    return NextResponse.json({ ok: true, message: "Du nimmst jetzt am Buchzirkel teil!" });
  } catch (err) {
    console.error("buchzirkel/einladung/annehmen POST:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
