import { NextResponse } from "next/server";
import { getLesezeichenHighscores } from "@/lib/lesezeichen";

/** GET /api/lesezeichen/highscores – Top 50 Lesezeichen-Rangliste */
export async function GET() {
  try {
    const scores = await getLesezeichenHighscores(50);
    return NextResponse.json({ scores });
  } catch (err) {
    console.error("GET /api/lesezeichen/highscores error:", err);
    return NextResponse.json(
      { message: "Interner Fehler." },
      { status: 500 },
    );
  }
}
