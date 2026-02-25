import { NextResponse } from "next/server";
import {
  getBucharenaBooksCollection,
  type BucharenaBookDoc,
} from "@/lib/bucharena-db";
import { requireSuperAdmin, getServerAccount } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    if (showAll) {
      const admin = await requireSuperAdmin();
      if (!admin) {
        return NextResponse.json(
          { success: false, error: "Keine Berechtigung" },
          { status: 403 }
        );
      }
    }

    const col = await getBucharenaBooksCollection();
    const query = showAll ? {} : { isActive: true };
    const books = await col.find(query).sort({ title: 1 }).toArray();

    return NextResponse.json({ success: true, books });
  } catch (error) {
    console.error("Fehler beim Laden der Bücher:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      author,
      instareelUrl,
      youtubeLangUrl,
      youtubeShortUrl,
      redditUrl,
      tiktokUrl,
      isActive,
      publishDate,
    } = body;

    if (!title || !author) {
      return NextResponse.json(
        { success: false, error: "Titel und Autor sind erforderlich" },
        { status: 400 }
      );
    }

    let publishDateValue: string | undefined;
    if (publishDate?.trim()) {
      const match = publishDate
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
      if (match) {
        const [, year, month, day, hour, minute] = match;
        publishDateValue = new Date(
          Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute)
          )
        ).toISOString();
      }
    }

    const now = new Date();
    const col = await getBucharenaBooksCollection();
    const doc: BucharenaBookDoc = {
      title: title.trim(),
      author: author.trim(),
      instareelUrl: instareelUrl?.trim() || undefined,
      youtubeLangUrl: youtubeLangUrl?.trim() || undefined,
      youtubeShortUrl: youtubeShortUrl?.trim() || undefined,
      redditUrl: redditUrl?.trim() || undefined,
      tiktokUrl: tiktokUrl?.trim() || undefined,
      publishDate: publishDateValue,
      isActive: isActive !== false,
      createdBy: admin.username,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc);

    return NextResponse.json(
      { success: true, book: { ...doc, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Erstellen des Buchs:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
