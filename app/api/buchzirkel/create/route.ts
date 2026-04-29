import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBuchzirkelCollection, getUsersCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import {
  STANDARD_AGB_TEXT,
  STANDARD_TOPICS,
  type BuchzirkelLeseabschnitt,
  type BuchzirkelTopic,
  type BuchzirkelFragebogenFrage,
} from "@/lib/buchzirkel";

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    // Nur Autoren (profile) und Verlage (verlageProfile) dürfen Zirkel erstellen
    const users = await getUsersCollection();
    const user = await users.findOne(
      { username: account.username },
      { projection: { profile: 1, verlageProfile: 1 } }
    );
    if (!user?.profile && !user?.verlageProfile) {
      return NextResponse.json(
        { message: "Nur Autoren und Verlage können Buchzirkel erstellen." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      typ?: string;
      titel?: string;
      beschreibung?: string;
      coverImageUrl?: string;
      youtubeUrl?: string;
      mediaImageUrl?: string;
      genre?: string;
      buchId?: string;
      bewerbungBis?: string;
      maxTeilnehmer?: number;
      bewerbungsFragen?: string[];
      genreFilter?: string[];
      agbPflicht?: boolean;
      agbText?: string;
      leseabschnitte?: BuchzirkelLeseabschnitt[];
      diskussionsTopics?: BuchzirkelTopic[];
      fragebogen?: BuchzirkelFragebogenFrage[];
    };

    const typ = body.typ === "betaleser" ? "betaleser" : "testleser";
    const titel = body.titel?.trim();
    const beschreibung = body.beschreibung?.trim() ?? "";
    const genre = body.genre?.trim() ?? "";

    if (!titel) {
      return NextResponse.json({ message: "Titel ist erforderlich." }, { status: 400 });
    }

    const bewerbungBis = body.bewerbungBis ? new Date(body.bewerbungBis) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const collection = await getBuchzirkelCollection();
    const now = new Date();

    const result = await collection.insertOne({
      typ,
      veranstalterUsername: account.username,
      buchId: body.buchId?.trim() || undefined,
      titel,
      beschreibung,
      coverImageUrl: body.coverImageUrl?.trim() || undefined,
      youtubeUrl: body.youtubeUrl?.trim() || undefined,
      mediaImageUrl: body.mediaImageUrl?.trim() || undefined,
      genre,
      status: "entwurf",
      bewerbungBis,
      maxTeilnehmer: body.maxTeilnehmer ?? 10,
      bewerbungsFragen: body.bewerbungsFragen ?? [],
      genreFilter: body.genreFilter ?? [],
      agbPflicht: typ === "betaleser" ? true : (body.agbPflicht ?? false),
      agbText: body.agbText?.trim() || STANDARD_AGB_TEXT,
      leseabschnitte: body.leseabschnitte ?? [],
      diskussionsTopics: body.diskussionsTopics ?? [...STANDARD_TOPICS],
      fragebogen: body.fragebogen ?? [],
      dateien: [],
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: result.insertedId.toString() });
  } catch (err) {
    console.error("buchzirkel/create:", err);
    return NextResponse.json({ message: "Serverfehler." }, { status: 500 });
  }
}
