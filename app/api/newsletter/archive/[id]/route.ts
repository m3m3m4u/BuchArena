import { NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-auth";
import { getNewsletterArchiveCollection } from "@/lib/newsletter";
import { ObjectId } from "mongodb";

/** GET /api/newsletter/archive/[id] — Einzelnen Archiv-Eintrag inkl. HTML-Inhalt */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getNewsletterArchiveCollection();
    const entry = await col.findOne({ _id: new ObjectId(id) });
    if (!entry) {
      return NextResponse.json({ message: "Nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (err) {
    console.error("[Newsletter Archive] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}

/** DELETE /api/newsletter/archive/[id] — Archiv-Eintrag löschen */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await getServerAccount();
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige ID." }, { status: 400 });
    }

    const col = await getNewsletterArchiveCollection();
    await col.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Newsletter Archive] Fehler:", err);
    return NextResponse.json({ message: "Interner Serverfehler." }, { status: 500 });
  }
}
