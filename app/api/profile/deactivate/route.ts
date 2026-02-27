import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

type DeactivatePayload = {
  username?: string;
};

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const username = account.username;

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
