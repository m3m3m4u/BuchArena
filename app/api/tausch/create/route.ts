import { NextResponse } from "next/server";
import { getTauschCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

const VALID_CATEGORIES = ["Buch", "Hörbuch", "E-Book", "Lesezeichen", "Sonstiges"];

export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: string;
    };

    const title = body.title?.trim();
    const description = body.description?.trim();
    const category = body.category?.trim() ?? "Sonstiges";

    if (!title || !description) {
      return NextResponse.json({ message: "Titel und Beschreibung sind erforderlich." }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ message: "Titel darf maximal 200 Zeichen lang sein." }, { status: 400 });
    }

    if (description.length > 3000) {
      return NextResponse.json({ message: "Beschreibung darf maximal 3000 Zeichen lang sein." }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ message: "Ungültige Kategorie." }, { status: 400 });
    }

    const col = await getTauschCollection();
    const now = new Date();

    const doc = {
      authorUsername: account.username,
      title,
      description,
      category,
      status: "offen" as const,
      createdAt: now,
    };

    const result = await col.insertOne(doc);

    return NextResponse.json({
      item: { id: result.insertedId.toString(), ...doc },
    });
  } catch {
    return NextResponse.json({ message: "Tauschangebot konnte nicht erstellt werden." }, { status: 500 });
  }
}
