import { NextResponse } from "next/server";
import { getGewinnspieleCollection, getGewinnspielteilnahmenCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";
import type { TeilnahmePayload } from "@/lib/gewinnspiel";

type Params = { params: Promise<{ id: string }> };

// POST /api/gewinnspiele/[id]/teilnehmen – Leser nimmt an Gewinnspiel teil
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  // Testleser-Profil prüfen
  const usersCol = await getUsersCollection();
  const user = await usersCol.findOne(
    { username: account.username },
    { projection: { testleserProfile: 1, email: 1, displayName: 1 } }
  );
  if (!user?.testleserProfile) {
    return NextResponse.json(
      { message: "Für die Teilnahme benötigst du ein Testleser-Profil.", needsProfile: true },
      { status: 403 }
    );
  }

  let oid;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getGewinnspieleCollection();
  const doc = await col.findOne({ _id: oid });
  if (!doc) return NextResponse.json({ message: "Gewinnspiel nicht gefunden." }, { status: 404 });

  const now = new Date();
  if (doc.status !== "anmeldung") {
    return NextResponse.json({ message: "Die Anmeldephase ist nicht aktiv." }, { status: 400 });
  }
  if (now < new Date(doc.anmeldungVon as string)) {
    return NextResponse.json({ message: "Die Anmeldephase hat noch nicht begonnen." }, { status: 400 });
  }
  if (now > new Date(doc.anmeldungBis as string)) {
    return NextResponse.json({ message: "Die Anmeldephase ist abgelaufen." }, { status: 400 });
  }

  const body = (await req.json()) as TeilnahmePayload;

  // Bei Print-Gewinnspiel: Adresse erforderlich
  if ((doc.format === "print" || doc.format === "both") && !body.adresse?.trim()) {
    return NextResponse.json({ message: "Bitte gib eine Versandadresse an." }, { status: 400 });
  }

  const teilnahmeCol = await getGewinnspielteilnahmenCollection();

  try {
    await teilnahmeCol.insertOne({
      gewinnspielId: id,
      username: account.username,
      displayName: user.displayName ?? account.username,
      email: user.email,
      adresse: body.adresse?.trim(),
      ort: body.ort?.trim(),
      land: body.land?.trim(),
      angemeldetAt: now,
    });
  } catch (err: unknown) {
    // Duplicate key = bereits angemeldet
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "Du nimmst bereits teil." }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/gewinnspiele/[id]/teilnehmen – Leser zieht Teilnahme zurück
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const teilnahmeCol = await getGewinnspielteilnahmenCollection();
  const res = await teilnahmeCol.deleteOne({ gewinnspielId: id, username: account.username });
  if (res.deletedCount === 0) return NextResponse.json({ message: "Keine Teilnahme gefunden." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
