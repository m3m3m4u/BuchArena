import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

type HighscoreDoc = {
  username: string;
  score: number;
  total: number;
  createdAt: Date;
};

/* GET – Top 20 Highscores laden */
export async function GET() {
  try {
    const db = await getDatabase();
    const col = db.collection<HighscoreDoc>("quiz_highscores");

    const docs = await col
      .find({})
      .sort({ score: -1, createdAt: 1 })
      .limit(20)
      .toArray();

    const scores = docs.map((d) => ({
      username: d.username,
      score: d.score,
      total: d.total,
      date: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ scores });
  } catch (err) {
    console.error("GET /api/quiz/highscore error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/* POST – Neuen Highscore speichern */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { score?: number; total?: number };
    const score = body.score;
    const total = body.total;

    if (typeof score !== "number" || typeof total !== "number" || total < 1) {
      return NextResponse.json({ message: "Ungültige Daten." }, { status: 400 });
    }

    const db = await getDatabase();
    const col = db.collection<HighscoreDoc>("quiz_highscores");

    await col.insertOne({
      username: account.username,
      score,
      total,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "Highscore gespeichert." });
  } catch (err) {
    console.error("POST /api/quiz/highscore error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
