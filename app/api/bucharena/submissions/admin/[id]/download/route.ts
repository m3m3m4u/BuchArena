import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { davGet } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { id } = await params;
    const col = await getBucharenaSubmissionsCollection();
    const submission = await col.findOne({ _id: new ObjectId(id) });
    if (!submission) return NextResponse.json({ success: false, error: "Einreichung nicht gefunden" }, { status: 404 });

    // Support downloading a specific file by index (?file=0, ?file=1)
    const { searchParams } = new URL(request.url);
    const fileIdx = searchParams.get("file");

    let filePath: string;
    let fileName: string;

    if (fileIdx !== null && submission.files && submission.files.length > 0) {
      const idx = parseInt(fileIdx, 10);
      if (isNaN(idx) || idx < 0 || idx >= submission.files.length) {
        return NextResponse.json({ success: false, error: "Ungültiger Datei-Index" }, { status: 400 });
      }
      filePath = submission.files[idx].filePath;
      fileName = submission.files[idx].fileName;
    } else {
      filePath = submission.filePath;
      fileName = submission.fileName;
    }

    const fileBuffer = await davGet(filePath);
    if (!fileBuffer) return NextResponse.json({ success: false, error: "Datei nicht gefunden" }, { status: 404 });

    const contentType = fileName.endsWith(".pptx")
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/vnd.ms-powerpoint";

    return new NextResponse(Buffer.from(fileBuffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Fehler beim Download:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
