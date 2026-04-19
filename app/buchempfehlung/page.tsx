"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

/* ═══════════════ Types ═══════════════ */

type Step =
  | "genre"
  | "age"
  | "mood"
  | "length"
  | "fantasy"
  | "trueStory"
  | "happyEnd"
  | "series"
  | "setting"
  | "freeText"
  | "loading"
  | "result";

type Preferences = {
  genres: string[];
  age: string;
  moods: string[];
  length: string;
  fantasy: boolean | null;
  trueStory: boolean | null;
  happyEnd: boolean | null;
  series: string;
  setting: string;
  freeText: string;
};

type Recommendation = {
  bookId: string;
  title: string;
  author: string;
  reason: string;
  description: string;
};

type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

/* ═══════════════ Constants ═══════════════ */

const GENRE_CHOICES = [
  "Fantasy",
  "Science-Fiction",
  "Krimi / Thriller",
  "Horror",
  "Liebesroman / Romance",
  "Historischer Roman",
  "Abenteuer",
  "Sachbuch",
  "Kinderbuch",
  "Jugendbuch",
  "Comic / Manga",
  "Humor / Satire",
  "Dystopie",
  "Mystery",
  "Drama",
];

const AGE_CHOICES = [
  "6–9 Jahre",
  "10–12 Jahre",
  "13–15 Jahre",
  "16–17 Jahre",
  "18+ Jahre",
  "Egal",
];

const MOOD_CHOICES = [
  "Spannung",
  "Humor",
  "Tiefgang",
  "Romantik",
  "Wissen",
  "Abenteuer",
  "Gruseln",
  "Zum Nachdenken",
];

const LENGTH_CHOICES = [
  { label: "Kurz (unter 200 Seiten)", value: "kurz" },
  { label: "Mittel (200–400 Seiten)", value: "mittel" },
  { label: "Lang (über 400 Seiten)", value: "lang" },
  { label: "Egal", value: "egal" },
];

const SERIES_CHOICES = [
  "Reihe bevorzugt",
  "Einzelband bevorzugt",
  "Egal",
];

const SETTING_CHOICES = [
  "Gegenwart",
  "Vergangenheit",
  "Zukunft",
  "Fantasiewelt",
  "Egal",
];

const QUESTIONS: Record<string, string> = {
  genre: "Welche Genres magst du? Du kannst mehrere auswählen!",
  age: "Für welches Alter suchst du ein Buch?",
  mood: "Was ist dir bei einem Buch wichtig? Wähle, was dich anspricht!",
  length: "Wie lang soll das Buch sein?",
  fantasy: "Magst du Fantasy-Elemente (Magie, andere Welten)?",
  trueStory: "Bevorzugst du Geschichten, die auf wahren Begebenheiten basieren?",
  happyEnd: "Ist dir ein Happy End wichtig?",
  series: "Bevorzugst du Bücher, die Teil einer Reihe sind, oder lieber Einzelbände?",
  setting: "In welchem Zeitsetting soll die Geschichte hauptsächlich spielen?",
  freeText: "Was ist dir sonst noch wichtig? (kann auch leer bleiben)",
};

/* ═══════════════ Component ═══════════════ */

export default function BuchempfehlungPage() {
  const [step, setStep] = useState<Step>("genre");
  const [prefs, setPrefs] = useState<Preferences>({
    genres: [],
    age: "",
    moods: [],
    length: "",
    fantasy: null,
    trueStory: null,
    happyEnd: null,
    series: "",
    setting: "",
    freeText: "",
  });
  // Pending single-choice selections (confirmed with "Weiter")
  const [pendingAge, setPendingAge] = useState("");
  const [pendingLength, setPendingLength] = useState<{ value: string; label: string } | null>(null);
  const [pendingYesNo, setPendingYesNo] = useState<boolean | null | "egal">(null);
  const [pendingSeries, setPendingSeries] = useState("");
  const [pendingSetting, setPendingSetting] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: "bot", text: "Hallo! Ich bin dein persönlicher Buchberater der BuchArena. Lass uns gemeinsam das perfekte Buch für dich finden!" },
    { role: "bot", text: QUESTIONS.genre },
  ]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, step, results]);

  function addMessages(...msgs: ChatMessage[]) {
    setChat((prev) => [...prev, ...msgs]);
  }

  function skipToResult() {
    addMessages(
      { role: "user", text: "Genug der Fragen, mach mir jetzt einen Vorschlag!" },
      { role: "bot", text: "Alles klar! Ich suche jetzt die besten Bücher für dich heraus …" },
    );
    setStep("loading");
    fetchRecommendations(prefs);
  }

  function handleGenreToggle(genre: string) {
    setPrefs((p) => ({
      ...p,
      genres: p.genres.includes(genre)
        ? p.genres.filter((g) => g !== genre)
        : [...p.genres, genre],
    }));
  }

  function confirmGenres() {
    const selected = prefs.genres.length ? prefs.genres.join(", ") : "Keine Präferenz";
    addMessages(
      { role: "user", text: selected },
      { role: "bot", text: QUESTIONS.age },
    );
    setStep("age");
  }

  function selectAge(age: string) {
    setPendingAge(age);
  }

  function confirmAge() {
    if (!pendingAge) return;
    setPrefs((p) => ({ ...p, age: pendingAge }));
    addMessages(
      { role: "user", text: pendingAge },
      { role: "bot", text: QUESTIONS.mood },
    );
    setPendingAge("");
    setStep("mood");
  }

  function handleMoodToggle(mood: string) {
    setPrefs((p) => ({
      ...p,
      moods: p.moods.includes(mood)
        ? p.moods.filter((m) => m !== mood)
        : [...p.moods, mood],
    }));
  }

  function confirmMoods() {
    const selected = prefs.moods.length ? prefs.moods.join(", ") : "Keine Präferenz";
    addMessages(
      { role: "user", text: selected },
      { role: "bot", text: QUESTIONS.length },
    );
    setStep("length");
  }

  function selectLength(value: string, label: string) {
    setPendingLength({ value, label });
  }

  function confirmLength() {
    if (!pendingLength) return;
    setPrefs((p) => ({ ...p, length: pendingLength.value }));
    addMessages(
      { role: "user", text: pendingLength.label },
      { role: "bot", text: QUESTIONS.fantasy },
    );
    setPendingLength(null);
    setPendingYesNo(null);
    setStep("fantasy");
  }

  function selectYesNo(value: boolean | null) {
    setPendingYesNo(value === null ? "egal" : value);
  }

  function confirmYesNo(field: "fantasy" | "trueStory" | "happyEnd") {
    if (pendingYesNo === null) return;
    const isEgal = pendingYesNo === "egal";
    const actualValue = isEgal ? null : (pendingYesNo as boolean);
    const answer = isEgal ? "Egal" : actualValue ? "Ja" : "Nein";

    if (!isEgal) setPrefs((p) => ({ ...p, [field]: actualValue }));
    setPendingYesNo(null);

    if (field === "fantasy") {
      addMessages(
        { role: "user", text: answer },
        { role: "bot", text: QUESTIONS.trueStory },
      );
      setStep("trueStory");
    } else if (field === "trueStory") {
      addMessages(
        { role: "user", text: answer },
        { role: "bot", text: QUESTIONS.happyEnd },
      );
      setStep("happyEnd");
    } else {
      addMessages(
        { role: "user", text: answer },
        { role: "bot", text: QUESTIONS.series },
      );
      if (!isEgal) setPrefs((p) => ({ ...p, [field]: actualValue }));
      setStep("series");
    }
  }

  function selectSeries(value: string) {
    setPendingSeries(value);
  }

  function confirmSeries() {
    if (!pendingSeries) return;
    const isEgal = pendingSeries === "Egal";
    if (!isEgal) setPrefs((p) => ({ ...p, series: pendingSeries }));
    addMessages(
      { role: "user", text: pendingSeries },
      { role: "bot", text: QUESTIONS.setting },
    );
    setPendingSeries("");
    setStep("setting");
  }

  function selectSetting(value: string) {
    setPendingSetting(value);
  }

  function confirmSetting() {
    if (!pendingSetting) return;
    const isEgal = pendingSetting === "Egal";
    if (!isEgal) setPrefs((p) => ({ ...p, setting: pendingSetting }));
    addMessages(
      { role: "user", text: pendingSetting },
      { role: "bot", text: QUESTIONS.freeText },
    );
    setPendingSetting("");
    setStep("freeText");
  }

  async function fetchRecommendations(finalPrefs: Preferences) {
    setError("");
    try {
      const res = await fetch("/api/buchempfehlung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: finalPrefs }),
      });
      const data = (await res.json()) as {
        recommendations?: Recommendation[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Fehler bei der Empfehlung.");

      const recs = data.recommendations ?? [];
      setResults(recs);

      if (recs.length > 0) {
        addMessages({
          role: "bot",
          text: `Ich habe ${recs.length} ${recs.length === 1 ? "Buch" : "Bücher"} für dich gefunden!`,
        });
      } else {
        addMessages({
          role: "bot",
          text: "Leider konnte ich kein passendes Buch finden. Versuch es nochmal mit anderen Vorlieben!",
        });
      }
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setStep("result");
    }
  }

  function restart() {
    setStep("genre");
    setPrefs({ genres: [], age: "", moods: [], length: "", fantasy: null, trueStory: null, happyEnd: null, series: "", setting: "", freeText: "" });
    setPendingAge("");
    setPendingLength(null);
    setPendingYesNo(null);
    setPendingSeries("");
    setPendingSetting("");
    setChat([
      { role: "bot", text: "Hallo! Lass uns nochmal von vorne anfangen." },
      { role: "bot", text: QUESTIONS.genre },
    ]);
    setResults([]);
    setError("");
  }

  /* ═══════════════ Render ═══════════════ */

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold text-arena-blue">Persönliche Buchempfehlung</h1>

        {/* ── Chat-Verlauf ── */}
        <div className="flex flex-col gap-3 pr-1">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                msg.role === "bot"
                  ? "self-start bg-arena-bg text-arena-text"
                  : "self-end bg-arena-blue text-white"
              }`}
            >
              {msg.text}
            </div>
          ))}

          {step === "loading" && (
            <div className="self-start bg-arena-bg rounded-xl px-4 py-2 text-sm text-arena-muted animate-pulse">
              Bücher werden analysiert …
            </div>
          )}
        </div>

        {/* ── Antwort-Bereich ── */}
        <div className="border-t border-arena-border pt-3">
          {/* Genre (Multi-Select) */}
          {step === "genre" && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {GENRE_CHOICES.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleGenreToggle(g)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                      prefs.genres.includes(g)
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <button onClick={confirmGenres} className="btn btn-primary">
                  Weiter →
                </button>
              </div>
            </div>
          )}

          {/* Alter (Single Select + Bestätigung) */}
          {step === "age" && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {AGE_CHOICES.map((a) => (
                  <button
                    key={a}
                    onClick={() => selectAge(a)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                      pendingAge === a
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                {pendingAge && (
                  <button onClick={confirmAge} className="btn btn-primary">
                    Weiter →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stimmung (Multi-Select) */}
          {step === "mood" && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {MOOD_CHOICES.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMoodToggle(m)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                      prefs.moods.includes(m)
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <button onClick={confirmMoods} className="btn btn-primary">
                  Weiter →
                </button>
              </div>
            </div>
          )}

          {/* Buchlänge (Single Select + Bestätigung) */}
          {step === "length" && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {LENGTH_CHOICES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => selectLength(l.value, l.label)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                      pendingLength?.value === l.value
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <button onClick={skipToResult} className="btn btn-secondary text-xs">
                  Genug der Fragen, mach mir jetzt einen Vorschlag!
                </button>
                {pendingLength && (
                  <button onClick={confirmLength} className="btn btn-primary">
                    Weiter →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ja/Nein-Fragen (mit Bestätigung) */}
          {(step === "fantasy" || step === "trueStory" || step === "happyEnd") && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => selectYesNo(true)}
                  className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                    pendingYesNo === true
                      ? "bg-arena-blue text-white border-arena-blue"
                      : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                  }`}
                >
                  Ja
                </button>
                <button
                  onClick={() => selectYesNo(false)}
                  className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                    pendingYesNo === false
                      ? "bg-arena-blue text-white border-arena-blue"
                      : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                  }`}
                >
                  Nein
                </button>
                <button
                  onClick={() => selectYesNo(null)}
                  className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                    pendingYesNo === "egal"
                      ? "bg-arena-blue text-white border-arena-blue"
                      : "bg-white text-arena-muted border-arena-border hover:bg-arena-bg"
                  }`}
                >
                  Egal
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <button onClick={skipToResult} className="btn btn-secondary text-xs">
                  Genug der Fragen, mach mir jetzt einen Vorschlag!
                </button>
                {pendingYesNo !== null && (
                  <button onClick={() => confirmYesNo(step)} className="btn btn-primary">
                    Weiter →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reihe oder Einzelband (Single Select + Bestätigung) */}
          {step === "series" && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {SERIES_CHOICES.map((s) => (
                  <button
                    key={s}
                    onClick={() => selectSeries(s)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                      pendingSeries === s
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <button onClick={skipToResult} className="btn btn-secondary text-xs">
                  Genug der Fragen, mach mir jetzt einen Vorschlag!
                </button>
                {pendingSeries && (
                  <button onClick={confirmSeries} className="btn btn-primary">
                    Weiter →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Zeitsetting (Single Select + Bestätigung) */}
          {step === "setting" && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {SETTING_CHOICES.map((s) => (
                  <button
                    key={s}
                    onClick={() => selectSetting(s)}
                    className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                      pendingSetting === s
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "bg-white text-arena-text border-arena-border hover:bg-arena-bg"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <button onClick={skipToResult} className="btn btn-secondary text-xs">
                  Genug der Fragen, mach mir jetzt einen Vorschlag!
                </button>
                {pendingSetting && (
                  <button onClick={confirmSetting} className="btn btn-primary">
                    Weiter →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Freitext */}
          {step === "freeText" && (
            <div className="grid gap-2">
              <textarea
                value={prefs.freeText}
                onChange={(e) => setPrefs((p) => ({ ...p, freeText: e.target.value }))}
                placeholder="z.B. Ich mag Geschichten mit starken Charakteren ..."
                className="w-full rounded-lg border border-arena-border p-3 text-sm resize-none focus:outline-none focus:border-arena-blue-light"
                rows={3}
              />
              <button
                onClick={() => {
                  const text = prefs.freeText.trim() || "Keine weiteren Wünsche";
                  addMessages(
                    { role: "user", text },
                    { role: "bot", text: "Perfekt! Ich suche jetzt die besten Bücher für dich heraus …" },
                  );
                  setStep("loading");
                  fetchRecommendations(prefs);
                }}
                className="btn btn-primary self-end"
              >
                Vorschlag holen →
              </button>
            </div>
          )}

          {/* Ergebnis */}
          {step === "result" && (
            <div className="grid gap-4">
              {error && <p className="text-red-700 text-sm">{error}</p>}

              {results.map((rec, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-arena-border bg-white p-4 grid gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-arena-blue text-base">
                        {i + 1}. {rec.title}
                      </p>
                      <p className="text-sm text-arena-muted">von {rec.author}</p>
                    </div>
                  </div>
                  {rec.description && (
                    <p className="text-sm text-arena-text">{rec.description}</p>
                  )}
                  <p className="text-sm text-arena-blue-light font-medium italic">
                    {rec.reason}
                  </p>
                  {rec.bookId && (
                    <Link
                      href={`/buch/${rec.bookId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-arena-link hover:underline"
                    >
                      → Zum Buch in der BuchArena
                    </Link>
                  )}
                </div>
              ))}

              <button onClick={restart} className="btn btn-primary self-start">
                Nochmal versuchen
              </button>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </section>
    </main>
  );
}

