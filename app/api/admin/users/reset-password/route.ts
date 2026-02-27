import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/server-auth";

type ResetPasswordPayload = {
  targetUsername?: string;
  newPassword?: string;
};

/**
 * Setzt das Passwort eines Users zurück (nur SUPERADMIN).
 */
export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as ResetPasswordPayload;
    const targetUsername = body.targetUsername?.trim();
    const newPassword = body.newPassword?.trim();

    if (!targetUsername || !newPassword) {
      return NextResponse.json(
        { message: "Benutzername und neues Passwort erforderlich." },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Das Passwort muss mindestens 6 Zeichen lang sein." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();

    const target = await users.findOne(
      { username: targetUsername },
      { projection: { role: 1 } },
    );

    if (!target) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { message: "Das Admin-Passwort kann hier nicht geändert werden." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await users.updateOne(
      { username: targetUsername },
      { $set: { passwordHash } },
    );

    return NextResponse.json({
      message: `Passwort für „${targetUsername}" wurde zurückgesetzt.`,
    });
  } catch {
    return NextResponse.json(
      { message: "Passwort-Reset fehlgeschlagen." },
      { status: 500 },
    );
  }
}
