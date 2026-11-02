"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  VideoCameraIcon,
  CalendarDaysIcon,
  BookmarkIcon,
  TrophyIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { extractYouTubeId, isYouTubeShort } from "@/lib/bucharena-types";

type Submission = {
  id: string;
  title: string;
  author: string;
  speaker?: string;
  youtubeUrl: string;
  buyUrl?: string;
  bookId?: string;
  status: string;
  timesSelected: number;
  lastSelectedAt?: string;
  createdAt: string;
  weight: number;
};

type MyBook = {
  id: string;
  title: string;
  ownerUsername: string;
  presentationVideoUrl: string;
  buyUrl: string;
  coverImageUrl: string;
};

type CycleInfo = {
  currentCycleKey: string;
  formattedNextDraw: string;
  nextDrawDateStr: string;
};

type BuchDerWocheSectionProps = {
  loggedIn: boolean;
  userBookmarks: number;
};

export default function BuchDerWocheSection({ loggedIn, userBookmarks }: BuchDerWocheSectionProps) {
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [myBooks, setMyBooks] = useState<MyBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formular-State
  const [selectedBookId, setSelectedBookId] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // YouTube Live-Check
  const previewYtId = extractYouTubeId(youtubeUrl);
  const isShort = isYouTubeShort(youtubeUrl);

  const loadData = useCallback(() => {
    setIsLoading(true);
    fetch("/api/buch-der-woche/bewerbung")
      .then((r) => r.json())
      .then((data) => {
        if (data.cycleInfo) setCycleInfo(data.cycleInfo);
        if (typeof data.totalSubmissionsCount === "number") setTotalSubmissions(data.totalSubmissionsCount);
        if (Array.isArray(data.mySubmissions)) {
          setMySubmissions(data.mySubmissions);
          // Wenn noch keine Bewerbungen vorliegen, Formular direkt geöffnet lassen
          if (data.mySubmissions.length === 0) {
            setShowForm(true);
          }
        }
        if (Array.isArray(data.myBooks)) setMyBooks(data.myBooks);
        if (data.accountDisplayName && !author) {
          setAuthor(data.accountDisplayName);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [author]);

  useEffect(() => {
    loadData();
  }, [loggedIn, loadData]);

  // Buch aus eigenen Büchern auswählen
  function handleSelectOwnBook(bookId: string) {
    setSelectedBookId(bookId);
    if (!bookId) return;

    const book = myBooks.find((b) => b.id === bookId);
    if (!book) return;

    setTitle(book.title || "");
    if (book.ownerUsername && !author) {
      setAuthor(book.ownerUsername);
    }
    if (book.presentationVideoUrl) {
      setYoutubeUrl(book.presentationVideoUrl);
    }
    if (book.buyUrl) {
      setBuyUrl(book.buyUrl);
    }
  }

  // Absenden
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim()) {
      setErrorMsg("Bitte gib den Buchtitel ein.");
      return;
    }
    if (!author.trim()) {
      setErrorMsg("Bitte gib den Namen des Autors ein.");
      return;
    }
    if (!youtubeUrl.trim() || !previewYtId) {
      setErrorMsg("Bitte gib einen gültigen YouTube-Link zu einem Video oder Reel/Short ein.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/buch-der-woche/bewerbung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          speaker,
          youtubeUrl,
          buyUrl,
          bookId: selectedBookId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Fehler beim Einreichen.");
      } else {
        setSuccessMsg(data.message || "Bewerbung erfolgreich eingereicht!");
        // Formular zurücksetzen
        setTitle("");
        setSpeaker("");
        setYoutubeUrl("");
        setBuyUrl("");
        setSelectedBookId("");
        loadData();
      }
    } catch {
      setErrorMsg("Verbindungsfehler beim Absenden der Bewerbung.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Löschen
  async function handleDelete(id: string) {
    if (!window.confirm("Möchtest du diese Bewerbung wirklich aus dem Lostopf zurückziehen?")) {
      return;
    }

    try {
      const res = await fetch("/api/buch-der-woche/bewerbung", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      // ignore
    }
  }

  return (
    <section id="buch-der-woche" className="card flex-shrink-0 scroll-mt-6">
      {/* Kopfbereich */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <TrophyIcon className="h-6 w-6" />
            </span>
            <h2 className="font-sans text-2xl font-extrabold text-arena-blue m-0">
              Buch der Woche
            </h2>
          </div>
          <p className="font-sans text-arena-muted text-sm m-0 mt-1">
            Präsentiere dein Buch mit YouTube-Video oder Reel eine ganze Woche lang auf der Startseite und im Dashboard!
          </p>
        </div>

        {cycleInfo && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-arena-blue">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>Nächste Ziehung: {cycleInfo.formattedNextDraw}</span>
          </div>
        )}
      </div>

      {/* Erklärungskarte */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-50/70 via-yellow-50/40 to-slate-50 border border-amber-200/70">
        <h3 className="font-sans font-bold text-base text-arena-blue flex items-center gap-2 m-0">
          <SparklesIcon className="h-5 w-5 text-amber-600" />
          So funktioniert die Bewerbung & automatische Auslosung
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs sm:text-sm text-slate-700">
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/80 border border-amber-100">
            <div className="p-1 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">
              <VideoCameraIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-arena-blue m-0">1. Nur mit YouTube-Video</p>
              <p className="text-arena-muted text-xs m-0 mt-0.5">
                Trailer, Buchvorstellung oder <strong>YouTube Reel / Short</strong>. Das Video wird prominent eingebettet.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/80 border border-amber-100">
            <div className="p-1 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">
              <CalendarDaysIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-arena-blue m-0">2. Immer Sonntag ab 18:00 Uhr</p>
              <p className="text-arena-muted text-xs m-0 mt-0.5">
                Das System wählt jeden Sonntag ab 18 Uhr vollautomatisch das neue Buch der Woche aus allen Bewerbungen aus.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/80 border border-amber-100">
            <div className="p-1 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">
              <BookmarkIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-arena-blue m-0">3. Deine Lesezeichen zählen</p>
              <p className="text-arena-muted text-xs m-0 mt-0.5">
                <strong>Mehr Lesezeichen = höhere Gewinnchance!</strong> Bereits ausgewählte Bücher erhalten eine niedrigere Chance, damit alle dran kommen.
              </p>
            </div>
          </div>
        </div>

        {loggedIn && (
          <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-arena-blue font-semibold">
              <BookmarkIcon className="h-4 w-4 text-amber-600" />
              <span>Dein aktueller Stand: <strong>{userBookmarks} Lesezeichen</strong> im Lostopf!</span>
            </div>
            <span className="text-arena-muted">
              Tipp: Täglich einloggen, Quiz spielen und im Treffpunkt mitmachen für noch mehr Chancen.
            </span>
          </div>
        )}
      </div>

      {/* Nicht eingeloggt: Hinweis */}
      {!loggedIn && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="font-sans font-semibold text-arena-blue m-0">
            Möchtest du dein Buch als „Buch der Woche“ ins Rennen schicken?
          </p>
          <p className="text-xs text-arena-muted m-0 mt-1">
            Melde dich jetzt an oder registriere dich kostenlos, um deine Bücher einzureichen und Lesezeichen als Gewinnlose zu sammeln.
          </p>
          <div className="mt-3">
            <Link href="/auth" className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
              Jetzt anmelden / registrieren
            </Link>
          </div>
        </div>
      )}

      {/* Eingeloggt: Eigene Bewerbungen & Formular */}
      {loggedIn && (
        <div className="mt-4 flex flex-col gap-4">
          {/* Eigene eingereichte Bücher */}
          {mySubmissions.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <h4 className="font-sans font-bold text-base text-arena-blue m-0 flex items-center gap-1.5">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                  Deine eingereichten Bücher ({mySubmissions.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowForm(!showForm)}
                  className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs"
                >
                  <PlusIcon className="h-4 w-4" />
                  {showForm ? "Formular schließen" : "Weiteres Buch bewerben"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mySubmissions.map((sub) => {
                  const subYtId = extractYouTubeId(sub.youtubeUrl);
                  const isWon = sub.timesSelected > 0;
                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl border border-arena-border-light bg-white hover:border-arena-blue transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-sans font-bold text-sm text-arena-blue m-0 leading-snug">
                            {sub.title}
                          </h5>
                          {isWon ? (
                            <span className="badge bg-amber-100 text-amber-800 border-amber-300 text-[10px] shrink-0 font-bold">
                              ★ {sub.timesSelected}x gewonnen
                            </span>
                          ) : (
                            <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0 font-semibold">
                              ● Im Lostopf
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-arena-muted m-0 mt-0.5">
                          Autor: <strong className="text-slate-700">{sub.author}</strong>
                          {sub.speaker && <span> · Sprecher: {sub.speaker}</span>}
                        </p>

                        {/* YouTube Vorschau-Button */}
                        {sub.youtubeUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <a
                              href={sub.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-arena-blue hover:underline inline-flex items-center gap-1"
                            >
                              <VideoCameraIcon className="h-3.5 w-3.5 text-red-600" />
                              <span>YouTube-Video öffnen</span>
                              <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-60" />
                            </a>
                            {isYouTubeShort(sub.youtubeUrl) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold border border-red-200">
                                Reel / Short
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-arena-muted">
                          Gewinn-Punkte: <strong className="text-arena-blue">{sub.weight}</strong>
                          {isWon && <span className="text-amber-700 text-[10px] ml-1">(verringert)</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(sub.id)}
                          className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 text-[11px] p-1 rounded hover:bg-red-50 transition-colors"
                          title="Bewerbung zurückziehen"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          <span>Entfernen</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bewerbungs-Formular */}
          {showForm && (
            <div className="p-4 rounded-xl border border-arena-border-light bg-slate-50/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-sans font-bold text-base text-arena-blue m-0 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-arena-blue" />
                  {mySubmissions.length > 0 ? "Weiteres Buch bewerben" : "Jetzt Buch einreichen"}
                </h4>
                {mySubmissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs text-arena-muted hover:text-slate-700"
                  >
                    Abbrechen
                  </button>
                )}
              </div>

              {/* Schnellauswahl aus bestehenden Büchern */}
              {myBooks.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aus deinen hochgeladenen Büchern übernehmen (optional):
                  </label>
                  <select
                    className="input-base w-full text-sm bg-white"
                    value={selectedBookId}
                    onChange={(e) => handleSelectOwnBook(e.target.value)}
                  >
                    <option value="">– Manuell eingeben oder Buch wählen –</option>
                    {myBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Buchtitel <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-base w-full text-sm bg-white"
                      placeholder="z. B. Im Schatten des Mondes"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Autor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-base w-full text-sm bg-white"
                      placeholder="z. B. Anna Müller"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sprecher (optional)
                    </label>
                    <input
                      type="text"
                      className="input-base w-full text-sm bg-white"
                      placeholder="Name des Hörbuch-Sprechers (falls vorhanden)"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kauf- / Buch-Link (optional)
                    </label>
                    <input
                      type="url"
                      className="input-base w-full text-sm bg-white"
                      placeholder="https://... (Shop-, Verlags- oder Amazon-Link)"
                      value={buyUrl}
                      onChange={(e) => setBuyUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    YouTube-Link (Video oder Reel / Short) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    className="input-base w-full text-sm bg-white"
                    placeholder="https://www.youtube.com/watch?v=... oder https://youtube.com/shorts/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-arena-muted mt-1 m-0">
                    Buchtrailer, Lesungsvideo, Vorstellung oder vertikales YouTube-Short / Reel.
                  </p>
                </div>

                {/* Live Video Preview */}
                {previewYtId && (
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-2">
                      <CheckIcon className="h-4 w-4" />
                      <span>Gültiges YouTube-{isShort ? "Reel / Short" : "Video"} erkannt!</span>
                    </div>

                    <div
                      className={`mx-auto relative rounded overflow-hidden shadow-xs ${
                        isShort ? "w-[200px]" : "w-full max-w-[360px]"
                      }`}
                      style={{ paddingBottom: isShort ? "355px" : "200px" }}
                    >
                      <iframe
                        className="absolute inset-0 w-full h-full rounded"
                        src={`https://www.youtube-nocookie.com/embed/${previewYtId}`}
                        title="Vorschau"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !author.trim() || !previewYtId}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                  >
                    <TrophyIcon className="h-4 w-4" />
                    <span>{isSubmitting ? "Wird eingereicht …" : "Bewerbung absenden"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
