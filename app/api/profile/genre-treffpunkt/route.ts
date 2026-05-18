import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { GENRE_TOPICS } from "@/lib/discussions";

export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: account.username },
      { projection: { genreTreffpunktFilter: 1 } },
    );

    if (!user) {
      return NextResponse.json({ message: "Benutzer nicht gefunden." }, { status: 404 });
    }

    const genres: string[] = Array.isArray(user.genreTreffpunktFilter)
      ? user.genreTreffpunktFilter
      : [];

    return NextResponse.json({ genres });
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

    const body = (await request.json()) as { genres?: unknown };
    if (
      !Array.isArray(body.genres) ||
      !body.genres.every((g) => typeof g === "string" && (GENRE_TOPICS as readonly string[]).includes(g))
    ) {
      return NextResponse.json({ message: "Ungültige Genres." }, { status: 400 });
    }

    const genres: string[] = body.genres;

    const users = await getUsersCollection();
    await users.updateOne(
      { username: account.username },
      { $set: { genreTreffpunktFilter: genres } },
    );

    return NextResponse.json({ genres });
  } catch {
    return NextResponse.json({ message: "Einstellung konnte nicht gespeichert werden." }, { status: 500 });
  }
}
