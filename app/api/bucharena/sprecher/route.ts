import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSprecherCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { davPut, davDelete } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

const MAX_PDF_SIZE = 20 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (status && ["offen", "gebucht", "erledigt"].includes(status)) {
      filter.status = status;
    }

    const col = await getBucharenaSprecherCollection();
    const texte = await col.find(filter).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ success: true, texte });
  } catch (error) {
    console.error("Fehler beim Laden der Sprecher-Texte:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Nur Administratoren können Texte hochladen" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ success: false, error: "PDF ist erforderlich" }, { status: 400 });

    const title = file.name.replace(/\.pdf$/i, "").trim();
    if (!file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ success: false, error: "Nur PDF-Dateien sind erlaubt" }, { status: 400 });
    if (file.size > MAX_PDF_SIZE) return NextResponse.json({ success: false, error: "PDF darf maximal 20MB groß sein" }, { status: 400 });

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, "_");
    const pdfPath = `bucharena-sprecher/pdf/${timestamp}_${sanitizedName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await davPut(pdfPath, bytes, "application/pdf");
    if (!result) return NextResponse.json({ success: false, error: "Fehler beim Speichern der Datei" }, { status: 500 });

    const col = await getBucharenaSprecherCollection();
    const now = new Date();
    const doc = {
      pdfFileName: file.name,
      pdfPath,
      pdfUrl: result.url,
      title,
      status: "offen" as const,
      createdBy: admin.username,
      mp3Files: [],
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await col.insertOne(doc);

    return NextResponse.json({
      success: true,
      message: "PDF erfolgreich hochgeladen",
      text: { ...doc, _id: insertResult.insertedId },
    });
  } catch (error) {
    console.error("Fehler beim PDF-Upload:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Hochladen" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Nur Administratoren können Texte löschen" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID erforderlich" }, { status: 400 });

    const col = await getBucharenaSprecherCollection();
    const text = await col.findOne({ _id: new ObjectId(id) });
    if (!text) return NextResponse.json({ success: false, error: "Text nicht gefunden" }, { status: 404 });

    try {
      await davDelete(text.pdfPath);
      for (const mp3 of text.mp3Files) { await davDelete(mp3.path); }
    } catch (e) { console.warn("Fehler beim Löschen der Dateien:", e); }

    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, message: "Text gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Löschen" }, { status: 500 });
  }
}
