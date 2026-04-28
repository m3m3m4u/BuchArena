import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getBuchzirkelCollection,
  getBuchzirkelBewerbungenCollection,
  getBuchzirkelTeilnahmenCollection,
  getUsersCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { sendMail } from "@/lib/mail";

// GET: Liste aller Bewerber (nur Veranstalter)
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

    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { veranstalterUsername: 1, titel: 1, bewerbungsFragen: 1 } }
    );

    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }
    if (zirkel.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const bewerbungen = await getBuchzirkelBewerbungenCollection();
    const docs = await bewerbungen
      .find({ buchzirkelId: new ObjectId(id) })
      .sort({ bewirbtSichAm: 1 })
      .toArray();

    // Testleser-Profile dazu laden
    const usernames = docs.map((d) => d.bewerberUsername);
    const users = await getUsersCollection();
    const profiles = await users
      .find({ username: { $in: usernames } })
      .project({ username: 1, testleserProfile: 1 })
      .toArray();

    const profileMap = Object.fromEntries(profiles.map((p) => [p.username, p.testleserProfile]));

    const result = docs.map((d) => ({
      ...d,
      testleserProfile: profileMap[d.bewerberUsername] ?? null,
    }));

    return NextResponse.json({ bewerber: result });
  } catch (err) {
    console.error("buchzirkel/[id]/bewerber GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

// PATCH: Bewerbung annehmen oder ablehnen
export async function PATCH(
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

    const zirkelCol = await getBuchzirkelCollection();
    const zirkel = await zirkelCol.findOne({ _id: new ObjectId(id) });

    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }
    if (zirkel.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const body = (await request.json()) as {
      bewerbungId?: string;
      entscheidung?: "angenommen" | "abgelehnt";
    };

    if (!body.bewerbungId || !ObjectId.isValid(body.bewerbungId)) {
      return NextResponse.json({ message: "Ungültige Bewerbungs-ID." }, { status: 400 });
    }
    if (body.entscheidung !== "angenommen" && body.entscheidung !== "abgelehnt") {
      return NextResponse.json({ message: "Ungültige Entscheidung." }, { status: 400 });
    }

    const bewerbungen = await getBuchzirkelBewerbungenCollection();
    const bewerbung = await bewerbungen.findOne({ _id: new ObjectId(body.bewerbungId) });

    if (!bewerbung || bewerbung.buchzirkelId.toString() !== id) {
      return NextResponse.json({ message: "Bewerbung nicht gefunden." }, { status: 404 });
    }

    const now = new Date();
    await bewerbungen.updateOne(
      { _id: new ObjectId(body.bewerbungId) },
      { $set: { status: body.entscheidung, entschiedenAm: now } }
    );

    // Bei Annahme: Teilnahme anlegen
    if (body.entscheidung === "angenommen") {
      const teilnahmen = await getBuchzirkelTeilnahmenCollection();
      const existing = await teilnahmen.findOne({
        buchzirkelId: new ObjectId(id),
        teilnehmerUsername: bewerbung.bewerberUsername,
      });
      if (!existing) {
        await teilnahmen.insertOne({
          buchzirkelId: new ObjectId(id),
          teilnehmerUsername: bewerbung.bewerberUsername,
          abgeschlosseneAbschnitte: [],
          persoenlicheDateien: [],
          rezensionsLinks: [],
          fragebogenAntworten: [],
          abgebrochen: false,
          beigetreten: now,
        });
      }
    }

    // E-Mail-Benachrichtigung
    const users = await getUsersCollection();
    const bewerber = await users.findOne(
      { username: bewerbung.bewerberUsername },
      { projection: { email: 1 } }
    );
    if (bewerber?.email) {
      const angenommen = body.entscheidung === "angenommen";
      await sendMail(
        bewerber.email,
        angenommen
          ? `✅ Du wurdest für den Buchzirkel „${zirkel.titel}" angenommen`
          : `Buchzirkel „${zirkel.titel}" – Bewerbung`,
        angenommen
          ? `<p>Hallo ${bewerbung.bewerberUsername},</p>
             <p>du wurdest für den Buchzirkel <strong>${zirkel.titel}</strong> angenommen. 🎉</p>
             <p><a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://bucharena.org"}/buchzirkel/${id}/teilnehmer">Zum Buchzirkel →</a></p>
             <p>Viel Spaß beim Lesen!<br/>Dein BuchArena-Team</p>`
          : `<p>Hallo ${bewerbung.bewerberUsername},</p>
             <p>leider konntest du für den Buchzirkel <strong>${zirkel.titel}</strong> diesmal nicht berücksichtigt werden.</p>
             <p>Vielleicht klappt es beim nächsten Mal!<br/>Dein BuchArena-Team</p>`
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id]/bewerber PATCH:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
