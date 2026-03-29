import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

export type BuchDerWoche = {
  title: string;
  author: string;
  youtubeUrl: string;
  buyUrl: string;
  active: boolean;
  updatedAt: string;
};

/** GET – Buch der Woche laden (öffentlich) */
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const doc = await db.collection("settings").findOne({ key: "buchDerWoche" });
    if (!doc?.value) {
      return NextResponse.json({ buchDerWoche: null });
    }
    const bdw = doc.value as BuchDerWoche;
    // Admin-Modus: ?admin=1 gibt auch deaktivierte zurück
    const isAdmin = request.nextUrl.searchParams.get("admin") === "1";
    if (!isAdmin && bdw.active === false) {
      return NextResponse.json({ buchDerWoche: null });
    }
    return NextResponse.json({ buchDerWoche: bdw });
  } catch {
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

/** POST – Buch der Woche speichern (nur Admin) */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, author, youtubeUrl, buyUrl, active } = body as Partial<BuchDerWoche>;

    if (!title || !author) {
      return NextResponse.json({ error: "Titel und Autor sind Pflichtfelder" }, { status: 400 });
    }

    const value: BuchDerWoche = {
      title: title.trim().slice(0, 200),
      author: author.trim().slice(0, 200),
      youtubeUrl: (youtubeUrl ?? "").trim().slice(0, 500),
      buyUrl: (buyUrl ?? "").trim().slice(0, 500),
      active: active ?? true,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    await db.collection("settings").updateOne(
      { key: "buchDerWoche" },
      { $set: { key: "buchDerWoche", value } },
      { upsert: true },
    );

    return NextResponse.json({ ok: true, buchDerWoche: value });
  } catch {
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
