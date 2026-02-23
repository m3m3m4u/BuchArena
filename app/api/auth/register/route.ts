import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsersCollection, isDuplicateKeyError } from "@/lib/mongodb";

type RegisterPayload = {
  username?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "Bitte Benutzername, E-Mail und Passwort eingeben." },
        { status: 400 }
      );
    }

    if (password.length < 5) {
      return NextResponse.json(
        { message: "Das Passwort muss mindestens 5 Zeichen haben." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const existingUser = await users.findOne(
      { $or: [{ username }, { email }] },
      { projection: { _id: 1 } }
    );

    if (existingUser) {
      return NextResponse.json(
        { message: "Benutzername oder E-Mail ist bereits vergeben." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await users.insertOne({
      username,
      email,
      passwordHash,
      role: "USER",
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "Registrierung erfolgreich. Du kannst dich jetzt einloggen." },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { message: "Benutzername oder E-Mail ist bereits vergeben." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Registrierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
