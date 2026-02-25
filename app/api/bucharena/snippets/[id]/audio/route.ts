import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSnippetsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { davGet } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { id } = await params;
    const col = await getBucharenaSnippetsCollection();
    const snippet = await col.findOne({ _id: new ObjectId(id) });
    if (!snippet) return NextResponse.json({ success: false, error: "Schnipsel nicht gefunden" }, { status: 404 });
    if (!snippet.audioFilePath || !snippet.audioFileName) return NextResponse.json({ success: false, error: "Keine Audio-Datei vorhanden" }, { status: 404 });

    const audioData = await davGet(snippet.audioFilePath);
    if (!audioData) return NextResponse.json({ success: false, error: "Audio-Datei konnte nicht geladen werden" }, { status: 500 });

    return new NextResponse(Buffer.from(audioData) as unknown as BodyInit, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${snippet.audioFileName}"`,
        "Content-Length": audioData.length.toString(),
      },
    });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
