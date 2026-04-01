import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getBooksCollection } from "@/lib/mongodb";
import { getServerAccount } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rate-limit";

type Preferences = {
  genres: string[];
  age: string;
  moods: string[];
  length: string;
  fantasy: boolean | null;
  trueStory: boolean | null;
  happyEnd: boolean | null;
  freeText?: string;
};

type BookSummary = {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  ageFrom?: number;
  ageTo?: number;
  pageCount?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { preferences?: Preferences };
    const prefs = body.preferences;
    if (!prefs) {
      return NextResponse.json(
        { message: "Keine Vorlieben übermittelt." },
        { status: 400 },
      );
    }

    // Rate-Limiting: max 5 Empfehlungen pro Stunde (OpenAI-Kosten)
    const account = await getServerAccount();
    const limitKey = account ? `buchempf:${account.username}` : `buchempf:anon`;
    if (!checkRateLimit(limitKey, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Zu viele Anfragen. Bitte warte etwas." },
        { status: 429 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "OpenAI API-Key ist nicht konfiguriert." },
        { status: 500 },
      );
    }

    // ── Bücher aus der Datenbank laden ──
    const booksCol = await getBooksCollection();
    const dbBooks = await booksCol.find({}).limit(200).toArray();

    const bookList: BookSummary[] = dbBooks.map((b) => ({
      id: b._id.toString(),
      title: b.title,
      author: b.ownerUsername,
      genre: b.genre ?? "",
      description: b.description ?? "",
      ageFrom: b.ageFrom,
      ageTo: b.ageTo,
      pageCount: b.pageCount,
    }));

    if (bookList.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: "Aktuell sind leider keine Bücher in der BuchArena verfügbar.",
      });
    }

    // ── Bücher-Kontext für die KI aufbereiten ──
    const bookContext = bookList
      .map(
        (b) =>
          `[ID: ${b.id}] "${b.title}" von ${b.author} | Genre: ${b.genre} | ` +
          `Alter: ${b.ageFrom ?? "?"}–${b.ageTo ?? "?"} | Seiten: ${b.pageCount ?? "?"}\n` +
          `Beschreibung: ${b.description || "Keine Beschreibung verfügbar."}`,
      )
      .join("\n\n");

    // ── Vorlieben als Text ──
    const prefsText = [
      `Lieblingsgenres: ${prefs.genres.length ? prefs.genres.join(", ") : "Keine Präferenz"}`,
      `Alter: ${prefs.age || "Keine Angabe"}`,
      `Stimmung/Vorlieben: ${prefs.moods.length ? prefs.moods.join(", ") : "Keine Präferenz"}`,
      `Buchlänge: ${prefs.length || "Egal"}`,
      prefs.fantasy !== null ? `Fantasy-Elemente erwünscht: ${prefs.fantasy ? "Ja" : "Nein"}` : "",
      prefs.trueStory !== null ? `Wahre Geschichte bevorzugt: ${prefs.trueStory ? "Ja" : "Nein"}` : "",
      prefs.happyEnd !== null ? `Happy End gewünscht: ${prefs.happyEnd ? "Ja" : "Nein"}` : "",
      prefs.freeText ? `Sonstige Wünsche: ${prefs.freeText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // ── OpenAI-Anfrage ──
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Du bist ein freundlicher und enthusiastischer Buchberater der BuchArena-Plattform. 
Du empfiehlst Bücher ausschließlich aus dem folgenden Katalog. Erfinde KEINE Bücher.
Antworte immer auf Deutsch.

Wenn kein Buch perfekt passt, wähle die am besten passenden und erkläre ehrlich, warum.

Deine Antwort MUSS als JSON-Array mit genau diesem Format sein (1-3 Bücher):
[
  {
    "bookId": "die ID des Buches",
    "title": "Buchtitel",
    "author": "Autor",
    "reason": "2-3 Sätze, warum dieses Buch zum Benutzer passt. Beziehe dich auf die Vorlieben.",
    "description": "Kurze Zusammenfassung des Buches basierend auf der Beschreibung aus dem Katalog."
  }
]

Katalog der verfügbaren Bücher:
${bookContext}`,
        },
        {
          role: "user",
          content: `Hier sind meine Lesevorlieben:\n${prefsText}\n\nBitte empfiehl mir passende Bücher aus der BuchArena!`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    // JSON aus der Antwort extrahieren (GPT umgibt es manchmal mit Markdown)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    let recommendations: unknown[] = [];
    try {
      recommendations = JSON.parse(jsonMatch?.[0] ?? "[]") as unknown[];
    } catch {
      // Fallback: leere Liste
      recommendations = [];
    }

    // Nur Empfehlungen zurückgeben, deren bookId tatsächlich in der DB existiert
    const validIds = new Set(bookList.map((b) => b.id));
    recommendations = (recommendations as Array<Record<string, unknown>>).filter(
      (r) => typeof r.bookId === "string" && validIds.has(r.bookId),
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Buchempfehlung Fehler:", error);
    return NextResponse.json(
      { message: "Empfehlung konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
