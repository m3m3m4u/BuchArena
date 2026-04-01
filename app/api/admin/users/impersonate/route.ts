import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { requireSuperAdmin, createAuthToken } from "@/lib/server-auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Nur der SuperAdmin darf Benutzer imitieren." }, { status: 403 });
    }

    const body = (await request.json()) as { targetUsername?: string };
    const targetUsername = body.targetUsername?.trim();
    if (!targetUsername) {
      return NextResponse.json({ message: "Benutzername erforderlich." }, { status: 400 });
    }
    if (targetUsername === admin.username) {
      return NextResponse.json({ message: "Du bist bereits dieser Benutzer." }, { status: 400 });
    }

    const users = await getUsersCollection();
    const target = await users.findOne(
      { username: targetUsername },
      { projection: { username: 1, email: 1, role: 1, status: 1 } },
    );
    if (!target) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }
    if (target.role === "SUPERADMIN") {
      return NextResponse.json({ message: "SuperAdmins können nicht imitiert werden." }, { status: 403 });
    }

    // Aktuelles Admin-Token lesen und für Rückkehr aufbewahren
    const cookieStore = await cookies();
    const originalToken = cookieStore.get("auth_token")?.value ?? "";

    // Neues JWT für Zielbenutzer erstellen
    const targetToken = await createAuthToken({
      username: target.username,
      email: target.email,
      role: target.role,
    });

    const res = NextResponse.json({
      message: `Du bist jetzt als „${target.username}" eingeloggt.`,
      user: { username: target.username, email: target.email, role: target.role },
    });

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    // Admin-Token für Rückkehr speichern
    res.cookies.set("impersonation_return_token", originalToken, {
      ...cookieOpts,
      maxAge: 60 * 60 * 4, // 4 Stunden
    });

    // Nicht-httpOnly Cookie für UI-Banner
    res.cookies.set("impersonating_as", target.username, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4,
    });

    // Neues auth_token setzen
    res.cookies.set("auth_token", targetToken, {
      ...cookieOpts,
      maxAge: 60 * 60 * 4,
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Imitation fehlgeschlagen." }, { status: 500 });
  }
}
