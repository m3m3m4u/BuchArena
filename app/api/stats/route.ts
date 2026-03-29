import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

/** GET – Öffentliche Statistiken: Anzahl Bücher, Autoren, Blogger, Sprecher */
export async function GET() {
  try {
    const db = await getDatabase();
    const users = db.collection("users");

    const [bookCount, authorCount, bloggerCount, speakerCount] = await Promise.all([
      db.collection("books").countDocuments({}),
      users.countDocuments({ "profile": { $exists: true } }),
      users.countDocuments({ "bloggerProfile": { $exists: true } }),
      users.countDocuments({ "speakerProfile": { $exists: true } }),
    ]);

    return NextResponse.json({ bookCount, authorCount, bloggerCount, speakerCount });
  } catch {
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
