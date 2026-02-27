import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import * as XLSX from "xlsx";

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

/* GET – Admin: Alle Antworten als XLSX herunterladen */
export async function GET() {
  try {
    const account = await getServerAccount();
    if (!account || account.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung." }, { status: 403 });
    }

    const db = await getDatabase();
    const col = db.collection<SurveyDoc>("kurz_gefragt");
    const docs = await col.find({}).sort({ username: 1 }).toArray();

    // Header-Zeile
    const header = ["Benutzername", ...QUESTIONS];
    const rows = docs.map((d) => [d.username, ...QUESTIONS.map((q) => d.answers[q] ?? "")]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Spaltenbreiten
    ws["!cols"] = [{ wch: 20 }, ...QUESTIONS.map(() => ({ wch: 40 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kurz gefragt");

    const xlsxBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=kurz-gefragt.xlsx",
      },
    });
  } catch (err) {
    console.error("GET /api/bucharena/kurz-gefragt/export error:", err);
    return NextResponse.json({ message: "Interner Fehler." }, { status: 500 });
  }
}
