import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const books = await getBooksCollection();
    const usersCol = await getUsersCollection();

    const deactivatedUsers = await usersCol
      .find({ status: "deactivated" }, { projection: { username: 1 } })
      .toArray();
    const deactivatedSet = new Set(deactivatedUsers.map((u) => u.username));

    const raw = await books
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const list = raw
      .filter((b) => !deactivatedSet.has(b.ownerUsername))
      .map((b) => ({ ...b, id: b._id.toString(), _id: undefined }));

    return NextResponse.json({ books: list });
  } catch {
    return NextResponse.json(
      { message: "Bücher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
