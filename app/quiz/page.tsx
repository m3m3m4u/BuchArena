"use client";

import { useEffect, useState, useCallback } from "react";

/* ---------- Typen ---------- */
type WelchesBuch = { hints: string[]; book: string; author: string };
type WasPasstNicht = { books: string[]; commonality: string; oddOneOut: string };
type Buchstabensalat = { title: string; scrambled: string };

type QuizData = {
  welchesBuch: WelchesBuch[];
  wasPasstNicht: WasPasstNicht[];
  buchstabensalat: Buchstabensalat[];
};

type QuizType = "welchesBuch" | "wasPasstNicht" | "buchstabensalat";

const LABELS: Record<QuizType, string> = {
  welchesBuch: "Welches Buch?",
  wasPasstNicht: "Was passt nicht?",
  buchstabensalat: "Buchstabensalat",
};

const DESCRIPTIONS: Record<QuizType, string> = {
  welchesBuch: "Du bekommst 4 kryptische Hinweise. Errate, welches Buch gemeint ist!",
  wasPasstNicht: "5 Bücher werden genannt – eines passt nicht dazu. Welches und warum?",
  buchstabensalat: "Die Buchstaben eines Buchtitels wurden durcheinander gewürfelt. Erkennst du ihn?",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function QuizPage() {
  const [data, setData] = useState<QuizData | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<QuizType | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Aktuelle Aufgabe
  const [currentWB, setCurrentWB] = useState<WelchesBuch | null>(null);
  const [currentWPN, setCurrentWPN] = useState<WasPasstNicht | null>(null);
  const [currentBS, setCurrentBS] = useState<Buchstabensalat | null>(null);
  // Wie viele Hinweise bei "Welches Buch?" anzeigen (1-4)
  const [hintsShown, setHintsShown] = useState(1);

  useEffect(() => {
    fetch("/data/quiz.json")
      .then((r) => r.json())
      .then((d: QuizData) => setData(d))
      .catch(() => setError("Quiz-Daten konnten nicht geladen werden."));
  }, []);

  const startRound = useCallback(
    (type: QuizType) => {
      if (!data) return;
      setMode(type);
      setShowSolution(false);
      setHintsShown(1);
      if (type === "welchesBuch") setCurrentWB(pick(data.welchesBuch));
      if (type === "wasPasstNicht") setCurrentWPN(pick(data.wasPasstNicht));
      if (type === "buchstabensalat") setCurrentBS(pick(data.buchstabensalat));
    },
    [data],
  );

  const nextQuestion = useCallback(() => {
    if (mode) startRound(mode);
  }, [mode, startRound]);

  /* ---- Auswahl-Bildschirm ---- */
  if (!mode) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1 className="text-xl">Quiz</h1>
          {error && <p className="text-red-700">{error}</p>}
          {!data && !error && <p className="text-arena-muted">Lade Quiz-Daten …</p>}
          {data && (
            <div className="flex flex-col gap-3 mt-2">
              {(Object.keys(LABELS) as QuizType[]).map((type) => (
                <button
                  key={type}
                  className="btn btn-primary w-full text-left flex flex-col items-start gap-0.5 py-3"
                  onClick={() => startRound(type)}
                >
                  <span className="font-bold text-base">{LABELS[type]}</span>
                  <span className="text-sm opacity-80 font-normal">{DESCRIPTIONS[type]}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  /* ======== Quiz-Ansicht ======== */
  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl m-0">{LABELS[mode]}</h1>
          <button className="btn btn-sm" onClick={() => setMode(null)}>
            ← Zurück
          </button>
        </div>

        <p className="text-sm text-arena-muted mt-1 mb-3">{DESCRIPTIONS[mode]}</p>

        {/* ---------- Welches Buch? ---------- */}
        {mode === "welchesBuch" && currentWB && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {currentWB.hints.slice(0, hintsShown).map((hint, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-arena-bg border border-arena-border-light p-3 text-[0.95rem]"
                >
                  <span className="font-semibold text-arena-blue mr-1.5">Hinweis {i + 1}:</span>
                  {hint}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {hintsShown < 4 && (
                <button
                  className="btn btn-sm"
                  onClick={() => setHintsShown((h) => Math.min(h + 1, 4))}
                >
                  Nächster Hinweis ({hintsShown}/4)
                </button>
              )}
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowSolution(true)}
              >
                Lösung anzeigen
              </button>
            </div>

            {showSolution && (
              <div className="rounded-lg bg-green-50 border border-green-300 p-4 mt-1">
                <p className="font-bold text-green-800 text-lg m-0">
                  📖 {currentWB.book}
                </p>
                <p className="text-green-700 text-sm m-0">von {currentWB.author}</p>
              </div>
            )}
          </div>
        )}

        {/* ---------- Was passt nicht? ---------- */}
        {mode === "wasPasstNicht" && currentWPN && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentWPN.books.map((b, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-center font-medium ${
                    showSolution && currentWPN.oddOneOut.toLowerCase().includes(b.toLowerCase())
                      ? "border-red-400 bg-red-50 text-red-800"
                      : "border-arena-border-light bg-arena-bg"
                  }`}
                >
                  {b}
                </div>
              ))}
            </div>

            <button
              className="btn btn-sm btn-primary w-fit"
              onClick={() => setShowSolution(true)}
            >
              Lösung anzeigen
            </button>

            {showSolution && (
              <div className="rounded-lg bg-green-50 border border-green-300 p-4 mt-1">
                <p className="font-bold text-green-800 m-0">
                  🔍 Gemeinsamkeit: {currentWPN.commonality}
                </p>
                <p className="text-green-700 text-sm m-0 mt-1">
                  Passt nicht: {currentWPN.oddOneOut}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------- Buchstabensalat ---------- */}
        {mode === "buchstabensalat" && currentBS && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-arena-bg border border-arena-border-light p-5 text-center">
              <p className="text-2xl font-mono font-bold tracking-wider m-0 break-all">
                {currentBS.scrambled}
              </p>
            </div>

            <button
              className="btn btn-sm btn-primary w-fit"
              onClick={() => setShowSolution(true)}
            >
              Lösung anzeigen
            </button>

            {showSolution && (
              <div className="rounded-lg bg-green-50 border border-green-300 p-4 mt-1">
                <p className="font-bold text-green-800 text-lg m-0">
                  📖 {currentBS.title}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nächste Frage */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-arena-border">
          <button className="btn btn-primary" onClick={nextQuestion}>
            Nächste Frage
          </button>
          <button className="btn" onClick={() => setMode(null)}>
            Anderes Quiz
          </button>
        </div>
      </section>
    </main>
  );
}
