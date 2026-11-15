import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Kein Zugriff." }, { status: 403 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const filter = q
    ? { $or: [
        { title: { $regex: q, $options: "i" } },
        { ownerUsername: { $regex: q, $options: "i" } },
        { isbn: { $regex: q, $options: "i" } },
        { genre: { $regex: q, $options: "i" } },
      ] }
    : {};
  const books = await getBooksCollection();
  const list = await books.find(filter, {
    projection: { title: 1, ownerUsername: 1, isbn: 1, genre: 1, coverImageUrl: 1, publicationYear: 1, createdAt: 1 },
  }).sort({ createdAt: -1 }).limit(500).toArray();
  return NextResponse.json({ books: list.map((book) => ({ ...book, id: book._id.toString() })) });
}
