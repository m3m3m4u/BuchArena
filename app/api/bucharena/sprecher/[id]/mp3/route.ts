import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSprecherCollection } from "@/lib/bucharena-db";
import { davPut, davDelete } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

const MAX_MP3_SIZE = 50 * 1024 * 1024;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploaderName = formData.get("uploaderName") as string;

    if (!file) return NextResponse.json({ success: false, error: "MP3-Datei ist erforderlich" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".mp3")) return NextResponse.json({ success: false, error: "Nur MP3-Dateien sind erlaubt" }, { status: 400 });
    if (file.size > MAX_MP3_SIZE) return NextResponse.json({ success: false, error: "MP3 darf maximal 50MB groß sein" }, { status: 400 });

    const col = await getBucharenaSprecherCollection();
    const text = await col.findOne({ _id: new ObjectId(id) });
    if (!text) return NextResponse.json({ success: false, error: "Text nicht gefunden" }, { status: 404 });

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, "_");
    const mp3Path = `bucharena-sprecher/mp3/${id}/${timestamp}_${sanitizedName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await davPut(mp3Path, bytes, "audio/mpeg");
    if (!result) return NextResponse.json({ success: false, error: "Fehler beim Speichern der Datei" }, { status: 500 });

    const newMp3 = {
      fileName: file.name,
      path: mp3Path,
      url: result.url,
      uploadedAt: new Date(),
      uploadedBy: uploaderName || undefined,
    };

    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
    if (text.status === "offen") updateDoc.status = "gebucht";

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $push: { mp3Files: newMp3 } as Record<string, unknown>, $set: updateDoc }
    );

    const updated = await col.findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, message: "MP3 erfolgreich hochgeladen", text: updated });
  } catch (error) {
    console.error("Fehler beim MP3-Upload:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Hochladen" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const mp3IndexStr = searchParams.get("mp3Index");
    if (mp3IndexStr === null) return NextResponse.json({ success: false, error: "mp3Index erforderlich" }, { status: 400 });

    const mp3Index = parseInt(mp3IndexStr);

    const col = await getBucharenaSprecherCollection();
    const text = await col.findOne({ _id: new ObjectId(id) });
    if (!text) return NextResponse.json({ success: false, error: "Text nicht gefunden" }, { status: 404 });
    if (mp3Index < 0 || mp3Index >= text.mp3Files.length) return NextResponse.json({ success: false, error: "MP3 nicht gefunden" }, { status: 404 });

    const mp3 = text.mp3Files[mp3Index];
    try { await davDelete(mp3.path); } catch (e) { console.warn("Fehler beim Löschen der MP3:", e); }

    const newMp3Files = [...text.mp3Files];
    newMp3Files.splice(mp3Index, 1);

    await col.updateOne({ _id: new ObjectId(id) }, { $set: { mp3Files: newMp3Files, updatedAt: new Date() } });

    const updated = await col.findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, message: "MP3 gelöscht", text: updated });
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    return NextResponse.json({ success: false, error: "Fehler beim Löschen" }, { status: 500 });
  }
}
