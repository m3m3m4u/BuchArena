import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { davDelete } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { id } = await params;
    const col = await getBucharenaSubmissionsCollection();
    const submission = await col.findOne({ _id: new ObjectId(id) });
    if (!submission) return NextResponse.json({ success: false, error: "Einreichung nicht gefunden" }, { status: 404 });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { status, reviewNotes, bookTitle, author, genre, ageRange, notes } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      updateData.status = status;
      updateData.reviewedBy = admin.username;
      updateData.reviewedAt = new Date();
    }
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
    if (bookTitle) updateData.bookTitle = bookTitle.trim();
    if (author) updateData.author = author.trim();
    if (genre !== undefined) updateData.genre = genre.trim();
    if (ageRange !== undefined) updateData.ageRange = ageRange.trim();
    if (notes !== undefined) updateData.notes = notes.trim();

    const col = await getBucharenaSubmissionsCollection();
    const result = await col.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updateData }, { returnDocument: "after" });
    if (!result) return NextResponse.json({ success: false, error: "Einreichung nicht gefunden" }, { status: 404 });

    return NextResponse.json({ success: true, submission: result });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Keine Berechtigung" }, { status: 403 });

    const { id } = await params;
    const col = await getBucharenaSubmissionsCollection();
    const submission = await col.findOne({ _id: new ObjectId(id) });
    if (!submission) return NextResponse.json({ success: false, error: "Einreichung nicht gefunden" }, { status: 404 });

    try { await davDelete(submission.filePath); } catch (err) { console.error("Fehler beim Löschen der Datei:", err); }
    await col.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, message: "Einreichung gelöscht" });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
