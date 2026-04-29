import { NextResponse } from "next/server";
import { ObjectId, type UpdateFilter } from "mongodb";
import { getBooksCollection } from "@/lib/mongodb";
import { applyAmazonOverride, getAllAmazonLinks, getFirstAmazonLink, type BookDocument } from "@/lib/books";
import { requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

async function requireKopernikus() {
  const account = await requireSuperAdmin();
  if (!account || account.username !== "Kopernikus") {
    return null;
  }
  return account;
}

export async function GET() {
  try {
    const account = await requireKopernikus();
    if (!account) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const col = await getBooksCollection();
    const books = await col
      .find({
        $or: [
          { buyLinks: { $elemMatch: { $regex: "amazon|amzn\\.to|amzn\\.eu", $options: "i" } } },
          { amazonOverrideUrl: { $exists: true, $ne: "" } },
        ],
      })
      .sort({ title: 1, ownerUsername: 1 })
      .toArray();

    return NextResponse.json({
      books: books.map((book) => ({
        id: book._id?.toString() ?? "",
        title: book.title,
        author: book.ownerUsername,
        amazonUrls: getAllAmazonLinks(book.buyLinks),
        amazonUrlOverride: book.amazonOverrideUrl ?? "",
        effectiveAmazonUrls: getAllAmazonLinks(applyAmazonOverride(book.buyLinks, book.amazonOverrideUrl)),
      })),
    });
  } catch (error) {
    console.error("Fehler beim Laden der Amazon-Links:", error);
    return NextResponse.json({ message: "Amazon-Links konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const account = await requireKopernikus();
    if (!account) {
      return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });
    }

    const body = (await request.json()) as { id?: string; amazonUrlOverride?: string };
    const id = body.id?.trim();
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ungültige Buch-ID." }, { status: 400 });
    }

    const overrideUrl = body.amazonUrlOverride?.trim() ?? "";
    const col = await getBooksCollection();
    const update: UpdateFilter<BookDocument> = overrideUrl
      ? {
          $set: {
            amazonOverrideUrl: overrideUrl,
          },
        }
      : {
          $unset: { amazonOverrideUrl: true },
        };

    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ message: "Buch nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Amazon-Link gespeichert.",
      book: {
        id: result._id?.toString() ?? id,
        title: result.title,
        author: result.ownerUsername,
        amazonUrls: getAllAmazonLinks(result.buyLinks),
        amazonUrlOverride: result.amazonOverrideUrl ?? "",
        effectiveAmazonUrls: getAllAmazonLinks(applyAmazonOverride(result.buyLinks, result.amazonOverrideUrl)),
      },
    });
  } catch (error) {
    console.error("Fehler beim Speichern des Amazon-Overrides:", error);
    return NextResponse.json({ message: "Amazon-Link konnte nicht gespeichert werden." }, { status: 500 });
  }
}