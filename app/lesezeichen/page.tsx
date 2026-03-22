"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";
import { LESEZEICHEN_RULES } from "@/lib/lesezeichen-rules";

type HighscoreEntry = { username: string; displayName: string; total: number };

type MyStats = {
  total: number;
  loginDays: number;
  quizDays: number;
  treffpunktDays: number;
};

const REASON_ICONS: Record<string, string> = {
  profil_ausgefuellt: "📝",
  buecher_hochgeladen: "📚",
  tages_login: "📅",
  wochen_streak: "🔥",
  treffpunkt_beitrag: "💬",
  quiz_tag: "🧠",
  mc_quiz_10_punkte: "🏆",
};

export default function LesezeichenPage() {
  const [scores, setScores] = useState<HighscoreEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const username = getStoredAccount()?.username ?? "";

  useEffect(() => {
    setLoggedIn(!!getStoredAccount());
  }, []);

  const loadHighscores = useCallback(() => {
    fetch("/api/lesezeichen/highscores")
      .then((r) => r.json())
      .then((d: { scores?: HighscoreEntry[] }) => setScores(d.scores ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const loadMyStats = useCallback(() => {
    if (!loggedIn) return;
    fetch("/api/lesezeichen")
      .then((r) => r.json())
      .then((d: MyStats) => setMyStats(d))
      .catch(() => {});
  }, [loggedIn]);

  useEffect(() => {
    loadHighscores();
    loadMyStats();
  }, [loadHighscores, loadMyStats]);

  return (
    <main className="top-centered-main">
      {/* Eigener Stand */}
      {loggedIn && myStats && (
        <section className="card">
          <h1 className="text-xl flex items-center gap-2">
            🔖 Deine Lesezeichen
          </h1>
          <div className="rounded-lg bg-arena-bg border border-arena-border-light p-5 text-center">
            <p className="text-4xl font-bold m-0">{myStats.total}</p>
            <p className="text-arena-muted text-sm mt-1 m-0">Lesezeichen gesammelt</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-arena-bg border border-arena-border-light p-3">
              <p className="font-bold text-lg m-0">{myStats.loginDays}</p>
              <p className="text-arena-muted m-0">Login-Tage</p>
            </div>
            <div className="rounded-lg bg-arena-bg border border-arena-border-light p-3">
              <p className="font-bold text-lg m-0">{myStats.quizDays}</p>
              <p className="text-arena-muted m-0">Quiz-Tage</p>
            </div>
            <div className="rounded-lg bg-arena-bg border border-arena-border-light p-3">
              <p className="font-bold text-lg m-0">{myStats.treffpunktDays}</p>
              <p className="text-arena-muted m-0">Treffpunkt-Tage</p>
            </div>
          </div>
        </section>
      )}

      {/* Regeln */}
      <section className="card mt-3">
        <h2 className="text-xl flex items-center gap-2">
          📖 So sammelst du Lesezeichen
        </h2>
        <p className="text-arena-muted text-sm m-0">
          Lesezeichen sind deine Belohnung für Aktivität auf BuchArena. Sammle so viele wie möglich!
        </p>
        <div className="flex flex-col gap-2 mt-2">
          {LESEZEICHEN_RULES.map((rule) => (
            <div
              key={rule.reason}
              className="flex items-start gap-3 rounded-lg border border-arena-border-light bg-white px-4 py-3"
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">
                {REASON_ICONS[rule.reason] ?? "🔖"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold m-0">{rule.label}</p>
                <p className="text-arena-muted text-sm m-0">{rule.description}</p>
              </div>
              <span className="badge bg-yellow-100 text-yellow-800 flex-shrink-0 whitespace-nowrap">
                {rule.amount}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Highscores */}
      <section className="card mt-3">
        <h2 className="text-xl flex items-center gap-2">
          🏅 Rangliste
        </h2>

        {isLoading && (
          <p className="text-arena-muted text-sm">Lade Rangliste …</p>
        )}

        {!isLoading && scores.length === 0 && (
          <p className="text-arena-muted text-sm">
            Noch keine Lesezeichen vergeben. Sei der/die Erste!
          </p>
        )}

        {!isLoading && scores.length > 0 && (
          <div className="flex flex-col gap-1">
            {scores.map((entry, i) => {
              const isMe = entry.username === username;
              return (
                <div
                  key={`${entry.username}-${i}`}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${
                    isMe
                      ? "bg-yellow-50 border-yellow-300"
                      : i === 0
                        ? "bg-yellow-50 border-yellow-200"
                        : i === 1
                          ? "bg-gray-50 border-gray-200"
                          : i === 2
                            ? "bg-orange-50 border-orange-200"
                            : "bg-white border-arena-border-light"
                  }`}
                >
                  <span className="font-bold text-lg w-8 text-center flex-shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <span className={`flex-1 font-medium truncate ${isMe ? "text-arena-blue font-bold" : ""}`}>
                    {entry.displayName}
                    {isMe && <span className="text-xs text-arena-muted ml-1">(du)</span>}
                  </span>
                  <span className="font-bold text-arena-blue whitespace-nowrap">
                    🔖 {entry.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
