import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsletterDraftsCollection } from "@/lib/newsletter";

function requireAdmin() {
  return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
}

/** GET /api/newsletter/drafts – alle Entwürfe auflisten */
export async function GET() {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return requireAdmin();
  }

  const col = await getNewsletterDraftsCollection();
  const drafts = await col
    .find({}, { projection: { htmlContent: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();

  return NextResponse.json({
    drafts: drafts.map((d) => ({
      _id: d._id!.toString(),
      subject: d.subject,
      savedBy: d.savedBy,
      note: d.note ?? "",
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });
}

/** POST /api/newsletter/drafts – neuen Entwurf anlegen oder bestehenden updaten */
export async function POST(request: Request) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return requireAdmin();
  }

  const body = (await request.json()) as {
    id?: string;
    subject?: string;
    htmlContent?: string;
    note?: string;
  };

  const subject = body.subject?.trim() ?? "";
  const htmlContent = body.htmlContent?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!subject && !htmlContent) {
    return NextResponse.json({ message: "Betreff oder Inhalt erforderlich." }, { status: 400 });
  }

  const col = await getNewsletterDraftsCollection();
  const now = new Date();

  if (body.id && ObjectId.isValid(body.id)) {
    // Update bestehender Entwurf
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(body.id) },
      {
        $set: {
          subject,
          htmlContent,
          note,
          savedBy: account.username,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) {
      return NextResponse.json({ message: "Entwurf nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ message: "Entwurf gespeichert.", id: result._id!.toString() });
  }

  // Neuen Entwurf anlegen
  const insertResult = await col.insertOne({
    subject,
    htmlContent,
    note,
    savedBy: account.username,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ message: "Entwurf gespeichert.", id: insertResult.insertedId.toString() }, { status: 201 });
}

/** DELETE /api/newsletter/drafts?id=… – Entwurf löschen */
export async function DELETE(request: Request) {
  const account = await getServerAccount();
  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return requireAdmin();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
  }

  const col = await getNewsletterDraftsCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Entwurf nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ message: "Entwurf gelöscht." });
}
