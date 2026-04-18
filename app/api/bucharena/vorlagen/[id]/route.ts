import { NextResponse } from "next/server";
import { getBucharenaVorlagenCollection, toObjectId } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

function isValidId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toHexString() === id;
}

/** GET — einzelne Vorlage laden (inkl. Bilder) */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const col = await getBucharenaVorlagenCollection();
    const doc = await col.findOne({ _id: toObjectId(id), username: account.username });
    if (!doc) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true, vorlage: doc });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** PUT — Vorlage aktualisieren */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const body = await request.json();
    if (!body.buchtitel?.trim()) {
      return NextResponse.json({ success: false, error: "Buchtitel ist erforderlich" }, { status: 400 });
    }

    const col = await getBucharenaVorlagenCollection();
    const existing = await col.findOne({ _id: toObjectId(id), username: account.username });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }

    const update = {
      buchtitel: (body.buchtitel ?? "").slice(0, 200),
      untertitel: (body.untertitel ?? "").slice(0, 300),
      autorName: (body.autorName ?? "").slice(0, 200),
      geschlecht: body.geschlecht === "Autor" ? "Autor" : "Autorin",
      erscheinungsjahr: (body.erscheinungsjahr ?? "").slice(0, 10),
      genre: (body.genre ?? "").slice(0, 100),
      verlag: (body.verlag ?? "").slice(0, 200),
      coverDesign: (body.coverDesign ?? "").slice(0, 200),
      hintergrund: (body.hintergrund ?? "").slice(0, 500),
      hauptfigur: (body.hauptfigur ?? "").slice(0, 300),
      thema: (body.thema ?? "").slice(0, 200),
      inhalte: (body.inhalte ?? "").slice(0, 500),
      schwerpunkt: (body.schwerpunkt ?? "").slice(0, 300),
      autorTitel: (body.autorTitel ?? "").slice(0, 200),
      autorHerkunft: (body.autorHerkunft ?? "").slice(0, 200),
      autorBeruf: (body.autorBeruf ?? "").slice(0, 300),
      autorStil: (body.autorStil ?? "").slice(0, 300),
      zusammenfassung: Array.isArray(body.zusammenfassung)
        ? body.zusammenfassung.slice(0, 8).map((s: unknown) => String(s ?? "").slice(0, 300))
        : existing.zusammenfassung,
      notes1: (body.notes1 ?? "").slice(0, 2000),
      notes2: (body.notes2 ?? "").slice(0, 2000),
      notes3: (body.notes3 ?? "").slice(0, 2000),
      notes4: (body.notes4 ?? "").slice(0, 2000),
      notes5: (body.notes5 ?? "").slice(0, 2000),
      notiz: (body.notiz ?? "").slice(0, 2000),
      coverImg: typeof body.coverImg === "string" && (body.coverImg.startsWith("data:") || body.coverImg.startsWith("/api/profile/image")) ? body.coverImg : (body.coverImg === null ? undefined : existing.coverImg),
      autorImg: typeof body.autorImg === "string" && (body.autorImg.startsWith("data:") || body.autorImg.startsWith("/api/profile/image")) ? body.autorImg : (body.autorImg === null ? undefined : existing.autorImg),
      updatedAt: new Date(),
    };

    await col.updateOne({ _id: toObjectId(id) }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** DELETE — Vorlage löschen */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: "Ungültige ID" }, { status: 400 });
    }

    const col = await getBucharenaVorlagenCollection();
    const result = await col.deleteOne({ _id: toObjectId(id), username: account.username });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Vorlage nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
