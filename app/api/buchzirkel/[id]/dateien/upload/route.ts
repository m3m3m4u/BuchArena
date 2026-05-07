import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import {
  getBuchzirkelCollection,
} from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { davPut } from "@/lib/bucharena-webdav";

export const maxDuration = 300; // 5 Minuten für große Datei-Uploads

const BUCHZIRKEL_DIR = "buchzirkel";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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

    // Dateiname und abschnittId kommen als Query-Parameter
    const url = new URL(request.url);
    const fileName = url.searchParams.get("fileName") ?? "";
    const abschnittId = url.searchParams.get("abschnittId") ?? undefined;

    if (!fileName) {
      return NextResponse.json({ message: "Kein Dateiname angegeben." }, { status: 400 });
    }

    const lowerName = fileName.toLowerCase();
    const isEpub = lowerName.endsWith(".epub");
    const isPdf = lowerName.endsWith(".pdf");
    if (!isEpub && !isPdf) {
      return NextResponse.json({ message: "Nur PDF- und EPUB-Dateien sind erlaubt." }, { status: 400 });
    }

    // Datei direkt als Binary-Body lesen (kein Multipart-Parsing)
    let arrayBuf: ArrayBuffer;
    try {
      arrayBuf = await request.arrayBuffer();
    } catch (bufErr) {
      console.error("buchzirkel/upload: arrayBuffer() fehlgeschlagen:", bufErr);
      return NextResponse.json({ message: "Datei konnte nicht gelesen werden – möglicherweise zu groß oder Verbindungsabbruch." }, { status: 400 });
    }
    if (arrayBuf.byteLength === 0) {
      return NextResponse.json({ message: "Keine Datei übermittelt." }, { status: 400 });
    }
    if (arrayBuf.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ message: `Datei darf maximal 50 MB groß sein (empfangen: ${Math.round(arrayBuf.byteLength / 1024 / 1024 * 10) / 10} MB).` }, { status: 400 });
    }
    console.log(`buchzirkel/upload: Datei empfangen – ${fileName}, ${Math.round(arrayBuf.byteLength / 1024)} KB`);

    const fileId = randomUUID();
    const ext = isEpub ? ".epub" : ".pdf";
    const contentType = isEpub ? "application/epub+zip" : "application/pdf";
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const masterPath = `${BUCHZIRKEL_DIR}/${id}/master/${fileId}${ext}`;

    let davResult: { url: string; key: string } | null;
    try {
      davResult = await davPut(masterPath, new Uint8Array(arrayBuf), contentType);
    } catch (davErr) {
      console.error("buchzirkel/upload: davPut fehlgeschlagen:", davErr);
      return NextResponse.json({ message: "Datei konnte nicht auf den Speicher hochgeladen werden. Bitte versuche es erneut." }, { status: 500 });
    }
    console.log(`buchzirkel/upload: WebDAV-Upload OK – ${masterPath}`);

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
