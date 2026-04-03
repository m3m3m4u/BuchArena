import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

/**
 * GET  → Gibt aktuelle Einstellungen + letztes Check-Datum zurück.
 * POST → Bestätigt die Prüfung (setzt lastSettingsCheckAt auf jetzt).
 */

export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: account.username },
      { projection: { email: 1, newsletterOptIn: 1, emailOnUnreadMessages: 1, lastSettingsCheckAt: 1 } },
    );

    if (!user) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      newsletterOptIn: !!user.newsletterOptIn,
      emailOnUnreadMessages: !!user.emailOnUnreadMessages,
      lastSettingsCheckAt: user.lastSettingsCheckAt ?? null,
    });
  } catch {
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      newsletterOptIn?: boolean;
      emailOnUnreadMessages?: boolean;
    };

    const users = await getUsersCollection();
    await users.updateOne(
      { username: account.username },
      {
        $set: {
          newsletterOptIn: !!body.newsletterOptIn,
          emailOnUnreadMessages: !!body.emailOnUnreadMessages,
          lastSettingsCheckAt: new Date(),
        },
      },
    );

    return NextResponse.json({ message: "Einstellungen bestätigt." });
  } catch {
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
