import { NextResponse } from "next/server";
import { getBucharenaReelVorlagenCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

/** GET — eigene Reel-Vorlagen auflisten */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }

    const col = await getBucharenaReelVorlagenCollection();
    const docs = await col
      .find({ username: account.username })
      .sort({ updatedAt: -1 })
      .project({ coverImg: 0 })
      .toArray();

    return NextResponse.json({ success: true, vorlagen: docs });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** POST — neue Reel-Vorlage anlegen */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.buchtitel?.trim()) {
      return NextResponse.json({ success: false, error: "Buchtitel ist erforderlich" }, { status: 400 });
    }

    const col = await getBucharenaReelVorlagenCollection();
    const count = await col.countDocuments({ username: account.username });
    if (count >= 50) {
      return NextResponse.json({ success: false, error: "Maximal 50 Vorlagen pro Benutzer" }, { status: 400 });
    }

    const now = new Date();
    const doc = {
      username: account.username,
      buchtitel: (body.buchtitel ?? "").slice(0, 200),
      untertitel: (body.untertitel ?? "").slice(0, 300),
      autorName: (body.autorName ?? "").slice(0, 200),
      geschlecht: (body.geschlecht ?? "Autorin").slice(0, 50),
      erscheinungsjahr: (body.erscheinungsjahr ?? "").slice(0, 10),
      genre: (body.genre ?? "").slice(0, 100),
      verlag: (body.verlag ?? "").slice(0, 200),
      coverDesign: (body.coverDesign ?? "").slice(0, 200),
      hintergrund: (body.hintergrund ?? "").slice(0, 500),
      hauptfigur: (body.hauptfigur ?? "").slice(0, 300),
      thema: (body.thema ?? "").slice(0, 200),
      inhalte: (body.inhalte ?? "").slice(0, 500),
      autorHerkunft: (body.autorHerkunft ?? "").slice(0, 200),
      autorBeruf: (body.autorBeruf ?? "").slice(0, 300),
      autorStil: (body.autorStil ?? "").slice(0, 300),
      notiz: (body.notiz ?? "").slice(0, 2000),
      beschreibung: (body.beschreibung ?? "").slice(0, 2000),
      coverImg: typeof body.coverImg === "string" && body.coverImg.startsWith("data:") ? body.coverImg : undefined,
      autorImg: typeof body.autorImg === "string" && body.autorImg.startsWith("data:") ? body.autorImg : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc);
    return NextResponse.json({ success: true, id: result.insertedId.toHexString() }, { status: 201 });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
