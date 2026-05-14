import { NextResponse } from "next/server";
import { getGewinnspieleCollection, getGewinnspielteilnahmenCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

type Params = { params: Promise<{ id: string }> };

// GET /api/gewinnspiele/[id] – Detail eines Gewinnspiels
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();

  let oid;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getGewinnspieleCollection();
  const doc = await col.findOne({ _id: oid });
  if (!doc) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });

  const isAdmin = account?.role === "ADMIN" || account?.role === "SUPERADMIN";
  const isAutor = account?.username === doc.autorUsername;
  const sensitiveVisible = isAdmin || isAutor;

  // Teilnehmerzahl laden
  const teilnahmeCol = await getGewinnspielteilnahmenCollection();
  const teilnehmerAnzahl = await teilnahmeCol.countDocuments({ gewinnspielId: id });

  // Hat eingeloggter User teilgenommen?
  let hatTeilgenommen = false;
  if (account) {
    const t = await teilnahmeCol.findOne({ gewinnspielId: id, username: account.username });
    hatTeilgenommen = !!t;
  }

  const response = {
    ...doc,
    _id: doc._id?.toString(),
    // Normalize fields that may be ProfileField objects in older documents
    autorName: typeof doc.autorName === "string" ? doc.autorName
      : (doc.autorName && typeof doc.autorName === "object" && "value" in (doc.autorName as object))
        ? String((doc.autorName as Record<string, unknown>).value)
        : doc.autorUsername,
    teilnehmerAnzahl,
    hatTeilgenommen,
    gewinnerEmail: sensitiveVisible ? doc.gewinnerEmail : undefined,
    gewinnerAdresse: sensitiveVisible ? doc.gewinnerAdresse : undefined,
  };

  return NextResponse.json(response);
}

// PATCH /api/gewinnspiele/[id] – Admin/Autor aktualisiert Status oder Daten
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  let oid;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getGewinnspieleCollection();
  const doc = await col.findOne({ _id: oid });
  if (!doc) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });

  const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";
  const isAutor = account.username === doc.autorUsername;
  if (!isAdmin && !isAutor) return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = { updatedAt: new Date() };

  // Admin und Autor dürfen Zeiträume setzen (Autor nur für eigenes Gewinnspiel im Vorschlag-Status)
  if (isAdmin || (isAutor && doc.status === "vorschlag")) {
    if (body.anmeldungVon) allowed.anmeldungVon = new Date(body.anmeldungVon as string);
    if (body.anmeldungBis) allowed.anmeldungBis = new Date(body.anmeldungBis as string);
    if (body.ziehungAm) allowed.ziehungAm = new Date(body.ziehungAm as string);
  }
  // Vorschlag → anmeldung: Admin oder Autor (anmeldungVon + anmeldungBis genügen)
  if (body.status === "anmeldung" && doc.status === "vorschlag" && (isAdmin || isAutor)) {
    const vonVal = body.anmeldungVon ?? doc.anmeldungVon;
    const bisVal = body.anmeldungBis ?? doc.anmeldungBis;
    if (!vonVal || !bisVal) {
      return NextResponse.json({ message: "Zum Aktivieren müssen Anmeldungs-Von und -Bis gesetzt sein." }, { status: 400 });
    }
    allowed.status = "anmeldung";
  } else if (body.status && body.status !== "anmeldung" && isAdmin) {
    allowed.status = body.status;
  }
  // Autor darf Beschreibung ändern (solange noch Vorschlag)
  if (body.beschreibung !== undefined && (isAutor || isAdmin)) {
    allowed.beschreibung = (body.beschreibung as string).trim();
  }
  // Autor markiert als versendet
  if (body.status === "versendet" && isAutor && doc.status === "verlost") {
    allowed.status = "versendet";
    allowed.versendetAm = new Date();
  }

  await col.updateOne({ _id: oid }, { $set: allowed });
  return NextResponse.json({ ok: true });
}

// DELETE /api/gewinnspiele/[id] – Admin löscht ein Gewinnspiel
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const isAdmin = account.role === "ADMIN" || account.role === "SUPERADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });

  let oid;
  try { oid = new ObjectId(id); } catch {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getGewinnspieleCollection();
  const res = await col.deleteOne({ _id: oid });
  if (res.deletedCount === 0) return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });

  // Teilnahmen auch löschen
  const teilnahmeCol = await getGewinnspielteilnahmenCollection();
  await teilnahmeCol.deleteMany({ gewinnspielId: id });

  return NextResponse.json({ ok: true });
}
