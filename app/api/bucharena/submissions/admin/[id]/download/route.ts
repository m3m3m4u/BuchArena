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

    const fileBuffer = await davGet(submission.filePath);
    if (!fileBuffer) return NextResponse.json({ success: false, error: "Datei nicht gefunden" }, { status: 404 });

    const contentType = submission.fileName.endsWith(".pptx")
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/vnd.ms-powerpoint";

    return new NextResponse(Buffer.from(fileBuffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(submission.fileName)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Fehler beim Download:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
