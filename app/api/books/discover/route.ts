import { NextResponse } from "next/server";
import { getBooksCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const books = await getBooksCollection();
    const raw = await books
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const list = raw.map((b) => ({ ...b, id: b._id.toString(), _id: undefined }));

    return NextResponse.json({ books: list });
  } catch {
    return NextResponse.json(
      { message: "Bücher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
