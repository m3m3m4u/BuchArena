import { NextResponse } from "next/server";
import {
  getBucharenaSubmissionsCollection,
  getBucharenaVorlagenCollection,
  toObjectId,
} from "@/lib/bucharena-db";
import { getServerAccount } from "@/lib/server-auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

/**
 * DELETE /api/bucharena/submissions/[id]
 * Zieht eine eigene Einreichung zurück (Status → "withdrawn")
 * und entfernt die submissionId aus der verknüpften Vorlage.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account?.username) {
      return NextResponse.json(
        { success: false, error: "Nicht eingeloggt" },
        { status: 401 },
      );
    }
    if (!ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id) {
      return NextResponse.json(
        { success: false, error: "Ungültige ID" },
        { status: 400 },
      );
    }

    const subCol = await getBucharenaSubmissionsCollection();
    const submission = await subCol.findOne({ _id: toObjectId(id) });
    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Einreichung nicht gefunden" },
        { status: 404 },
      );
    }
    // Darf nur der eigene User zurückziehen
    if (submission.submittedBy !== account.username) {
      return NextResponse.json(
        { success: false, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }
    if (submission.status === "withdrawn") {
      return NextResponse.json(
        { success: false, error: "Bereits zurückgezogen" },
        { status: 400 },
      );
    }

    const now = new Date();

    // Submission auf "withdrawn" setzen
    await subCol.updateOne(
      { _id: toObjectId(id) },
      { $set: { status: "withdrawn", updatedAt: now } },
    );

    // submissionId aus verknüpfter Vorlage entfernen (falls vorhanden)
    const vorlagenCol = await getBucharenaVorlagenCollection();
    await vorlagenCol.updateOne(
      { submissionId: id, username: account.username },
      { $unset: { submissionId: "" }, $set: { updatedAt: now } },
    );

    return NextResponse.json({ success: true, message: "Einreichung zurückgezogen" });
  } catch (error) {
    console.error("Fehler beim Zurückziehen:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
