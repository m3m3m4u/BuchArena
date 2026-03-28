import { NextResponse } from "next/server";
import { getUsersCollection, isDuplicateKeyError } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

type ChangeEmailPayload = {
  targetUsername?: string;
  newEmail?: string;
};

/**
 * Ändert die E-Mail-Adresse eines Users (Admin-Funktion).
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as ChangeEmailPayload;
    const targetUsername = body.targetUsername?.trim();
    const newEmail = body.newEmail?.trim().toLowerCase();

    if (!targetUsername || !newEmail) {
      return NextResponse.json(
        { message: "Benutzername und neue E-Mail erforderlich." },
        { status: 400 },
      );
    }

    // Einfache E-Mail-Validierung
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json(
        { message: "Ungültige E-Mail-Adresse." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();

    const target = await users.findOne(
      { username: targetUsername },
      { projection: { role: 1, email: 1 } },
    );

    if (!target) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { message: "Die SuperAdmin-E-Mail kann nicht geändert werden." },
        { status: 403 },
      );
    }

    if (target.role === "ADMIN" && admin.role !== "SUPERADMIN") {
      return NextResponse.json(
        { message: "Admin-E-Mails können nur vom SuperAdmin geändert werden." },
        { status: 403 },
      );
    }

    if (target.email === newEmail) {
      return NextResponse.json(
        { message: "Die neue E-Mail ist identisch mit der aktuellen." },
        { status: 400 },
      );
    }

    try {
      await users.updateOne(
        { username: targetUsername },
        { $set: { email: newEmail } },
      );
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return NextResponse.json(
          { message: `E-Mail „${newEmail}" ist bereits vergeben.` },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({
      message: `E-Mail von „${targetUsername}" wurde zu „${newEmail}" geändert.`,
    });
  } catch {
    return NextResponse.json(
      { message: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
