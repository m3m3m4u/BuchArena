import { NextResponse } from "next/server";
import { getGewinnspielteilnahmenCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

type Params = { params: Promise<{ id: string }> };

// GET /api/gewinnspiele/[id]/teilnehmer – Admin/Autor lädt die Teilnehmerliste
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const { getGewinnspieleCollection } = await import("@/lib/mongodb");
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

  const teilnahmeCol = await getGewinnspielteilnahmenCollection();
  const teilnehmer = await teilnahmeCol
    .find({ gewinnspielId: id })
    .sort({ angemeldetAt: 1 })
    .toArray();

  return NextResponse.json(
    teilnehmer.map((t) => ({
      username: t.username,
      displayName: t.displayName,
      angemeldetAt: t.angemeldetAt,
      // Adresse nur für Admin und Autor nach Ziehung
      adresse: isAdmin || (isAutor && doc.status !== "anmeldung")
        ? [t.adresse, t.ort, t.land].filter(Boolean).join(", ")
        : undefined,
    }))
  );
}
