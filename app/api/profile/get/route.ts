import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { createDefaultProfile } from "@/lib/profile";

type GetProfilePayload = {
  username?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GetProfilePayload;
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
      { projection: { profile: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: user.profile ?? createDefaultProfile(),
    });
  } catch {
    return NextResponse.json(
      { message: "Profil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
