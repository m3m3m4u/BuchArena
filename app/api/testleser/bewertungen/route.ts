import { NextResponse } from "next/server";
import { getBuchzirkelCollection, getBuchzirkelTeilnahmenCollection, findUserBySlugOrUsername } from "@/lib/mongodb";

/**
 * GET /api/testleser/bewertungen?username=<slug-or-username>
 * Gibt alle Buchzirkel-Sternebewertungen für einen Testleser zurück.
 * Nur Bewertungen von abgeschlossenen Buchzirkeln, bei denen der Teilnehmer
 * nicht abgebrochen hat und eine veranstalterBewertung vorliegt.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usernameParam = searchParams.get("username")?.trim();
    if (!usernameParam) {
      return NextResponse.json({ message: "username fehlt." }, { status: 400 });
    }

    // Slug → echter Username auflösen
    const user = await findUserBySlugOrUsername(usernameParam, { username: 1 });
    if (!user) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }
    const username = user.username;

    // Alle Teilnahmen mit Bewertung laden
    const teilnahmenCol = await getBuchzirkelTeilnahmenCollection();
    const teilnahmen = await teilnahmenCol
      .find(
        {
          teilnehmerUsername: username,
          abgebrochen: { $ne: true },
          "veranstalterBewertung.sterne": { $exists: true },
        },
        {
          projection: {
            buchzirkelId: 1,
            veranstalterBewertung: 1,
            beigetreten: 1,
          },
        }
      )
      .toArray();

    if (teilnahmen.length === 0) {
      return NextResponse.json({ bewertungen: [] });
    }

    // Buchzirkel-Infos laden (Titel, Veranstalter)
    const buchzirkelCol = await getBuchzirkelCollection();
    const buchzirkelIds = teilnahmen.map((t) => t.buchzirkelId);
    const buchzirkelDocs = await buchzirkelCol
      .find(
        { _id: { $in: buchzirkelIds } },
        { projection: { titel: 1, veranstalterUsername: 1, status: 1 } }
      )
      .toArray();

    const buchzirkelMap = new Map(buchzirkelDocs.map((z) => [z._id!.toHexString(), z]));

    const bewertungen = teilnahmen
      .filter((t) => buchzirkelMap.has(t.buchzirkelId.toHexString()))
      .map((t) => {
        const z = buchzirkelMap.get(t.buchzirkelId.toHexString())!;
        const bew = t.veranstalterBewertung!;
        return {
          buchzirkelId: t.buchzirkelId.toHexString(),
          buchzirkelTitel: z.titel,
          veranstalterUsername: z.veranstalterUsername,
          sterne: bew.sterne,
          kommentar: bew.kommentar,
          bewertetAm: bew.bewertetAm instanceof Date
            ? bew.bewertetAm.toISOString()
            : new Date(bew.bewertetAm).toISOString(),
        };
      })
      .sort((a, b) => new Date(b.bewertetAm).getTime() - new Date(a.bewertetAm).getTime());

    return NextResponse.json({ bewertungen });
  } catch (err) {
    console.error("GET /api/testleser/bewertungen error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
