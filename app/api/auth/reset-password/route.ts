import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";

type ResetPayload = {
  token?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPayload;
    const token = body.token?.trim();
    const password = body.password?.trim();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token und neues Passwort sind erforderlich." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Das Passwort muss mindestens 8 Zeichen haben." },
        { status: 400 },
      );
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      {
        resetToken: token,
        resetTokenExpiresAt: { $gt: new Date() },
      },
      { projection: { username: 1 } },
    );

    if (!user) {
      return NextResponse.json(
        { message: "Ungültiger oder abgelaufener Link." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await users.updateOne(
      { username: user.username },
      {
        $set: { passwordHash },
        $unset: { resetToken: "", resetTokenExpiresAt: "" },
      },
    );

    return NextResponse.json({
      message: "Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt einloggen.",
    });
  } catch (err) {
    console.error("Reset-password error:", err);
    return NextResponse.json(
      { message: "Passwort-Reset fehlgeschlagen." },
      { status: 500 },
    );
  }
}
