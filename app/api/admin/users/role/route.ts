import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/server-auth";

type RolePayload = {
  targetUsername?: string;
  newRole?: "USER" | "ADMIN";
};

/**
 * Setzt die Rolle eines Users (nur SUPERADMIN darf das).
 * Erlaubt: USER ↔ ADMIN. SUPERADMIN kann nicht geändert werden.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { message: "Nur der SuperAdmin darf Rollen vergeben." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RolePayload;
    const targetUsername = body.targetUsername?.trim();
    const newRole = body.newRole;

    if (!targetUsername || !newRole) {
      return NextResponse.json(
        { message: "Benutzername und neue Rolle erforderlich." },
        { status: 400 },
      );
    }

    if (newRole !== "USER" && newRole !== "ADMIN") {
      return NextResponse.json(
        { message: "Ungültige Rolle." },
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
        { message: "Die Rolle des SuperAdmin kann nicht geändert werden." },
        { status: 403 },
      );
    }

    await users.updateOne(
      { username: targetUsername },
      { $set: { role: newRole } },
    );

    const label = newRole === "ADMIN" ? "Admin" : "User";
    return NextResponse.json({
      message: `„${targetUsername}" ist jetzt ${label}.`,
    });
  } catch {
    return NextResponse.json(
      { message: "Rollenzuweisung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
