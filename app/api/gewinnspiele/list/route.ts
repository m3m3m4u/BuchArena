import { NextResponse } from "next/server";
import { getGewinnspieleCollection, getBooksCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import type { CreateGewinnspielPayload } from "@/lib/gewinnspiel";

// Normalisiert ein Feld das ggf. als ProfileField {value,visibility} gespeichert wurde
function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as object)) return String((v as Record<string, unknown>).value);
  return fallback;
}

// GET /api/gewinnspiele/list – öffentliche Liste aktiver + archivierter Gewinnspiele
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status"); // "aktiv" | "archiv" | "vorschlag" | alle

  const col = await getGewinnspieleCollection();

  const filter: Record<string, unknown> = {};
  if (statusFilter === "aktiv") {
    filter.status = { $in: ["anmeldung", "verlost", "versendet"] };
  } else if (statusFilter === "archiv") {
    filter.status = "archiv";
  } else if (statusFilter === "vorschlag") {
    filter.status = "vorschlag";
  }

  const docs = await col
    .find(filter, {
      projection: {
        buchTitel: 1, buchId: 1, autorUsername: 1, autorName: 1, coverImageUrl: 1,
        format: 1, beschreibung: 1, anmeldungVon: 1, anmeldungBis: 1, ziehungAm: 1,
        status: 1, gewinnerName: 1, verlostAm: 1, createdAt: 1,
      },
    })
    .sort({ createdAt: -1 })
    .toArray();

  // Normalize stored fields that may be ProfileField objects in older documents
  const normalized = docs.map((d) => ({
    ...d,
    _id: d._id?.toString(),
    autorName: str(d.autorName, d.autorUsername ?? ""),
    gewinnerName: d.gewinnerName ? str(d.gewinnerName) : undefined,
  }));

  return NextResponse.json(normalized);
}

// POST /api/gewinnspiele/list – Autor reicht ein Buch als Vorschlag ein
export async function POST(req: Request) {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const body = (await req.json()) as CreateGewinnspielPayload;

  if (!body.buchId || !body.format) {
    return NextResponse.json({ message: "Fehlende Pflichtfelder." }, { status: 400 });
  }

  // Buch gehört dem Autor?
  const booksCol = await getBooksCollection();
  const { ObjectId } = await import("mongodb");
  let buchOid;
  try { buchOid = new ObjectId(body.buchId); } catch {
    return NextResponse.json({ message: "Ungültige Buch-ID." }, { status: 400 });
  }

  const buch = await booksCol.findOne({ _id: buchOid, ownerUsername: account.username });
  if (!buch) return NextResponse.json({ message: "Buch nicht gefunden oder nicht berechtigt." }, { status: 403 });

  // Autor-Displayname ermitteln
  const usersCol = await getUsersCollection();
  const user = await usersCol.findOne({ username: account.username }, { projection: { displayName: 1, profile: 1 } });
  const autorName = user?.displayName ?? user?.profile?.name?.value ?? account.username;

  const col = await getGewinnspieleCollection();
  const now = new Date();

  // Zeitraum optionaler Direktstart (nur anmeldungVon + anmeldungBis reichen)
  const hasDates = body.anmeldungVon && body.anmeldungBis;
  const insertDoc: Record<string, unknown> = {
    buchTitel: buch.title,
    buchId: body.buchId,
    autorUsername: account.username,
    autorName,
    coverImageUrl: buch.coverImageUrl ?? "",
    format: body.format,
    beschreibung: body.beschreibung?.trim() ?? undefined,
    status: hasDates ? "anmeldung" : "vorschlag",
    createdAt: now,
    updatedAt: now,
  };
  if (hasDates) {
    insertDoc.anmeldungVon = new Date(body.anmeldungVon!);
    insertDoc.anmeldungBis = new Date(body.anmeldungBis!);
    if (body.ziehungAm) insertDoc.ziehungAm = new Date(body.ziehungAm);
  }
  const result = await col.insertOne(insertDoc as Parameters<typeof col.insertOne>[0]);

  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}
