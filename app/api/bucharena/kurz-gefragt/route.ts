import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";

const QUESTIONS = [
  "Was ist dein Lebensmotto?",
  "Welches Buch hast du als erstes gelesen?",
  "Was ist dein größter Traum als Autorin?",
  "Hast du schon mal ein Buch abgebrochen und warum?",
  "Welche Szene war für dich am schwersten zu schreiben?",
  "Welches Genre traust du dir nicht zu?",
  "Happy End oder Open End?",
  "Hörst du Musik beim Schreiben, wenn ja, welche?",
  "Um welche Tageszeit schreibst du am liebsten?",
  "Wie viel von dir persönlich steckt in deinen Büchern?",
  "Welche Emotion beschreibst du am liebsten?",
  "Hast du feste Schreibrituale, wenn ja, welche?",
  "Wie motivierst du dich zum Schreiben?",
  "Gibt es ein Buch, das du nicht fertig geschrieben hast?",
  "Plot & Plan oder Chaos & Spontanität?",
  "Wie gehst du mit negativen Rezensionen um?",
  "Welches Buch hat dich motiviert, selbst zu schreiben?",
  'Was ist f\u00FCr dich \u201Eein gutes Buch\u201C?',
];

type SurveyDoc = {
  username: string;
  answers: Record<string, string>;
  updatedAt: Date;
};

/* GET – eigene Antworten laden */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const db = await getDatabase();
    const col = db.collection<SurveyDoc>("kurz_gefragt");
    const doc = await col.findOne({ username: account.username });

    return NextResponse.json({
      questions: QUESTIONS,
      answers: doc?.answers ?? {},
    });
  } catch (err) {
    console.error("GET /api/bucharena/kurz-gefragt error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}

/* POST – Antworten speichern / aktualisieren */
export async function POST(request: Request) {
  try {
    const account = await getServerAccount();
    if (!account) {
      return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { answers?: Record<string, string> };
    if (!body.answers || typeof body.answers !== "object") {
      return NextResponse.json({ message: "Ungültige Daten." }, { status: 400 });
    }

    // Nur gültige Fragen behalten und leere Antworten filtern
    const cleaned: Record<string, string> = {};
    for (const q of QUESTIONS) {
      const val = body.answers[q]?.trim();
      if (val) cleaned[q] = val;
    }

    const db = await getDatabase();
    const col = db.collection<SurveyDoc>("kurz_gefragt");

    await col.updateOne(
      { username: account.username },
      { $set: { answers: cleaned, updatedAt: new Date() } },
      { upsert: true },
    );

    return NextResponse.json({ message: "Gespeichert!", answers: cleaned });
  } catch (err) {
    console.error("POST /api/bucharena/kurz-gefragt error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
