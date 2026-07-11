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
  hideFromHighscores: boolean;
};

import {
  PencilSquareIcon,
  BookOpenIcon,
  CalendarIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  TrophyIcon,
  StarIcon,
  SparklesIcon,
  UserIcon,
  ClockIcon,
  BookmarkIcon
} from "@heroicons/react/24/outline";

const REASON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  profil_ausgefuellt: PencilSquareIcon,
  buecher_hochgeladen: BookOpenIcon,
  tages_login: CalendarIcon,
  wochen_streak: FireIcon,
  treffpunkt_beitrag: ChatBubbleLeftRightIcon,
  abstimmung: CheckCircleIcon,
  quiz_tag: AcademicCapIcon,
  mc_quiz_10_punkte: TrophyIcon,
  buchempfehlung: StarIcon,
  buchempfehlung_erhalten: SparklesIcon,
  profilempfehlung: UserIcon,
  profilempfehlung_erhalten: SparklesIcon,
  termin_erstellt: ClockIcon,
};

export default function LesezeichenPage() {
  const [scores, setScores] = useState<HighscoreEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hideSaving, setHideSaving] = useState(false);
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

  async function toggleHideFromHighscores() {
    if (!myStats) return;
    setHideSaving(true);
    try {
      const res = await fetch("/api/lesezeichen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideFromHighscores: !myStats.hideFromHighscores }),
      });
      const data = await res.json();
      if (data.success) {
        setMyStats({ ...myStats, hideFromHighscores: data.hideFromHighscores });
        loadHighscores();
      }
    } catch { /* ignore */ }
    finally { setHideSaving(false); }
  }

  useEffect(() => {
    loadHighscores();
    loadMyStats();
  }, [loadHighscores, loadMyStats]);

  return (
    <main className="centered-main">
      <div className="w-full flex flex-col gap-3">
        {/* Eigener Stand */}
        {loggedIn && myStats && (
          <section className="card flex-shrink-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Deine Lesezeichen
            </h1>
            <div className="rounded-lg bg-arena-bg border border-arena-border-light p-3 sm:p-5 text-center">
              <p className="text-3xl sm:text-4xl font-bold m-0">{myStats.total}</p>
              <p className="text-arena-muted text-xs sm:text-sm mt-1 m-0">Lesezeichen gesammelt</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs sm:text-sm max-[360px]:grid-cols-1">
              <div className="rounded-lg bg-arena-bg border border-arena-border-light p-2 sm:p-3">
                <p className="font-bold text-base sm:text-lg m-0">{myStats.loginDays}</p>
                <p className="text-arena-muted m-0">Login-Tage</p>
              </div>
              <div className="rounded-lg bg-arena-bg border border-arena-border-light p-2 sm:p-3">
                <p className="font-bold text-base sm:text-lg m-0">{myStats.quizDays}</p>
                <p className="text-arena-muted m-0">Quiz-Tage</p>
              </div>
              <div className="rounded-lg bg-arena-bg border border-arena-border-light p-2 sm:p-3">
                <p className="font-bold text-base sm:text-lg m-0">{myStats.treffpunktDays}</p>
                <p className="text-arena-muted m-0">Treffpunkt</p>
              </div>
            </div>
          </section>
        )}

        {/* Regeln */}
        <section className="card flex-shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2 m-0">
            So sammelst du Lesezeichen
          </h2>
          <p className="text-arena-muted text-sm m-0 mt-3">
            Lesezeichen sind deine Belohnung für Aktivität auf BuchArena. Sammle so viele wie möglich!
          </p>
          <div className="flex flex-col gap-2 mt-2">
            {LESEZEICHEN_RULES.map((rule) => {
              const IconComponent = REASON_ICONS[rule.reason] || BookmarkIcon;
              return (
                <div
                  key={rule.reason}
                  className="grid max-sm:grid-cols-[auto_1fr] sm:flex sm:items-start gap-2 sm:gap-3 rounded-xl border border-arena-border-light bg-white px-3 py-2 sm:px-4 sm:py-3 hover:border-arena-blue hover:shadow-xs transition-all duration-200"
                >
                  <div className="max-sm:row-span-2 sm:flex-shrink-0 mt-0.5">
                    <IconComponent className="h-6 w-6 text-arena-blue" />
                  </div>
                  <div className="min-w-0 sm:flex-1">
                    <p className="font-semibold text-sm sm:text-base m-0">{rule.label}</p>
                    <p className="text-arena-muted text-xs sm:text-sm m-0 mt-0.5">{rule.description}</p>
                  </div>
                  <span className="badge bg-yellow-50 text-yellow-800 border border-yellow-200/50 whitespace-nowrap text-xs max-sm:justify-self-end sm:flex-shrink-0">
                    {rule.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Highscores */}
        <section className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h2 className="text-lg font-semibold flex items-center gap-2 flex-shrink-0">
            Rangliste
          </h2>

          {loggedIn && myStats && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none flex-shrink-0">
              <input
                type="checkbox"
                checked={myStats.hideFromHighscores}
                onChange={toggleHideFromHighscores}
                disabled={hideSaving}
                className="accent-arena-blue w-4 h-4"
              />
              <span className={hideSaving ? "text-arena-muted" : ""}>
                Ich möchte nicht in den Highscores auftauchen
              </span>
            </label>
          )}

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
                let rankContent: React.ReactNode = `${i + 1}.`;
                if (i === 0) rankContent = <TrophyIcon className="h-5 w-5 text-yellow-600 mx-auto" />;
                if (i === 1) rankContent = <TrophyIcon className="h-5 w-5 text-slate-400 mx-auto" />;
                if (i === 2) rankContent = <TrophyIcon className="h-5 w-5 text-amber-700 mx-auto" />;

                return (
                  <div
                    key={`${entry.username}-${i}`}
                    className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 min-w-0 hover:shadow-xs transition-all duration-200 ${
                      isMe
                        ? "bg-yellow-50 border-yellow-300"
                        : i === 0
                          ? "bg-yellow-50/50 border-yellow-200"
                          : i === 1
                            ? "bg-slate-50 border-slate-200"
                            : i === 2
                              ? "bg-amber-50/50 border-amber-200"
                              : "bg-white border-arena-border-light"
                    }`}
                  >
                    <span className="font-bold text-base w-8 text-center flex-shrink-0 flex items-center justify-center">
                      {rankContent}
                    </span>
                    <span className={`flex-1 font-medium truncate ${isMe ? "text-arena-blue font-bold" : ""}`}>
                      {entry.displayName}
                      {isMe && <span className="text-xs text-arena-muted ml-1">(du)</span>}
                    </span>
                    <div className="flex items-center gap-1 font-bold text-arena-blue whitespace-nowrap">
                      <BookmarkIcon className="h-4 w-4 text-arena-blue" />
                      <span>{entry.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
