import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSnippetsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { davDelete } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const col = await getBucharenaSnippetsCollection();
    const snippets = await col.find().sort({ createdAt: -1 }).toArray();

    const formatted = snippets.map((s) => ({
      id: s._id.toHexString(),
      bookTitle: s.bookTitle,
      text: s.text,
      audioFileName: s.audioFileName,
      audioFilePath: s.audioFilePath,
      audioFileSize: s.audioFileSize,
      authorEmail: s.authorEmail,
      authorName: s.authorName,
      status: s.status,
      processedBy: s.processedBy,
      processedAt: s.processedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({ success: true, snippets: formatted, count: formatted.length });
  } catch (error) {
    console.error("Fehler beim Laden der Schnipsel:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const body = await request.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ success: false, error: "ID ist erforderlich" }, { status: 400 });
    if (status && !["pending", "processed"].includes(status)) return NextResponse.json({ success: false, error: "Ungültiger Status" }, { status: 400 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) {
      updateData.status = status;
      if (status === "processed") { updateData.processedBy = admin.email; updateData.processedAt = new Date(); }
    }

    const col = await getBucharenaSnippetsCollection();
    const result = await col.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updateData }, { returnDocument: "after" });
    if (!result) return NextResponse.json({ success: false, error: "Schnipsel nicht gefunden" }, { status: 404 });

    return NextResponse.json({
      success: true,
      snippet: { id: result._id.toHexString(), bookTitle: result.bookTitle, text: result.text, status: result.status, processedBy: result.processedBy, processedAt: result.processedAt },
    });
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID ist erforderlich" }, { status: 400 });

    const col = await getBucharenaSnippetsCollection();
    const snippet = await col.findOne({ _id: new ObjectId(id) });
    if (!snippet) return NextResponse.json({ success: false, error: "Schnipsel nicht gefunden" }, { status: 404 });

    if (snippet.audioFilePath) {
      try { await davDelete(snippet.audioFilePath); } catch (e) { console.error("Fehler beim Löschen der Audio-Datei:", e); }
    }

    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, message: "Schnipsel erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
