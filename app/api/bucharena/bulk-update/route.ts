import { NextResponse } from "next/server";
import { getBucharenaBooksCollection } from "@/lib/bucharena-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, books } = body;

    if (!apiKey || apiKey !== process.env.BUCHARENA_API_KEY) {
      return NextResponse.json({ success: false, error: "Ungültiger API-Key" }, { status: 401 });
    }

    if (!Array.isArray(books) || books.length === 0) {
      return NextResponse.json({ success: false, error: "Keine Bücher zum Aktualisieren" }, { status: 400 });
    }

    const col = await getBucharenaBooksCollection();
    const results = { updated: 0, created: 0, errors: [] as string[] };

    for (const bookData of books) {
      try {
        const { title, author, youtubeLangUrl, youtubeShortUrl, redditUrl, tiktokUrl, instareelUrl, publishDate } = bookData;
        if (!title || !author) { results.errors.push("Buch ohne Titel oder Autor übersprungen"); continue; }

        const existingBook = await col.findOne({
          title: { $regex: new RegExp(`^${title.trim()}$`, "i") },
          author: { $regex: new RegExp(`^${author.trim()}$`, "i") },
        });

        const updateData = {
          title: title.trim(),
          author: author.trim(),
          youtubeLangUrl: youtubeLangUrl?.trim() || undefined,
          youtubeShortUrl: youtubeShortUrl?.trim() || undefined,
          redditUrl: redditUrl?.trim() || undefined,
          tiktokUrl: tiktokUrl?.trim() || undefined,
          instareelUrl: instareelUrl?.trim() || undefined,
          publishDate: publishDate?.trim() || undefined,
          isActive: true,
          updatedAt: new Date(),
        };

        if (existingBook) {
          await col.updateOne({ _id: existingBook._id }, { $set: updateData });
          results.updated++;
        } else {
          await col.insertOne({ ...updateData, createdBy: "bulk-import", createdAt: new Date() });
          results.created++;
        }
      } catch (err) {
        const error = err as Error;
        results.errors.push(`Fehler bei "${bookData.title}": ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `${results.updated} aktualisiert, ${results.created} erstellt, ${results.errors.length} Fehler`,
    });
  } catch (error) {
    console.error("Fehler beim Bulk-Update:", error);
    return NextResponse.json({ success: false, error: "Interner Serverfehler" }, { status: 500 });
  }
}
