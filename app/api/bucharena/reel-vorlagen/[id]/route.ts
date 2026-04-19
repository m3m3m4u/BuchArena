import { NextResponse } from "next/server";
import { getBucharenaReelVorlagenCollection, toObjectId } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

/** GET — einzelne Reel-Vorlage laden */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const col = await getBucharenaReelVorlagenCollection();
    const vorlage = await col.findOne({ _id: toObjectId(id), username: account.username });
    if (!vorlage) {
      return NextResponse.json({ success: false, error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true, vorlage });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** PUT — Reel-Vorlage aktualisieren */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const body = await request.json();

    const col = await getBucharenaReelVorlagenCollection();
    const existing = await col.findOne({ _id: toObjectId(id), username: account.username });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Nicht gefunden" }, { status: 404 });
    }

    const update: Record<string, unknown> = {
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
      updatedAt: new Date(),
    };

    if (typeof body.coverImg === "string" && body.coverImg.startsWith("data:")) {
      update.coverImg = body.coverImg;
    }
    if (typeof body.autorImg === "string" && body.autorImg.startsWith("data:")) {
      update.autorImg = body.autorImg;
    }

    await col.updateOne({ _id: toObjectId(id) }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** DELETE — Reel-Vorlage löschen */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const col = await getBucharenaReelVorlagenCollection();
    const result = await col.deleteOne({ _id: toObjectId(id), username: account.username });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
