import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

// GET /api/gewinnspiele/meine-buecher – Autoren-eigene Bücher als Dropdown-Optionen
export async function GET() {
  const account = await getServerAccount();
  if (!account) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });

  const booksCol = await getBooksCollection();
  const buecher = await booksCol
    .find(
      { ownerUsername: account.username },
      { projection: { _id: 1, title: 1, coverImageUrl: 1, genre: 1 } }
    )
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(
    buecher.map((b) => ({
      id: b._id?.toString(),
      title: b.title,
      coverImageUrl: b.coverImageUrl,
      genre: b.genre,
    }))
  );
}
