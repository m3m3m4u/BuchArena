import { NextResponse } from "next/server";
import { getBooksCollection, getUsersCollection, getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const books = await getBooksCollection();
    const usersCol = await getUsersCollection();
    const db = await getDatabase();
    const empfCol = db.collection("buchempfehlungen");

    const deactivatedUsers = await usersCol
      .find({ status: "deactivated" }, { projection: { username: 1 } })
      .toArray();
    const deactivatedSet = new Set(deactivatedUsers.map((u) => u.username));

    const raw = await books
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const allUsers = await usersCol
      .find({}, { projection: { username: 1, profile: 1 } })
      .toArray();
    const nameMap = new Map<string, string>();
    for (const u of allUsers) {
      const profileName = u.profile?.name?.value;
      nameMap.set(u.username, profileName || u.username);
    }

    // Empfehlungen-Anzahl pro Buch laden
    const empfCounts = await empfCol.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]).toArray();
    const countMap = new Map(empfCounts.map((e) => [e._id, e.count]));

    const list = raw
      .filter((b) => !deactivatedSet.has(b.ownerUsername))
      .map((b) => ({
        ...b,
        id: b._id.toString(),
        _id: undefined,
        authorDisplayName: nameMap.get(b.ownerUsername) ?? b.ownerUsername,
        empfehlungenCount: countMap.get(b._id.toString()) ?? 0,
      }));

    return NextResponse.json({ books: list });
  } catch {
    return NextResponse.json(
      { message: "Bücher konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
