import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createAuthToken } from "@/lib/server-auth";

type LoginPayload = {
  identifier?: string;
  username?: string;
  password?: string;
};

type UserRow = {
  username: string;
  email: string;
  passwordHash: string;
  role: "USER" | "SUPERADMIN";
  status?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const identifier = (body.identifier ?? body.username)?.trim();
    const normalizedEmail = identifier?.toLowerCase();
    const password = body.password?.trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Bitte E-Mail/Benutzername und Passwort eingeben." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const user = (await users.findOne(
      { $or: [{ username: identifier }, { email: normalizedEmail }] },
      { projection: { username: 1, email: 1, passwordHash: 1, role: 1, status: 1 } }
    )) as UserRow | null;

    if (!user) {
      return NextResponse.json(
        { message: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    if (user.status === "deactivated") {
      return NextResponse.json(
        { message: "Dein Konto ist deaktiviert. Bitte wende dich an den Support." },
        { status: 403 }
      );
    }

    // Signiertes JWT erzeugen und als HttpOnly-Cookie setzen
    const token = await createAuthToken({
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({
      message: `Willkommen ${user.username}!`,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 Tage
    });

    return res;
  } catch {
    return NextResponse.json(
      { message: "Login fehlgeschlagen." },
      { status: 500 }
    );
  }
}
