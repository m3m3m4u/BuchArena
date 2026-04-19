import { NextResponse } from "next/server";
import { getBucharenaVorlagenCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

/** GET — eigene Vorlagen auflisten */
export async function GET(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json({ success: false, error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "vorlage" | "shorts" | null

    const col = await getBucharenaVorlagenCollection();
    const filter: Record<string, unknown> = { username: account.username };
    if (type === "shorts") {
      filter.type = "shorts";
    } else if (type === "vorlage") {
      filter.$or = [{ type: "vorlage" }, { type: { $exists: false } }];
    }
    const docs = await col
      .find(filter)
      .sort({ updatedAt: -1 })
      .project({ coverImg: 0 })
      .toArray();

    return NextResponse.json({ success: true, vorlagen: docs });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** POST — neue Vorlage anlegen */
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

    // Limit per user
    const col = await getBucharenaVorlagenCollection();
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
      schwerpunkt: (body.schwerpunkt ?? "").slice(0, 300),
      autorTitel: (body.autorTitel ?? "").slice(0, 200),
      autorHerkunft: (body.autorHerkunft ?? "").slice(0, 200),
      autorBeruf: (body.autorBeruf ?? "").slice(0, 300),
      autorStil: (body.autorStil ?? "").slice(0, 300),
      zusammenfassung: Array.isArray(body.zusammenfassung)
        ? body.zusammenfassung.slice(0, 8).map((s: unknown) => String(s ?? "").slice(0, 300))
        : ["", "", "", ""],
      notes1: (body.notes1 ?? "").slice(0, 2000),
      notes2: (body.notes2 ?? "").slice(0, 2000),
      notes3: (body.notes3 ?? "").slice(0, 2000),
      notes4: (body.notes4 ?? "").slice(0, 2000),
      notes5: (body.notes5 ?? "").slice(0, 2000),
      notiz: (body.notiz ?? "").slice(0, 2000),
      type: typeof body.type === "string" ? body.type.slice(0, 20) : "vorlage",
      coverImg: typeof body.coverImg === "string" && (body.coverImg.startsWith("data:") || body.coverImg.startsWith("/api/profile/image")) ? body.coverImg : undefined,
      autorImg: typeof body.autorImg === "string" && (body.autorImg.startsWith("data:") || body.autorImg.startsWith("/api/profile/image")) ? body.autorImg : undefined,
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
