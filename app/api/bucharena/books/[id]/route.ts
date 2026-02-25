import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBucharenaBooksCollection } from "@/lib/bucharena-db";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const col = await getBucharenaBooksCollection();
    const book = await col.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return NextResponse.json(
        { success: false, error: "Buch nicht gefunden" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, book });
  } catch (error) {
    console.error("Fehler beim Laden des Buchs:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const { id } = await params;
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

    let publishDateValue: string | undefined | null = undefined;
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
    } else {
      publishDateValue = null;
    }

    const col = await getBucharenaBooksCollection();
    const updateDoc: Record<string, unknown> = {
      title: title.trim(),
      author: author.trim(),
      instareelUrl: instareelUrl?.trim() || undefined,
      youtubeLangUrl: youtubeLangUrl?.trim() || undefined,
      youtubeShortUrl: youtubeShortUrl?.trim() || undefined,
      redditUrl: redditUrl?.trim() || undefined,
      tiktokUrl: tiktokUrl?.trim() || undefined,
      isActive: isActive !== false,
      updatedBy: admin.username,
      updatedAt: new Date(),
    };
    if (publishDateValue !== undefined) {
      updateDoc.publishDate = publishDateValue;
    }

    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Buch nicht gefunden" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, book: result });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Buchs:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const col = await getBucharenaBooksCollection();
    const result = await col.findOneAndDelete({ _id: new ObjectId(id) });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Buch nicht gefunden" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "Buch gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Buchs:", error);
    return NextResponse.json(
      { success: false, error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
