import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import {
  getBuchzirkelCollection,
  getBuchzirkelTeilnahmenCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { davPut } from "@/lib/bucharena-webdav";

const BUCHZIRKEL_DIR = "buchzirkel";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ["application/pdf", "application/epub+zip"];

export async function POST(
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
    const zirkel = await zirkelCol.findOne({ _id: new ObjectId(id) });

    if (!zirkel) {
      return NextResponse.json({ message: "Buchzirkel nicht gefunden." }, { status: 404 });
    }
    if (zirkel.veranstalterUsername !== account.username && account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Nur der Veranstalter darf Dateien hochladen." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const abschnittId = (formData.get("abschnittId") as string | null)?.trim() || undefined;

    if (!file) {
      return NextResponse.json({ message: "Keine Datei übermittelt." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ message: "Nur PDF- und EPUB-Dateien sind erlaubt." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Datei darf maximal 50 MB groß sein." }, { status: 400 });
    }

    const fileId = randomUUID();
    const ext = file.name.endsWith(".epub") ? ".epub" : ".pdf";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const masterPath = `${BUCHZIRKEL_DIR}/${id}/master/${fileId}${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    await davPut(masterPath, bytes, file.type);

    // Teilnehmer-spezifische Wasserzeichen-Pfade anlegen
    // Die Datei wird beim ersten Zugriff dynamisch mit Wasserzeichen gerendert
    // Hier nur den Master speichern – der /api/buchzirkel/[id]/datei/[dateiId]/[username] Endpunkt
    // liefert die Wasserzeichen-Version on-demand

    const dateiEntry = {
      id: fileId,
      abschnittId,
      originalName: safeName,
      webdavPath: masterPath,
      uploadedAt: new Date(),
      uploadedBy: account.username,
    };

    await zirkelCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { dateien: dateiEntry },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({ ok: true, datei: dateiEntry });
  } catch (err) {
    console.error("buchzirkel/[id]/dateien/upload:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
