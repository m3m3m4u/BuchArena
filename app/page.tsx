"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT, type LoggedInAccount } from "@/lib/client-account";
import { extractYouTubeId } from "@/lib/bucharena-types";
import { fetchUnreadCountShared } from "@/lib/client-unread-count";
import { 
  BookmarkIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  BookOpenIcon, 
  ChatBubbleLeftRightIcon, 
  AcademicCapIcon, 
  UserIcon, 
  HeartIcon, 
  EnvelopeOpenIcon, 
  SparklesIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ShareIcon
} from "@heroicons/react/24/outline";

type BuchDerWoche = { title: string; author: string; speaker?: string; youtubeUrl: string; buyUrl: string; active?: boolean; bookId?: string; authorUsername?: string; speakerUsername?: string };
type Stats = { bookCount: number; authorCount: number; bloggerCount: number; speakerCount: number; testleserCount: number; lektorenCount: number; verlageCount: number };



export default function HomePage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [lesezeichen, setLesezeichen] = useState<{ total: number; loginDays: number } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [bdw, setBdw] = useState<BuchDerWoche | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isSavingNewsletter, setIsSavingNewsletter] = useState(false);

  const closeVideo = useCallback(() => setShowVideo(false), []);

  useEffect(() => {
    if (!showVideo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeVideo(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showVideo, closeVideo]);

  useEffect(() => {
    const sync = () => setAccount(getStoredAccount());
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Dashboard data loading
  useEffect(() => {
    if (!account) return;
    fetch("/api/lesezeichen").then(r => r.json()).then(d => setLesezeichen(d)).catch(() => {});
    fetchUnreadCountShared(false).then((count) => setUnreadMessages(count)).catch(() => {});
    fetch("/api/profile/get", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(r => r.json()).then(d => setNewsletterOptIn(!!d.newsletterOptIn)).catch(() => {});
  }, [account]);

  // Public data (stats + BdW)
  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(d => setStats(d)).catch(() => {});
    fetch("/api/buch-der-woche", { cache: "no-store" }).then(r => r.json()).then(d => setBdw(d.buchDerWoche ?? null)).catch(() => {});
  }, []);

  // Logged-in: Dashboard
  if (account) {
    return (
      <main className="top-centered-main">
        {/* Greeting */}
        <section className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-arena-border-light">
            {/* Left: Begrüßung */}
            <div className="flex items-center gap-4 md:col-span-1">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-arena-blue to-arena-blue-light text-white text-2xl font-bold shrink-0">
                {account.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-sans text-xl font-bold text-arena-blue m-0">Hallo, {account.username}!</h1>
                <p className="font-sans text-arena-muted text-sm m-0 mt-0.5">Willkommen zurück in der BuchArena</p>
              </div>
            </div>
            {/* Right: Werbefläche */}
            <a
              href="https://beyond-books.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 md:pl-4 no-underline text-inherit group md:col-span-2"
            >
              <img src="/beyondbooks.png" alt="BeyondBooks" className="h-16 w-auto shrink-0 rounded" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-arena-muted m-0 mb-0.5">Empfehlung der BuchArena</p>
                <p className="font-sans text-xs text-arena-muted m-0 leading-snug group-hover:text-arena-blue transition-colors">
                  BeyondBooks begleitet dein Buch von der ersten Idee bis zur Veröffentlichung – alles an einem Ort. Vernetze dich mit Dienstleistern für Lektorat, Cover, Satz und mehr, und finde die richtigen Menschen für dein Buch.
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="w-full max-w-[1100px] grid grid-cols-3 gap-3 mt-3 max-sm:grid-cols-1 overflow-x-clip">
          <Link href="/lesezeichen" className="no-underline text-inherit group">
            <div className="card-base p-5 flex flex-col items-center dashboard-stat-card hover:border-arena-blue">
              <BookmarkIcon className="h-6 w-6 text-arena-blue mb-2 transition-transform group-hover:scale-110" />
              <p className="font-sans text-2xl font-bold m-0 text-arena-blue">{lesezeichen?.total ?? "–"}</p>
              <p className="font-sans text-arena-muted text-xs font-semibold uppercase tracking-wider mt-1.5 m-0">Lesezeichen</p>
            </div>
          </Link>
          <Link href="/nachrichten" className="no-underline text-inherit group">
            <div className="card-base p-5 flex flex-col items-center dashboard-stat-card hover:border-arena-blue">
              <EnvelopeIcon className="h-6 w-6 text-arena-blue mb-2 transition-transform group-hover:scale-110" />
              <p className="font-sans text-2xl font-bold m-0 text-arena-blue">{unreadMessages}</p>
              <p className="font-sans text-arena-muted text-xs font-semibold uppercase tracking-wider mt-1.5 m-0">
                {unreadMessages === 1 ? "Neue Nachricht" : "Neue Nachrichten"}
              </p>
            </div>
          </Link>
          <Link href="/lesezeichen" className="no-underline text-inherit group">
            <div className="card-base p-5 flex flex-col items-center dashboard-stat-card hover:border-arena-blue">
              <CalendarIcon className="h-6 w-6 text-arena-blue mb-2 transition-transform group-hover:scale-110" />
              <p className="font-sans text-2xl font-bold m-0 text-arena-blue">{lesezeichen?.loginDays ?? "–"}</p>
              <p className="font-sans text-arena-muted text-xs font-semibold uppercase tracking-wider mt-1.5 m-0">Login-Tage</p>
            </div>
          </Link>
        </section>

        {/* Buchzirkel Fading-Banner */}
        <BuchzirkelBanner />

        {/* Newsletter Opt-In */}
        <section className="card mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-sans text-lg font-bold text-arena-blue m-0 flex items-center gap-2">
                <EnvelopeOpenIcon className="h-5 w-5 text-arena-blue flex-shrink-0" />
                Newsletter
              </h2>
              <p className="font-sans text-arena-muted text-sm m-0 mt-1.5">Erhalte Neuigkeiten und Updates per E-Mail.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={newsletterOptIn}
              disabled={isSavingNewsletter}
              style={{
                width: 48, height: 26, borderRadius: 13, border: "none",
                background: newsletterOptIn ? "var(--color-arena-blue)" : "#ccc",
                position: "relative", cursor: "pointer", flexShrink: 0,
                transition: "background 0.2s",
              }}
              onClick={async () => {
                setIsSavingNewsletter(true);
                const newVal = !newsletterOptIn;
                try {
                  const res = await fetch("/api/profile/newsletter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newsletterOptIn: newVal }),
                  });
                  if (res.ok) setNewsletterOptIn(newVal);
                } catch { /* ignore */ } finally {
                  setIsSavingNewsletter(false);
                }
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: newsletterOptIn ? 24 : 3,
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
        </section>

        {/* Quick Links */}
        <section className="card mt-3">
          <h2 className="font-sans text-lg font-bold text-arena-blue m-0 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-arena-blue flex-shrink-0" />
            Schnellzugriff
          </h2>
          <div className="grid grid-cols-2 gap-2 mt-3 max-sm:grid-cols-1">
            <Link href="/buecher" className="card-base flex items-center gap-3 px-4 py-3 no-underline text-inherit hover:border-arena-blue hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <BookOpenIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
              <div>
                <p className="font-sans font-bold m-0 text-[0.95rem] text-arena-blue">Bücher entdecken</p>
                <p className="font-sans text-arena-muted text-xs m-0">Stöbere durch alle Bücher</p>
              </div>
            </Link>
            <Link href="/diskussionen" className="card-base flex items-center gap-3 px-4 py-3 no-underline text-inherit hover:border-arena-blue hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
              <div>
                <p className="font-sans font-bold m-0 text-[0.95rem] text-arena-blue">Treffpunkt</p>
                <p className="font-sans text-arena-muted text-xs m-0">Diskutiere mit der Community</p>
              </div>
            </Link>
            <Link href="/quiz" className="card-base flex items-center gap-3 px-4 py-3 no-underline text-inherit hover:border-arena-blue hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <AcademicCapIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
              <div>
                <p className="font-sans font-bold m-0 text-[0.95rem] text-arena-blue">Quiz spielen</p>
                <p className="font-sans text-arena-muted text-xs m-0">Teste dein Buchwissen</p>
              </div>
            </Link>
            <Link href="/profil" className="card-base flex items-center gap-3 px-4 py-3 no-underline text-inherit hover:border-arena-blue hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <UserIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
              <div>
                <p className="font-sans font-bold m-0 text-[0.95rem] text-arena-blue">Mein Profil</p>
                <p className="font-sans text-arena-muted text-xs m-0">Profil bearbeiten</p>
              </div>
            </Link>
            <Link href="/buchempfehlung" className="card-base flex items-center gap-3 px-4 py-3 no-underline text-inherit hover:border-arena-blue hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <HeartIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
              <div>
                <p className="font-sans font-bold m-0 text-[0.95rem] text-arena-blue">Buchempfehlung</p>
                <p className="font-sans text-arena-muted text-xs m-0">Empfiehl dein Lieblingsbuch</p>
              </div>
            </Link>
            <Link href="/nachrichten" className="card-base flex items-center gap-3 px-4 py-3 no-underline text-inherit hover:border-arena-blue hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <EnvelopeIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
              <div>
                <p className="font-sans font-bold m-0 text-[0.95rem] text-arena-blue">Nachrichten</p>
                <p className="font-sans text-arena-muted text-xs m-0">Deine Unterhaltungen</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Buch der Woche */}
        <section className="card mt-3">
          {bdw && bdw.title ? (
            <div>
              <p className="font-sans text-lg font-bold text-arena-blue m-0 flex items-center gap-2 flex-wrap">
                <span>Buch der Woche:</span>
                <span className="font-normal">{bdw.bookId ? <Link href={`/buch/${bdw.bookId}`} className="font-sans hover:underline text-arena-blue font-bold">{bdw.title}</Link> : bdw.title} <span className="font-normal text-arena-muted">von {bdw.authorUsername ? <Link href={`/autor/${bdw.authorUsername}`} className="hover:underline text-arena-text font-semibold">{bdw.author}</Link> : bdw.author}</span>{bdw.speaker && <span className="font-normal text-arena-muted"> · Sprecher: {bdw.speakerUsername ? <Link href={`/sprecher/${bdw.speakerUsername}`} className="hover:underline text-arena-text font-semibold">{bdw.speaker}</Link> : bdw.speaker}</span>}</span>
                {bdw.buyUrl && (
                  <a href={bdw.buyUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary btn-sm inline-flex items-center">
                    HIER ERHÄLTLICH *
                  </a>
                )}
              </p>
              {bdw.buyUrl && <p className="font-sans text-xs text-arena-muted mt-1.5">* Affiliate-Link</p>}
              {bdw.youtubeUrl && (() => {
                const ytId = extractYouTubeId(bdw.youtubeUrl);
                return ytId ? (
                  <div className="mt-3 mx-auto relative w-full" style={{ maxWidth: "80%", paddingBottom: "45%" }}>
                    <iframe
                      className="absolute inset-0 w-full h-full rounded-lg"
                      src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                      title={bdw.title}
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div>
              <h2 className="font-sans text-lg font-bold text-arena-blue m-0">Buch der Woche</h2>
              <p className="font-sans font-semibold text-arena-muted m-0 mt-2">Bald verfügbar</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  // Guest: Landing page
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-linear-to-br from-arena-blue via-arena-blue-mid to-arena-blue-light px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-[1100px]">
          <img
            src="/logo.png"
            alt="BuchArena Logo"
            width={140}
            height={140}
            className="mx-auto mb-6 block rounded-full"
          />
          <h1 className="font-sans mb-2 text-[2.4rem] font-extrabold leading-tight max-sm:text-[1.7rem]">
            Willkommen in der <span className="text-arena-yellow">BuchArena</span>
          </h1>
          <p className="font-sans mb-4 text-lg opacity-90 max-sm:text-base">Die Community für Autoren, Sprecher, Lektoren, (Test)Leser, Verlage und Leser</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/auth" className="btn btn-primary rounded-lg px-5 py-2.5 text-base font-sans">
              Kostenlos registrieren
            </Link>
          </div>

          <button
            onClick={() => setShowVideo(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/25 font-sans"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-arena-yellow"><path d="M8 5v14l11-7z"/></svg>
            Erklärvideo: Was ist die BuchArena?
          </button>

          <div className="mt-10 border-t border-white/20 pt-6">
            <p className="font-sans mb-4 text-sm opacity-80">
              Ein Projekt von{" "}
              <a href="https://lernarena.org" target="_blank" rel="noopener noreferrer" className="text-arena-yellow hover:underline font-semibold font-sans">lernarena.org</a>
              {" "}und{" "}
              <a href="https://www.martinamedia.at/" target="_blank" rel="noopener noreferrer" className="text-arena-yellow hover:underline font-semibold font-sans">martinamedia.at</a>
            </p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              <a href="https://lernarena.org" target="_blank" rel="noopener noreferrer">
                <img src="/logolang.png" alt="LernArena" width={240} height={75} />
              </a>
              <a href="https://www.martinamedia.at/" target="_blank" rel="noopener noreferrer">
                <img src="/logoohnebgweiss.png" alt="martinamedia" width={192} height={60} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1100px] px-4 py-12 text-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="card-base p-6 text-left hover:border-arena-blue hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-start">
            <div className="p-3 bg-arena-blue/5 rounded-xl text-arena-blue flex-shrink-0">
              <BookOpenIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-arena-blue mb-1">Bücher &amp; Autoren</h3>
              <p className="font-sans m-0 text-sm leading-relaxed text-arena-muted">
                Präsentiere dein Buch mit Cover, Beschreibung und Leseprobe. Stöbere durch Bücher aller Genres und lerne die Autorinnen und Autoren dahinter kennen.
              </p>
            </div>
          </div>
          <div className="card-base p-6 text-left hover:border-arena-blue hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-start">
            <div className="p-3 bg-arena-blue/5 rounded-xl text-arena-blue flex-shrink-0">
              <ChatBubbleLeftRightIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-arena-blue mb-1">Treffpunkt &amp; Nachrichten</h3>
              <p className="font-sans m-0 text-sm leading-relaxed text-arena-muted">
                Diskutiere mit der Community über Bücher, Schreibtipps und mehr. Schreibe anderen Mitgliedern direkte Nachrichten.
              </p>
            </div>
          </div>
          <div className="card-base p-6 text-left hover:border-arena-blue hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-start">
            <div className="p-3 bg-arena-blue/5 rounded-xl text-arena-blue flex-shrink-0">
              <ShareIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-arena-blue mb-1">Social-Media-Tools</h3>
              <p className="font-sans m-0 text-sm leading-relaxed text-arena-muted">
                Erstelle professionelle Beiträge und Reels für Instagram, TikTok &amp; Co. – mit Vorlagen, Musik und Video-Export direkt im Browser.
              </p>
            </div>
          </div>
          <div className="card-base p-6 text-left hover:border-arena-blue hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-start">
            <div className="p-3 bg-arena-blue/5 rounded-xl text-arena-blue flex-shrink-0">
              <AcademicCapIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-arena-blue mb-1">Quiz &amp; Buchempfehlung</h3>
              <p className="font-sans m-0 text-sm leading-relaxed text-arena-muted">
                Teste dein Buchwissen in verschiedenen Spielmodi oder lass dir anhand deiner Vorlieben das perfekte Buch empfehlen.
              </p>
            </div>
          </div>
          <div className="card-base p-6 text-left hover:border-arena-blue hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-start">
            <div className="p-3 bg-arena-blue/5 rounded-xl text-arena-blue flex-shrink-0">
              <UserGroupIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-arena-blue mb-1">Sprecher, Testleser &amp; Lektoren</h3>
              <p className="font-sans m-0 text-sm leading-relaxed text-arena-muted">
                Finde Sprecherinnen und Sprecher für dein Hörbuch, Testleser für frühes Feedback oder professionelle Lektoren für den Feinschliff.
              </p>
            </div>
          </div>
          <div className="card-base p-6 text-left hover:border-arena-blue hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex gap-4 items-start">
            <div className="p-3 bg-arena-blue/5 rounded-xl text-arena-blue flex-shrink-0">
              <ArrowPathIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-arena-blue mb-1">Tauschbörse &amp; Rezensionen</h3>
              <p className="font-sans m-0 text-sm leading-relaxed text-arena-muted">
                Tausche Bücher mit anderen Mitgliedern und teile Rezensionen, Schnipsel und Leseeindrücke mit der Community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Buch der Woche */}
      {bdw && bdw.title && (
        <section className="mx-auto px-4 py-10 text-center" style={{ width: "80%", maxWidth: "1100px" }}>
          <p className="font-sans text-xl m-0 flex items-center justify-center gap-2 flex-wrap text-arena-blue font-bold">
            <span>Buch der Woche:</span>
            <span className="font-normal">{bdw.bookId ? <Link href={`/buch/${bdw.bookId}`} className="font-sans hover:underline text-arena-blue font-bold">{bdw.title}</Link> : bdw.title} <span className="font-normal text-arena-muted">von {bdw.authorUsername ? <Link href={`/autor/${bdw.authorUsername}`} className="hover:underline text-arena-text font-semibold">{bdw.author}</Link> : bdw.author}</span>{bdw.speaker && <span className="font-normal text-arena-muted"> · Sprecher: {bdw.speakerUsername ? <Link href={`/sprecher/${bdw.speakerUsername}`} className="hover:underline text-arena-text font-semibold">{bdw.speaker}</Link> : bdw.speaker}</span>}</span>
            {bdw.buyUrl && (
              <a href={bdw.buyUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary btn-sm inline-flex items-center gap-1">
                HIER ERHÄLTLICH *
              </a>
            )}
          </p>
          {bdw.buyUrl && <p className="font-sans text-xs text-arena-muted mt-1.5">* Affiliate-Link</p>}
          {bdw.youtubeUrl && (() => {
            const ytId = extractYouTubeId(bdw.youtubeUrl);
            return ytId ? (
              <div className="mt-4 relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full rounded-lg"
                  src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                  title={bdw.title}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null;
          })()}
        </section>
      )}

      {/* Statistiken */}
      {stats && (
        <section className="bg-arena-bg py-10 px-4">
          <div className="mx-auto max-w-[1100px] grid gap-4 grid-cols-2 min-[600px]:grid-cols-3 min-[900px]:grid-cols-7">
            {[
              { value: stats.bookCount, label: "Bücher" },
              { value: stats.authorCount, label: "Autoren" },
              { value: stats.bloggerCount, label: "Blogger" },
              { value: stats.speakerCount, label: "Sprecher" },
              { value: stats.testleserCount, label: "(Test)Leser" },
              { value: stats.lektorenCount, label: "Lektoren" },
              ...(stats.verlageCount > 0 ? [{ value: stats.verlageCount, label: "Verlage" }] : []),
            ].map((s) => (
              <div key={s.label} className="card-base shadow-none px-5 py-4 text-center">
                <p className="font-sans text-2xl font-bold m-0 text-arena-blue">{s.value}</p>
                <p className="font-sans text-arena-muted text-sm m-0 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Video-Overlay */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeVideo}
        >
          <div
            className="relative flex flex-col items-end"
            style={{ width: "min(360px, 90vw)", height: "min(640px, 80vh)", maxWidth: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeVideo}
              className="mb-2 text-3xl leading-none text-white hover:text-arena-yellow"
              aria-label="Schließen"
            >
              &times;
            </button>
            <div className="relative w-full flex-1 overflow-hidden rounded-xl">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube-nocookie.com/embed/5zNHyz-dgNU?autoplay=1"
                title="Erklärvideo: Was ist die BuchArena?"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Buchzirkel Fading Banner ──────────────────────────────────────────────

type ZirkelInfo = { _id: string; typ: "testleser" | "betaleser"; titel: string; veranstalterUsername: string };

function BuchzirkelBanner() {
  const [zirkel, setZirkel] = useState<ZirkelInfo[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch("/api/buchzirkel/list?status=bewerbung&limit=8")
      .then((r) => r.json())
      .then((d: { zirkel?: ZirkelInfo[] }) => {
        if (d.zirkel && d.zirkel.length > 0) setZirkel(d.zirkel);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (zirkel.length < 2) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % zirkel.length);
        setVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, [zirkel]);

  if (zirkel.length === 0) return null;

  const z = zirkel[index];
  const label = z.typ === "betaleser" ? "Betaleser-Zirkel" : "Testleser-Zirkel";

  return (
    <section className="mt-3 w-full max-w-[1100px]">
      <a
        href="/buchzirkel"
        className="no-underline block rounded-xl border border-arena-border-light bg-gradient-to-r from-yellow-50 to-white px-5 py-3 hover:border-arena-yellow transition-colors"
      >
        <div
          className="flex items-center gap-3"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          <BookOpenIcon className="h-6 w-6 text-arena-blue flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold m-0 text-arena-text truncate">
              {z.veranstalterUsername} lädt ein: {z.titel}
            </p>
            <p className="text-xs text-arena-muted m-0 mt-0.5">
              {label} · Bewerbungen offen
            </p>
          </div>
          <span className="ml-auto text-xs text-arena-muted flex-shrink-0">Alle Buchzirkel →</span>
        </div>
      </a>
    </section>
  );
}
