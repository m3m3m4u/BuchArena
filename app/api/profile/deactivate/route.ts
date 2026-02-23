import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";

type DeactivatePayload = {
  username?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeactivatePayload;
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json(
        { message: "Benutzername fehlt." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username },
      { projection: { role: 1, status: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    if (user.role === "SUPERADMIN") {
      return NextResponse.json(
        { message: "Das Admin-Konto kann nicht deaktiviert werden." },
        { status: 403 }
      );
    }

    await users.updateOne({ username }, { $set: { status: "deactivated" } });

    return NextResponse.json({
      message: "Dein Konto wurde deaktiviert. Du wirst jetzt ausgeloggt.",
    });
  } catch {
    return NextResponse.json(
      { message: "Deaktivierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
