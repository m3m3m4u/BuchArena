import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBuchzirkelCollection, getBuchzirkelTeilnahmenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// GET: Alle Teilnahmen für Veranstalter
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
      { projection: { veranstalterUsername: 1 } }
    );
    if (!zirkel) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    if (zirkel.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const col = await getBuchzirkelTeilnahmenCollection();
    const docs = await col.find({ buchzirkelId: new ObjectId(id) }).toArray();

    return NextResponse.json({ teilnahmen: docs });
  } catch (err) {
    console.error("buchzirkel/[id]/teilnahmen GET:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}

// PATCH: Bewertung eines Teilnehmers durch den Veranstalter
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
    const zirkel = await zirkelCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { veranstalterUsername: 1 } }
    );
    if (!zirkel) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    if (zirkel.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const body = (await request.json()) as {
      teilnehmerUsername?: string;
      sterne?: number;
      kommentar?: string;
    };

    if (!body.teilnehmerUsername) {
      return NextResponse.json({ message: "teilnehmerUsername fehlt." }, { status: 400 });
    }
    const sterne = Number(body.sterne);
    if (!sterne || sterne < 1 || sterne > 5) {
      return NextResponse.json({ message: "Sterne müssen zwischen 1 und 5 liegen." }, { status: 400 });
    }

    const col = await getBuchzirkelTeilnahmenCollection();
    await col.updateOne(
      { buchzirkelId: new ObjectId(id), teilnehmerUsername: body.teilnehmerUsername },
      {
        $set: {
          veranstalterBewertung: {
            sterne,
            kommentar: (body.kommentar ?? "").trim().slice(0, 1000),
            bewertetAm: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("buchzirkel/[id]/teilnahmen PATCH:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
