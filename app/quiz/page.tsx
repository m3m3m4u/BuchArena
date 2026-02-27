"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";

/* ---------- Typen ---------- */
type WelchesBuch = { hints: string[]; book: string; author: string };
type WasPasstNicht = { books: string[]; commonality: string; oddOneOut: string };
type Buchstabensalat = { title: string; scrambled: string };
type MCQuestion = { question: string; answers: string[]; correct: string; explanation: string };

type QuizData = {
  welchesBuch: WelchesBuch[];
  wasPasstNicht: WasPasstNicht[];
  buchstabensalat: Buchstabensalat[];
};

type QuizType = "welchesBuch" | "wasPasstNicht" | "buchstabensalat" | "multipleChoice";

type HighscoreEntry = { username: string; score: number; total: number; date: string };

const LABELS: Record<QuizType, string> = {
  welchesBuch: "Welches Buch?",
  wasPasstNicht: "Was passt nicht?",
  buchstabensalat: "Buchstabensalat",
  multipleChoice: "Multiple Choice",
};

const DESCRIPTIONS: Record<QuizType, string> = {
  welchesBuch: "Du bekommst 4 kryptische Hinweise. Errate, welches Buch gemeint ist!",
  wasPasstNicht: "5 Bücher werden genannt – eines passt nicht dazu. Welches und warum?",
  buchstabensalat: "Die Buchstaben eines Buchtitels wurden durcheinander gewürfelt. Erkennst du ihn?",
  multipleChoice: "Beantworte so viele Fragen wie du willst! Richtig = +1, Falsch = −3 Punkte.",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const [data, setData] = useState<QuizData | null>(null);
  const [mcData, setMcData] = useState<MCQuestion[] | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<QuizType | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Aktuelle Aufgabe (klassisch)
  const [currentWB, setCurrentWB] = useState<WelchesBuch | null>(null);
  const [currentWPN, setCurrentWPN] = useState<WasPasstNicht | null>(null);
  const [currentBS, setCurrentBS] = useState<Buchstabensalat | null>(null);
  const [hintsShown, setHintsShown] = useState(1);

  // MC-Quiz State
  const [mcPool, setMcPool] = useState<MCQuestion[]>([]);
  const [mcCurrent, setMcCurrent] = useState<MCQuestion | null>(null);
  const [mcSelected, setMcSelected] = useState<string | null>(null);
  const [mcRevealed, setMcRevealed] = useState(false);
  const [mcScore, setMcScore] = useState(0);
  const [mcCount, setMcCount] = useState(0);
  const [mcFinished, setMcFinished] = useState(false);
  const [mcShuffledAnswers, setMcShuffledAnswers] = useState<string[]>([]);

  // Highscore
  const [highscores, setHighscores] = useState<HighscoreEntry[]>([]);
  const [showHighscores, setShowHighscores] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const username = getStoredAccount()?.username ?? "";

  useEffect(() => {
    fetch("/data/quiz.json")
      .then((r) => r.json())
      .then((d: QuizData) => setData(d))
      .catch(() => setError("Quiz-Daten konnten nicht geladen werden."));

    fetch("/data/quiz-mc.json")
      .then((r) => r.json())
      .then((d: MCQuestion[]) => setMcData(d))
      .catch(() => {});
  }, []);

  const loadHighscores = useCallback(() => {
    fetch("/api/quiz/highscore")
      .then((r) => r.json())
      .then((d: { scores?: HighscoreEntry[] }) => setHighscores(d.scores ?? []))
      .catch(() => {});
  }, []);

  const startRound = useCallback(
    (type: QuizType) => {
      setMode(type);
      setShowSolution(false);
      setHintsShown(1);
      setScoreSaved(false);
      setShowHighscores(false);

      if (type === "welchesBuch" && data) setCurrentWB(pick(data.welchesBuch));
      if (type === "wasPasstNicht" && data) setCurrentWPN(pick(data.wasPasstNicht));
      if (type === "buchstabensalat" && data) setCurrentBS(pick(data.buchstabensalat));

      if (type === "multipleChoice" && mcData) {
        const pool = shuffle(mcData);
        setMcPool(pool.slice(1));
        setMcCurrent(pool[0]);
        setMcSelected(null);
        setMcRevealed(false);
        setMcScore(0);
        setMcCount(0);
        setMcFinished(false);
        setMcShuffledAnswers(shuffle(pool[0].answers));
      }
    },
    [data, mcData],
  );

  const nextQuestion = useCallback(() => {
    if (mode && mode !== "multipleChoice") startRound(mode);
  }, [mode, startRound]);

  /* MC helpers */
  function mcSelect(answer: string) {
    if (mcRevealed) return;
    setMcSelected(answer);
  }

  function mcReveal() {
    if (!mcSelected || !mcCurrent) return;
    setMcRevealed(true);
    setMcCount((c) => c + 1);
    if (mcSelected === mcCurrent.correct) {
      setMcScore((s) => s + 1);
    } else {
      setMcScore((s) => s - 3);
    }
  }

  function mcNext() {
    if (mcPool.length === 0) {
      // Alle Fragen durch – Pool neu mischen
      if (mcData) {
        const pool = shuffle(mcData);
        setMcPool(pool.slice(1));
        setMcCurrent(pool[0]);
        setMcShuffledAnswers(shuffle(pool[0].answers));
      }
    } else {
      const next = mcPool[0];
      setMcPool((p) => p.slice(1));
      setMcCurrent(next);
      setMcShuffledAnswers(shuffle(next.answers));
    }
    setMcSelected(null);
    setMcRevealed(false);
  }

  function mcEnd() {
    setMcFinished(true);
    loadHighscores();
  }

  async function saveHighscore() {
    if (!username || scoreSaved) return;
    try {
      const res = await fetch("/api/quiz/highscore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: mcScore, total: mcCount }),
      });
      if (res.ok) {
        setScoreSaved(true);
        loadHighscores();
      }
    } catch { /* ignore */ }
  }

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
              {(Object.keys(LABELS) as QuizType[]).map((type) => {
                const disabled = type === "multipleChoice" && !mcData;
                return (
                  <button
                    key={type}
                    className={`btn btn-primary w-full text-left flex flex-col items-start gap-0.5 py-3 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => !disabled && startRound(type)}
                    disabled={disabled}
                  >
                    <span className="font-bold text-base">{LABELS[type]}</span>
                    <span className="text-sm opacity-80 font-normal">{DESCRIPTIONS[type]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    );
  }

  /* ======== Multiple Choice ======== */
  if (mode === "multipleChoice") {
    const q = mcCurrent;

    if (mcFinished) {
      return (
        <main className="top-centered-main">
          <section className="card">
            <h1 className="text-xl">Ergebnis</h1>
            <div className="rounded-lg bg-arena-bg border border-arena-border-light p-5 text-center mt-2">
              <p className="text-3xl font-bold m-0">
                {mcScore} Punkte
              </p>
              <p className="text-arena-muted text-sm mt-1 m-0">
                {mcCount} Fragen beantwortet
              </p>
              <p className="text-arena-muted text-sm mt-1 m-0">
                {mcScore >= 20
                  ? "Unglaublich! 🎉"
                  : mcScore >= 10
                    ? "Sehr gut! 👏"
                    : mcScore >= 0
                      ? "Nicht schlecht!"
                      : "Übung macht den Meister! 📚"}
              </p>
            </div>

            {username && !scoreSaved && (
              <button className="btn btn-primary mt-3 w-full" onClick={saveHighscore}>
                Highscore speichern
              </button>
            )}
            {scoreSaved && <p className="text-green-700 text-sm mt-2">✓ Highscore gespeichert!</p>}
            {!username && (
              <p className="text-arena-muted text-sm mt-2">Melde dich an, um deinen Highscore zu speichern.</p>
            )}

            {/* Highscore-Tabelle */}
            <div className="mt-4">
              <button
                className="btn btn-sm"
                onClick={() => { setShowHighscores((v) => !v); if (!showHighscores) loadHighscores(); }}
              >
                {showHighscores ? "Highscores ausblenden" : "🏆 Highscores anzeigen"}
              </button>

              {showHighscores && (
                <div className="mt-3">
                  {highscores.length === 0 ? (
                    <p className="text-arena-muted text-sm">Noch keine Highscores vorhanden.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {highscores.map((hs, i) => (
                        <div
                          key={`${hs.username}-${hs.date}-${i}`}
                          className={`flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-2 ${
                            i === 0 ? "bg-yellow-50 border-yellow-300" : i === 1 ? "bg-gray-50" : i === 2 ? "bg-orange-50" : "bg-white"
                          }`}
                        >
                          <span className="font-bold text-lg w-8 text-center flex-shrink-0">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                          </span>
                          <span className="flex-1 font-medium truncate">{hs.username}</span>
                          <span className="font-bold text-arena-blue">{hs.score} Pkt.</span>
                          <span className="text-xs text-arena-muted">({hs.total} Fragen)</span>
                          <span className="text-xs text-arena-muted flex-shrink-0">
                            {new Date(hs.date).toLocaleDateString("de-AT")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-arena-border">
              <button className="btn btn-primary" onClick={() => startRound("multipleChoice")}>
                Nochmal spielen
              </button>
              <button className="btn" onClick={() => setMode(null)}>
                Anderes Quiz
              </button>
            </div>
          </section>
        </main>
      );
    }

    if (!q) return null;

    return (
      <main className="top-centered-main">
        <section className="card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl m-0">Multiple Choice</h1>
            <span className="text-sm text-arena-muted">
              Frage {mcCount + 1} · Punkte: {mcScore}
            </span>
          </div>

          <p className="font-semibold mt-3 text-[1.05rem]" style={{ lineHeight: 1.5 }}>
            {q.question}
          </p>

          <div className="flex flex-col gap-2 mt-2">
            {mcShuffledAnswers.map((answer) => {
              let cls = "rounded-lg border p-3 text-left cursor-pointer transition-colors font-medium";
              if (mcRevealed) {
                if (answer === q.correct) cls += " border-green-400 bg-green-50 text-green-800";
                else if (answer === mcSelected) cls += " border-red-400 bg-red-50 text-red-800";
                else cls += " border-arena-border-light bg-arena-bg opacity-60";
              } else if (answer === mcSelected) {
                cls += " border-arena-blue bg-blue-50 ring-2 ring-arena-blue";
              } else {
                cls += " border-arena-border-light bg-arena-bg hover:bg-[#f5f5f5]";
              }
              return (
                <button key={answer} className={cls} onClick={() => mcSelect(answer)}>
                  {answer}
                </button>
              );
            })}
          </div>

          {mcRevealed && q.explanation && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mt-3 text-sm text-blue-900">
              💡 {q.explanation}
            </div>
          )}

          <div className="flex gap-2 mt-4 pt-3 border-t border-arena-border">
            {!mcRevealed ? (
              <button
                className="btn btn-primary"
                disabled={!mcSelected}
                onClick={mcReveal}
              >
                Auswerten
              </button>
            ) : (
              <button className="btn btn-primary" onClick={mcNext}>
                Nächste Frage
              </button>
            )}
            <button className="btn" onClick={mcEnd}>
              Beenden & Ergebnis
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ======== Klassische Quiz-Ansicht ======== */
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
            <div className="flex flex-col gap-2">
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
