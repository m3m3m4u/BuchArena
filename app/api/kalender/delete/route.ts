import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getKalenderCollection } from "@/lib/mongodb";
import { getServerAccount, requireAdmin } from "@/lib/server-auth";
import { removeTerminErstellt } from "@/lib/lesezeichen";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };

    if (!body.id || !ObjectId.isValid(body.id)) {
      return NextResponse.json({ message: "Ungültige Termin-ID." }, { status: 400 });
    }

    const col = await getKalenderCollection();
    const existing = await col.findOne({ _id: new ObjectId(body.id) });

    if (!existing) {
      return NextResponse.json({ message: "Termin nicht gefunden." }, { status: 404 });
    }

    // Only creator or admin may delete
    const isAdmin = !!(await requireAdmin());
    if (existing.createdBy !== account.username && !isAdmin) {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    await col.deleteOne({ _id: new ObjectId(body.id) });

    // Lesezeichen zurücknehmen
    await removeTerminErstellt(existing.createdBy);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kalender delete error:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
