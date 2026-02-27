import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaSubmissionsCollection } from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";
import { davDelete } from "@/lib/bucharena-webdav";

export const runtime = "nodejs";

/**
 * PUT /api/bucharena/submissions/my/[id]
 * Allows the owner to edit their own submission (only pending ones).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json(
        { success: false, error: "Nicht eingeloggt" },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Ungültige ID" },
        { status: 400 },
      );
    }

    const col = await getBucharenaSubmissionsCollection();
    const submission = await col.findOne({ _id: new ObjectId(id) });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Einreichung nicht gefunden" },
        { status: 404 },
      );
    }

    if (submission.submittedBy !== account.username) {
      return NextResponse.json(
        { success: false, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nur ausstehende Einreichungen können bearbeitet werden",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { bookTitle, author, genre, ageRange, notes, email, instagram } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (bookTitle) updateData.bookTitle = bookTitle.trim();
    if (author) updateData.author = author.trim();
    if (genre) updateData.genre = genre.trim();
    if (ageRange) updateData.ageRange = ageRange.trim();
    if (notes !== undefined) updateData.notes = notes.trim();
    if (email) updateData.contact = email.trim();
    if (instagram !== undefined) updateData.instagram = instagram.trim();

    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Einreichung nicht gefunden" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, submission: result });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/bucharena/submissions/my/[id]
 * Allows the owner to delete their own submission.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json(
        { success: false, error: "Nicht eingeloggt" },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Ungültige ID" },
        { status: 400 },
      );
    }

    const col = await getBucharenaSubmissionsCollection();
    const submission = await col.findOne({ _id: new ObjectId(id) });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Einreichung nicht gefunden" },
        { status: 404 },
      );
    }

    if (submission.submittedBy !== account.username) {
      return NextResponse.json(
        { success: false, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    // Delete file from WebDAV
    try {
      await davDelete(submission.filePath);
    } catch (err) {
      console.error("Fehler beim Löschen der Datei:", err);
    }

    await col.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: "Einreichung gelöscht",
    });
  } catch (error) {
    console.error("Fehler:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
