"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InformationCircleIcon, LightBulbIcon } from "@heroicons/react/24/solid";

const socialIcons: Record<string, React.ReactNode> = {
  intro: (<InformationCircleIcon className="h-5 w-5" />),
  instagram: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2a.88.88 0 1 1 0 1.75.88.88 0 0 1 0-1.75Z"/></svg>),
  facebook: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99h-2.54V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>),
  linkedin: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>),
  tiktok: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6a2.6 2.6 0 0 1 2.6-2.6c.27 0 .53.04.78.12V9.6a5.82 5.82 0 0 0-.78-.05 5.73 5.73 0 0 0-5.73 5.73 5.73 5.73 0 0 0 5.73 5.72c3.16 0 5.73-2.56 5.73-5.72V9.4a7.33 7.33 0 0 0 4.28 1.37V7.68a4.28 4.28 0 0 1-3.27-1.86Z"/></svg>),
  youtube: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>),
  pinterest: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.64 19.32c-.1-.87-.18-2.2.04-3.15l1.6-6.76s-.4-.82-.4-2.03c0-1.9 1.1-3.32 2.48-3.32 1.17 0 1.73.88 1.73 1.93 0 1.17-.75 2.93-1.13 4.56-.32 1.36.68 2.47 2.02 2.47 2.42 0 4.28-2.55 4.28-6.24 0-3.26-2.35-5.54-5.7-5.54-3.88 0-6.16 2.91-6.16 5.92 0 1.17.45 2.43 1.02 3.12.11.14.13.26.09.4l-.38 1.55c-.06.25-.2.3-.46.18-1.72-.8-2.8-3.32-2.8-5.34C4.57 5.9 7.66 3 12.36 3c4.95 0 8.8 3.53 8.8 8.24 0 4.91-3.1 8.87-7.4 8.87-1.44 0-2.8-.75-3.27-1.64l-.89 3.39c-.32 1.24-1.19 2.79-1.78 3.74A10 10 0 1 0 12 2Z"/></svg>),
  reddit: (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M14.24 15.6c.16.16.16.42 0 .58a4.78 4.78 0 0 1-2.72.76 4.78 4.78 0 0 1-2.72-.76.41.41 0 0 1 0-.58.41.41 0 0 1 .58 0c.5.37 1.3.6 2.14.6s1.64-.23 2.14-.6a.41.41 0 0 1 .58 0ZM9.5 12.8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5.91 11.37c.03.17.04.34.04.52 0 2.67-3.1 4.83-6.93 4.83S4.1 16.56 4.1 13.89c0-.18.01-.35.04-.52a1.75 1.75 0 0 1-.68-1.37 1.75 1.75 0 0 1 2.93-1.29 8.58 8.58 0 0 1 4.67-1.5l.88-4.14a.3.3 0 0 1 .36-.24l2.93.62a1.23 1.23 0 0 1 2.28.6 1.23 1.23 0 0 1-1.23 1.23 1.23 1.23 0 0 1-1.21-1.05l-2.6-.55-.79 3.72a8.55 8.55 0 0 1 4.6 1.5 1.75 1.75 0 0 1 2.93 1.29 1.75 1.75 0 0 1-.68 1.37Z"/></svg>)
};

type Platform = "intro" | "instagram" | "youtube" | "reddit" | "tiktok" | "facebook" | "pinterest" | "linkedin";
type MainTab = "social" | "musik" | "glossar" | "beitrag-tool" | "social-media-planer";

type GlossarEntry = { begriff: string; erklaerung: string; bereich: string };

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TABS: { key: Platform; label: string }[] = [
  { key: "intro", label: "Überblick" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "reddit", label: "Reddit" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "pinterest", label: "Pinterest" },
  { key: "linkedin", label: "LinkedIn" },
];

function ChecklistItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-arena-border-light bg-white p-5 space-y-2">
      <h3 className="text-base font-semibold m-0">{title}</h3>
      <div className="text-[0.93rem] leading-relaxed text-arena-muted space-y-2">{children}</div>
    </div>
  );
}

function SectionIntro({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-arena-blue/20 bg-arena-blue/5 p-5 flex gap-4 items-start">
      <span className="text-arena-blue flex-shrink-0 mt-0.5 [&>svg]:h-7 [&>svg]:w-7">{icon}</span>
      <div className="text-[0.93rem] leading-relaxed">{text}</div>
    </div>
  );
}

const PLATFORM_LINKS: Record<string, { url: string; label: string }> = {
  instagram: { url: "https://www.instagram.com/bucharena/", label: "Hier kommst du zu unserer Instagram-Seite" },
  youtube:   { url: "https://www.youtube.com/@BuchArena", label: "Hier kommst du zu unserem YouTube-Kanal" },
  reddit:    { url: "https://www.reddit.com/user/BuchArena/", label: "Hier kommst du zu unserer Reddit-Seite" },
  tiktok:    { url: "https://www.tiktok.com/@bucharena", label: "Hier kommst du zu unserem TikTok-Account" },
  facebook:  { url: "https://www.facebook.com/BuchArena", label: "Hier kommst du zu unserer Facebook-Seite" },
  pinterest: { url: "https://at.pinterest.com/bucharena365/", label: "Hier kommst du zu unserer Pinterest-Seite" },
  linkedin:  { url: "https://www.linkedin.com/company/bucharena/", label: "Hier kommst du zu unserer LinkedIn-Seite" },
};

function PlatformLink({ platform }: { platform: string }) {
  const link = PLATFORM_LINKS[platform];
  if (!link) return null;
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 rounded-xl border border-arena-blue/20 bg-arena-blue/5 px-5 py-4 no-underline text-arena-blue font-semibold hover:bg-arena-blue/10 transition-colors">
      <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons[platform]}</span>
      <span>{link.label} →</span>
    </a>
  );
}

export default function TippsPage() {
  const [tab, setTab] = useState<Platform>("intro");
  const [mainTab, setMainTab] = useState<MainTab>("social");

  type Track = { id: string; title: string; style: string; description: string; fileUrl: string; fileName: string; fileSize: number | null; soundcloudUrl: string | null };
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  const [glossar, setGlossar] = useState<GlossarEntry[]>([]);
  const [glossarLoading, setGlossarLoading] = useState(false);
  const [glossarSearch, setGlossarSearch] = useState("");
  const [glossarKategorie, setGlossarKategorie] = useState("");
  const [glossarLetter, setGlossarLetter] = useState("");
  const [glossarOpen, setGlossarOpen] = useState<string | null>(null);

  useEffect(() => {
    if (mainTab !== "musik") return;
    setTracksLoading(true);
    fetch("/api/musik")
      .then((r) => r.json())
      .then((d: { tracks?: Track[] }) => setTracks(d.tracks ?? []))
      .catch(() => {})
      .finally(() => setTracksLoading(false));
  }, [mainTab]);

  useEffect(() => {
    if (mainTab !== "glossar" || glossar.length > 0) return;
    setGlossarLoading(true);
    fetch("/data/glossar.csv")
      .then((r) => r.text())
      .then((csv) => {
        const lines = csv.split(/\r?\n/).filter((l) => l.trim());
        const entries: GlossarEntry[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(";").map((s) => s.replace(/^"|"$/g, "").trim());
          if (parts.length >= 3 && parts[0]) {
            entries.push({ begriff: parts[0], erklaerung: parts[1], bereich: parts[2] });
          }
        }
        entries.sort((a, b) => a.begriff.localeCompare(b.begriff, "de"));
        setGlossar(entries);
      })
      .catch(() => {})
      .finally(() => setGlossarLoading(false));
  }, [mainTab, glossar.length]);

  const glossarKategorien = [...new Set(glossar.map((e) => e.bereich))].sort((a, b) => a.localeCompare(b, "de"));

  const filteredGlossar = glossar.filter((e) => {
    if (glossarLetter && !e.begriff.toUpperCase().startsWith(glossarLetter)) return false;
    if (glossarKategorie && e.bereich !== glossarKategorie) return false;
    if (glossarSearch) {
      const q = glossarSearch.toLowerCase();
      return e.begriff.toLowerCase().includes(q) || e.erklaerung.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <main className="centered-main">
      <section className="w-full max-w-[1100px] rounded-[14px] bg-white px-12 py-10 box-border max-sm:px-4 max-sm:py-6">
        {/* Haupt-Tabs */}
        <div className="flex gap-2 mb-5 border-b border-arena-border-light overflow-x-auto pb-px">
          <button
            type="button"
            className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "social"
                ? "bg-white border border-b-white border-arena-border-light text-arena-blue"
                : "bg-arena-bg text-arena-muted hover:bg-arena-border-light border border-transparent"
            }`}
            onClick={() => setMainTab("social")}
          >
            Social Media Tipps
          </button>
          <button
            type="button"
            className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "musik"
                ? "bg-white border border-b-white border-arena-border-light text-arena-blue"
                : "bg-arena-bg text-arena-muted hover:bg-arena-border-light border border-transparent"
            }`}
            onClick={() => setMainTab("musik")}
          >
            Hintergrundmusik
          </button>
          <button
            type="button"
            className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "glossar"
                ? "bg-white border border-b-white border-arena-border-light text-arena-blue"
                : "bg-arena-bg text-arena-muted hover:bg-arena-border-light border border-transparent"
            }`}
            onClick={() => setMainTab("glossar")}
          >
            Glossar
          </button>
          <button
            type="button"
            className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "beitrag-tool"
                ? "bg-white border border-b-white border-arena-border-light text-arena-blue"
                : "bg-arena-bg text-arena-muted hover:bg-arena-border-light border border-transparent"
            }`}
            onClick={() => setMainTab("beitrag-tool")}
          >
            Beitrag-Tool
          </button>
          <button
            type="button"
            className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "social-media-planer"
                ? "bg-white border border-b-white border-arena-border-light text-arena-blue"
                : "bg-arena-bg text-arena-muted hover:bg-arena-border-light border border-transparent"
            }`}
            onClick={() => setMainTab("social-media-planer")}
          >
            Social-Media-Planer
          </button>
        </div>

        <h1 className="mb-2 text-3xl font-extrabold max-sm:text-2xl">
          {mainTab === "musik" ? "Hintergrundmusik" : mainTab === "glossar" ? "Glossar für Autoren" : mainTab === "beitrag-tool" ? "Beitrag-Tool" : mainTab === "social-media-planer" ? "Social-Media-Planer" : "Support-Tipps für Autoren"}
        </h1>
        <p className="text-[0.95rem] text-arena-muted leading-relaxed mb-6">
          {mainTab === "musik"
            ? "Kostenlose MP3-Tracks für deine Videos und Reels – von BuchArena für dich bereitgestellt."
            : mainTab === "glossar"
            ? "Fachbegriffe aus der Buch- und Verlagswelt einfach erklärt – von Schreiben über Druck bis Marketing."
            : mainTab === "beitrag-tool"
            ? "Erstelle Social-Media-Posts und Videos direkt im Browser – mit Bild, Text, Rahmen, Animationen und Musik. Wir stellen euch frei nutzbare Bilder und Musik zur Verfügung."
            : mainTab === "social-media-planer"
            ? "Tool-Tipps und Empfehlungen für die Planung und Verwaltung deiner Social-Media-Inhalte."
            : "Wir übernehmen die Video-Erstellung, das Design und den Upload. Dein Job ist es, den \u201EMotor\u201C zu starten. Hier erfährst du, wie du das Beste aus jeder Plattform herausholst."}
        </p>

        {/* Plattform-Tabs (nur bei Social Media) */}
        {mainTab === "social" && (
          <div className="flex gap-1.5 flex-wrap mb-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors ${tab === t.key ? "bg-arena-blue text-white" : "bg-arena-blue/10 text-arena-text hover:bg-arena-blue/20"}`}
                onClick={() => setTab(t.key)}
              >
                <span className="flex items-center gap-2 justify-center">
                  <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{socialIcons[t.key]}</span>
                  <span>{t.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Social Media Content ── */}
        {mainTab === "social" && tab === "intro" && (
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-arena-blue/30 bg-arena-blue/5 p-6">
              <h2 className="text-lg font-semibold m-0 mb-3">Der Community-Effekt</h2>
              <p className="m-0 mb-3 text-[0.95rem] leading-relaxed">
                Der größte Fehler, den du machen kannst, ist nur deinen eigenen Beitrag zu supporten („Post &amp; Run").
              </p>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0 text-arena-blue font-bold">1.</span>
                  <div>
                    <p className="font-semibold m-0">Die Mathematik</p>
                    <p className="text-[0.9rem] text-arena-muted m-0">Wenn wir 100 Autoren sind und jeder nur sich selbst liked, hat jeder 1 Like. Wenn jeder auch die Beiträge der anderen supportet, hat jeder 100 Likes.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0 text-arena-blue font-bold">2.</span>
                  <div>
                    <p className="font-semibold m-0">Der Algorithmus</p>
                    <p className="text-[0.9rem] text-arena-muted m-0">Plattformen erkennen Nutzer, die nur online kommen, wenn es um sie selbst geht. Wer regelmäßig bei anderen interagiert, wird als „wertvolles Community-Mitglied" eingestuft – deine eigenen Beiträge werden höher gerankt.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0 text-arena-blue font-bold">3.</span>
                  <div>
                    <p className="font-semibold m-0">Nicht nur Instagram!</p>
                    <p className="text-[0.9rem] text-arena-muted m-0">Es gibt Plattformen, die für die Auffindbarkeit auf Suchmaschinen und KI-Systemen wie ChatGPT viel wichtiger sind. Deshalb: Wende die folgenden Tipps bei deinem Post an UND regelmäßig bei Posts anderer Autorinnen und Autoren.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-arena-border-light bg-white p-6">
              <h2 className="text-lg font-semibold m-0 mb-4">Wichtige Links</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a href="https://www.youtube.com/@BuchArena" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.youtube}</span>
                  <span className="font-medium text-[0.95rem]">YouTube-Kanal</span>
                </a>
                <a href="https://www.youtube.com/@BuchArena/playlists" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.youtube}</span>
                  <span className="font-medium text-[0.95rem]">YouTube Playlist</span>
                </a>
                <a href="https://www.reddit.com/user/BuchArena/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.reddit}</span>
                  <span className="font-medium text-[0.95rem]">Eure Bücher auf Reddit</span>
                </a>
                <a href="https://www.tiktok.com/@bucharena" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.tiktok}</span>
                  <span className="font-medium text-[0.95rem]">TikTok-Account</span>
                </a>
                <a href="https://www.facebook.com/BuchArena" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.facebook}</span>
                  <span className="font-medium text-[0.95rem]">Facebook-Account</span>
                </a>
                <a href="https://www.instagram.com/bucharena/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.instagram}</span>
                  <span className="font-medium text-[0.95rem]">Instagram-Account</span>
                </a>
                <a href="https://at.pinterest.com/bucharena365/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.pinterest}</span>
                  <span className="font-medium text-[0.95rem]">Pinterest-Account</span>
                </a>
                <a href="https://www.linkedin.com/company/bucharena/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="shrink-0 text-arena-blue [&>svg]:h-5 [&>svg]:w-5">{socialIcons.linkedin}</span>
                  <span className="font-medium text-[0.95rem]">LinkedIn-Seite</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Instagram ── */}
        {mainTab === "social" && tab === "instagram" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.instagram}
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Instagram bewertet Interaktionen nach einer strengen Hierarchie. Ein einfaches „Gefällt mir" ist nett, aber für den Algorithmus fast wertlos. Ein „Speichern" oder „Teilen" hingegen signalisiert: „Dieser Inhalt ist so gut, ich will ihn behalten oder meinen Freunden zeigen."</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title='1. Das „Speichern"-Fähnchen (Priorität Nr. 1)'>
              <p className="m-0"><strong>Was tun:</strong> Klicke rechts unten beim Bild auf das Lesezeichen-Symbol. Mach das bei deinem Buch und bei den Büchern der Kollegen. Erstelle dort eine eigene Kategorie für die Bücher, so bringst du kein Chaos in deine anderen gespeicherten Inhalte. Das sind nur zwei Klicks, die aber viel bewirken können.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Es kategorisiert den Post als wertvollen Content. Instagram spielt Posts mit vielen Speicherungen bevorzugt auf der „Explore Page" an fremde Leser aus.</p>
            </ChecklistItem>
            <ChecklistItem title="2. Story-Share mit Kontext">
              <p className="m-0"><strong>Was tun:</strong> Teile den Post in deiner Story. Aber: Schreibe etwas dazu! Nutze interaktive Sticker (z.&nbsp;B. eine Umfrage: „Kennt ihr das Genre?" oder einen Slider).</p>
              <p className="m-0"><strong>Der Effekt:</strong> Eine Story ohne Interaktion wird schnell weggeklickt. Wenn deine Follower auf deine Story reagieren, bewertet Instagram den ursprünglichen Post höher.</p>
            </ChecklistItem>
            <ChecklistItem title="3. Kommentieren, aber richtig">
              <p className="m-0"><strong>Was tun:</strong> Schreibe einen Satz mit mindestens 4 Wörtern. Gehe auf Details ein (Cover, Zitat).</p>
              <p className="m-0"><strong>Beispiel bei Kollegen:</strong> „Das Cover ist ja der Wahnsinn, erinnert mich total an [bekanntes Buch]!"</p>
              <p className="m-0"><strong>Der Effekt:</strong> Kurze Kommentare oder einzelne Emojis filtert Instagram oft als Bot-Spam heraus. Echte Sätze erhöhen die Verweildauer im Kommentarbereich.</p>
            </ChecklistItem>
            <PlatformLink platform="instagram" />
          </div>
        )}

        {/* ── YouTube ── */}
        {mainTab === "social" && tab === "youtube" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.youtube}
              text={<p className="m-0"><strong>Warum das hier ein „Game Changer" ist (SEO &amp; KI):</strong> YouTube gehört Google. Videos veralten nicht nach 24 Stunden, sie bleiben jahrelang suchbar. Noch wichtiger: Künstliche Intelligenzen (wie ChatGPT, Google Gemini) nutzen YouTube-Transkripte und Kommentare, um Wissen zu sammeln. Wenn jemand eine KI fragt „Welche neuen Fantasy-Bücher von kleinen Autoren sind gut?", durchsucht die KI YouTube-Daten. Wenn wir dort nicht stattfinden, existiert dein Buch für die KI nicht.</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Retention (Zuschauerdauer) ist König">
              <p className="m-0"><strong>Was tun:</strong> Schaue das Video zwingend bis zum Ende. Bei Shorts: Lass es 2–3 Mal im Loop laufen. Mach das unbedingt auch bei den Videos der anderen Autoren!</p>
              <p className="m-0"><strong>Der Effekt:</strong> Wenn du nach 5 Sekunden likst und wegklickst, signalisierst du YouTube: „Clickbait! Video ist langweilig." YouTube straft das Video sofort ab.</p>
            </ChecklistItem>
            <ChecklistItem title='2. Der „Suchmaschinen"-Kommentar'>
              <p className="m-0"><strong>Was tun:</strong> Verwende in deinem Kommentar relevante Schlüsselwörter (Keywords).</p>
              <p className="m-0"><strong>Beispiel:</strong> Statt „Super!", schreibe: „Ein toller Buchtipp für Fans von Dark Fantasy und Urban Fantasy. Die Magie-Systeme klingen spannend."</p>
              <p className="m-0"><strong>Der Effekt:</strong> Diese Wörter helfen der Google-Suche und der KI zu verstehen, worum es in dem Buch geht. Du optimierst damit aktiv die Auffindbarkeit.</p>
            </ChecklistItem>
            <ChecklistItem title="3. Erst schauen, dann liken">
              <p className="m-0"><strong>Die Regel:</strong> Gib den „Daumen hoch" erst, wenn ca. 50–70 % des Videos gelaufen sind. Sofortige Likes wirken wie Bots.</p>
            </ChecklistItem>
            <PlatformLink platform="youtube" />
          </div>
        )}

        {/* ── Reddit ── */}
        {mainTab === "social" && tab === "reddit" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.reddit}
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Reddit ist keine Social-Media-Plattform wie Instagram, sondern ein Wissensarchiv. Extrem wichtig: Reddit ist die Hauptdatenquelle für das Training von LLMs (Large Language Models). Wenn du willst, dass ChatGPT dein Buch kennt und empfiehlt, muss es auf Reddit „validiert" sein. Ein Reddit-Thread mit guter Diskussion ist für die KI ein Qualitätssiegel.</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Upvote">
              <p className="m-0"><strong>Was tun:</strong> Klicke auf den Pfeil nach oben.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Es erhöht die Sichtbarkeit im Subreddit und auf der Google-Startseite (Google zeigt Reddit-Ergebnisse inzwischen sehr weit oben an).</p>
            </ChecklistItem>
            <ChecklistItem title="2. Qualitative Diskussion (Keine Werbung!)">
              <p className="m-0"><strong>Was tun:</strong> Wenn wir dein Buch posten, fungiere als Experte, nicht als Verkäufer. Antworte auf Fragen, gib Hintergrundinformationen.</p>
              <p className="m-0"><strong>Community-Tipp:</strong> Wenn du unter dem Post eines anderen Autors kommentierst, stelle ihm eine Frage zum Buch („Wie bist du auf die Idee gekommen?"). Das kurbelt die Diskussion an.</p>
              <p className="m-0"><strong>Der Effekt:</strong> KIs scannen diese Konversationen, um den Kontext und Inhalt des Buches zu verstehen. Je mehr Text du lieferst, desto präziser kann eine KI dein Buch später empfehlen.</p>
            </ChecklistItem>
            <div className="rounded-xl border-2 border-arena-danger/30 bg-arena-danger/5 p-5">
              <h3 className="text-base font-semibold m-0 mb-2 text-arena-danger">Absolute No-Gos</h3>
              <p className="m-0 text-[0.9rem]"><strong>Brigading (Vote-Manipulation):</strong> Rufe niemals öffentlich (z.&nbsp;B. in deiner Insta-Story) dazu auf: „Geht alle auf Reddit und votet hoch!". Reddit erkennt, wenn viele User von extern kommen und nur voten. Das führt zur Löschung des Posts oder Sperrung unseres Accounts. Die Interaktion muss organisch wirken.</p>
            </div>
            <PlatformLink platform="reddit" />
          </div>
        )}

        {/* ── TikTok ── */}
        {mainTab === "social" && tab === "tiktok" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.tiktok}
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> TikTok interessiert sich nicht dafür, wer dir folgt. Es interessiert sich nur dafür: „Hält dieses Video die Leute in der App?".</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Watchtime &amp; Re-Watch">
              <p className="m-0"><strong>Was tun:</strong> Guck das Video ganz an. Wenn es vorbei ist, lass es noch einmal laufen. Das ist der wichtigste Faktor für Viralität.</p>
            </ChecklistItem>
            <ChecklistItem title='2. Der gelbe „Neu veröffentlichen"-Button'>
              <p className="m-0"><strong>Was tun:</strong> Gehe auf „Teilen" und dann auf „Neu veröffentlichen" (gelber Button).</p>
              <p className="m-0"><strong>Der Effekt:</strong> Das ist der stärkste Support. Es zeigt das Video deinen Followern, ohne dass du die Datei selbst hochladen musst (was dem Original-Algorithmus schaden würde). Reposte auch die Videos deiner Kollegen – deine Follower freuen sich über gute Buchtipps!</p>
            </ChecklistItem>
            <ChecklistItem title="3. Link kopieren">
              <p className="m-0"><strong>Was tun:</strong> Klicke auf Teilen und dann auf „Link kopieren". Das zählt für den Algorithmus als „Share", auch wenn du den Link nirgendwo einfügst.</p>
            </ChecklistItem>
            <PlatformLink platform="tiktok" />
          </div>
        )}

        {/* ── Facebook ── */}
        {mainTab === "social" && tab === "facebook" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.facebook}
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Facebook priorisiert Inhalte, die „bedeutungsvolle Interaktionen" zwischen Menschen auslösen. Stilles Liken bringt fast nichts mehr.</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Emotionale Reaktionen">
              <p className="m-0"><strong>Was tun:</strong> Nutze das Herz („Love") oder die Umarmung („Care").</p>
              <p className="m-0"><strong>Der Effekt:</strong> Ein einfacher „Daumen hoch" ist die Standard-Reaktion und wird vom Algorithmus geringer gewichtet als eine bewusste emotionale Reaktion.</p>
            </ChecklistItem>
            <ChecklistItem title="2. Teilen mit persönlicher Note">
              <p className="m-0"><strong>Was tun:</strong> Wenn du den Beitrag teilst, schreibe unbedingt dazu, warum du das Buch (oder das des Kollegen) empfiehlst.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Facebook straft das Teilen ohne eigenen Text ab und zeigt solche Beiträge fast niemandem. Markiere 1–2 Freunde in den Kommentaren, die das Genre mögen.</p>
            </ChecklistItem>
            <PlatformLink platform="facebook" />
          </div>
        )}

        {/* ── Pinterest ── */}
        {mainTab === "social" && tab === "pinterest" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.pinterest}
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Pinterest ist keine klassische Social-Media-Plattform, sondern eine visuelle Suchmaschine. Pins bleiben jahrelang auffindbar und bringen langfristig Traffic. Pinterest-Nutzer suchen aktiv nach Inspiration – perfekt für Buchcover, Zitate und Leseempfehlungen.</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Pins speichern (Repinnen)">
              <p className="m-0"><strong>Was tun:</strong> Speichere den Pin auf einem passenden Board (z.&nbsp;B. „Buchtipps", „Fantasy-Bücher"). Mach das bei deinem Buch und bei den Büchern der Kollegen.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Je öfter ein Pin gespeichert wird, desto höher rankt er in der Pinterest-Suche. Ein Pin mit vielen Saves wird auch auf der Startseite anderer Nutzer ausgespielt.</p>
            </ChecklistItem>
            <ChecklistItem title="2. Keyword-reiche Beschreibungen">
              <p className="m-0"><strong>Was tun:</strong> Wenn du einen Pin kommentierst oder beschreibst, verwende Schlüsselwörter zum Genre und Thema des Buches (z.&nbsp;B. „Romantasy-Buch", „Thriller Neuerscheinung 2026").</p>
              <p className="m-0"><strong>Der Effekt:</strong> Pinterest funktioniert wie eine Suchmaschine – Keywords in Beschreibungen und Kommentaren verbessern die Auffindbarkeit massiv. Auch Google indexiert Pinterest-Pins.</p>
            </ChecklistItem>
            <ChecklistItem title="3. Eigene Boards thematisch aufbauen">
              <p className="m-0"><strong>Was tun:</strong> Erstelle thematische Boards (z.&nbsp;B. „Self-Publishing-Tipps", „Buchempfehlungen Fantasy"). Pinne dort regelmäßig – auch Inhalte anderer Autoren.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Aktive Boards mit einem klaren Thema werden von Pinterest bevorzugt ausgespielt. Du wirst als „Experte" für dieses Thema eingestuft.</p>
            </ChecklistItem>
            <ChecklistItem title="4. Klick auf den Link">
              <p className="m-0"><strong>Was tun:</strong> Klicke auf den Pin und dann auf den hinterlegten Link (z.&nbsp;B. zur BuchArena-Seite oder zum Buch).</p>
              <p className="m-0"><strong>Der Effekt:</strong> Pinterest misst „Outbound Clicks". Je mehr Nutzer einem Pin-Link folgen, desto wertvoller wird er eingestuft und desto öfter wird er angezeigt.</p>
            </ChecklistItem>
            <PlatformLink platform="pinterest" />
          </div>
        )}

        {/* ── LinkedIn ── */}
        {mainTab === "social" && tab === "linkedin" && (
          <div className="space-y-4">
            <SectionIntro
              icon={socialIcons.linkedin}
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> LinkedIn belohnt Fachwissen und echte Gespräche. Im Gegensatz zu anderen Plattformen geht es hier nicht um Unterhaltung, sondern um Expertise. Für Autoren ist LinkedIn Gold wert: Verlage, Buchhändler, Literaturagenten und Journalisten sind hier aktiv.</p>}
            />
            <h2 className="text-lg font-semibold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Reagieren mit Bedacht">
              <p className="m-0"><strong>Was tun:</strong> Nutze die verschiedenen Reaktionen (Gefällt mir, Toll, Unterstützen, Aufschlussreich). „Aufschlussreich" und „Unterstützen" werden vom Algorithmus höher gewichtet als ein einfaches Like.</p>
              <p className="m-0"><strong>Der Effekt:</strong> LinkedIn zeigt Beiträge, auf die differenziert reagiert wird, einem breiteren Netzwerk an – auch Kontakten 2. und 3. Grades.</p>
            </ChecklistItem>
            <ChecklistItem title="2. Kommentieren als Experte">
              <p className="m-0"><strong>Was tun:</strong> Schreibe einen Kommentar mit mindestens 2–3 Sätzen. Teile deine Perspektive als Autor: Erfahrungen beim Schreiben, Einblicke ins Self-Publishing, Gedanken zum Genre.</p>
              <p className="m-0"><strong>Beispiel:</strong> „Spannend, wie ihr das Community-Konzept umsetzt. Als Autor habe ich die Erfahrung gemacht, dass genau dieser direkte Austausch mit Lesern unbezahlbar ist."</p>
              <p className="m-0"><strong>Der Effekt:</strong> LinkedIn priorisiert Beiträge mit längeren, fachlichen Kommentaren. Der Beitrag wird dadurch auch im Feed der Kommentatoren-Kontakte angezeigt.</p>
            </ChecklistItem>
            <ChecklistItem title="3. Beiträge teilen mit eigenem Text">
              <p className="m-0"><strong>Was tun:</strong> Teile den Beitrag und schreibe mindestens 3–4 Zeilen dazu. Erzähle, warum dich das Thema betrifft oder was du daraus mitnimmst.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Geteilte Beiträge ohne eigenen Text werden von LinkedIn kaum ausgespielt. Mit persönlichem Kommentar verdoppelt sich die Reichweite.</p>
            </ChecklistItem>
            <ChecklistItem title="4. Vernetzen &amp; Sichtbarkeit">
              <p className="m-0"><strong>Was tun:</strong> Folge der BuchArena-Seite und vernetze dich mit anderen Autoren auf LinkedIn. Je größer dein Netzwerk, desto mehr Leute sehen deine Interaktionen.</p>
              <p className="m-0"><strong>Der Effekt:</strong> LinkedIn zeigt deinen Kontakten: „[Dein Name] hat einen Beitrag von BuchArena kommentiert." Das erzeugt organische Reichweite ohne Werbung.</p>
            </ChecklistItem>
            <PlatformLink platform="linkedin" />
          </div>
        )}

        {/* ── Hintergrundmusik ── */}
        {mainTab === "musik" && (
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-arena-blue/30 bg-arena-blue/5 p-6">
              <h2 className="text-lg font-semibold m-0 mb-3">Musik für deine Social-Media-Beiträge</h2>
              <p className="m-0 text-[0.95rem] leading-relaxed">
                Hier findest du kostenlose MP3-Dateien, die du in deinen Videos und Reels verwenden kannst.
              </p>
            </div>

            <div className="rounded-xl border border-arena-yellow/30 bg-arena-yellow/10 p-5 text-[0.9rem] leading-relaxed text-arena-text">
              <p className="m-0 font-semibold mb-1">Nutzungshinweis</p>
              <p className="m-0">
                Die Musik darf frei verwendet werden – für private und kommerzielle Beiträge.
                Wir freuen uns, wenn du in der Beschreibung{" "}
                <strong>bucharena.org</strong> als Quelle erwähnst – eine Verpflichtung dazu gibt es aber nicht.
              </p>
            </div>

            {tracksLoading ? (
              <p className="text-arena-muted text-sm">Lade Tracks…</p>
            ) : tracks.length === 0 ? (
              <p className="text-arena-muted text-sm">Aktuell sind keine Tracks verfügbar. Schau bald wieder vorbei!</p>
            ) : (
              <div className="grid gap-4">
                {tracks.map((track) => (
                  <div key={track.id} className="rounded-xl border border-arena-border-light bg-white p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-arena-text text-base m-0">{track.title}</p>
                        <span className="inline-block mt-1 text-xs bg-arena-blue/10 text-arena-blue px-2 py-0.5 rounded-full">{track.style}</span>
                      </div>
                      <a
                        href={track.soundcloudUrl ?? track.fileUrl}
                        target={track.soundcloudUrl ? "_blank" : undefined}
                        rel={track.soundcloudUrl ? "noreferrer" : undefined}
                        download={track.soundcloudUrl ? undefined : track.fileName}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-blue text-white text-sm font-medium hover:bg-arena-blue-light transition-colors no-underline"
                      >
                        {track.soundcloudUrl ? "SoundCloud →" : "↓ Download"}
                      </a>
                    </div>
                    <p className="text-[0.9rem] text-arena-muted m-0">{track.description}</p>
                    {track.soundcloudUrl ? (
                      <iframe
                        width="100%"
                        height="80"
                        scrolling="no"
                        frameBorder="no"
                        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.soundcloudUrl)}&auto_play=false&show_artwork=false&show_comments=false&buying=false&liking=false&download=false&sharing=false`}
                        className="rounded"
                      />
                    ) : (
                      <audio controls className="w-full h-10" src={track.fileUrl} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Beitrag-Tool ── */}
        {mainTab === "beitrag-tool" && (
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-arena-blue/30 bg-arena-blue/5 p-6">
              <h2 className="text-lg font-semibold m-0 mb-3">Social-Media-Beiträge selbst erstellen</h2>
              <p className="m-0 text-[0.95rem] leading-relaxed">
                Mit dem Beitrag-Tool kannst du professionelle Grafiken und Videos für Instagram, TikTok, YouTube & Co. direkt im Browser erstellen – ohne externe Software.
              </p>
              <p className="m-0 mt-3 text-[0.95rem] leading-relaxed">
                Wir stellen euch frei nutzbare Bilder und Musik zur Verfügung, die ihr für eure Beiträge verwenden könnt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-arena-border-light bg-white p-5 space-y-2">
                <h3 className="text-base font-semibold m-0 text-arena-text">Bild-Modus (4:5)</h3>
                <p className="text-[0.9rem] text-arena-muted m-0">Erstelle statische Posts im Instagram-Format. Exportiere als PNG mit Bild, Text und dekorativem Rahmen.</p>
              </div>
              <div className="rounded-xl border border-arena-border-light bg-white p-5 space-y-2">
                <h3 className="text-base font-semibold m-0 text-arena-text">Video-Modus (9:16)</h3>
                <p className="text-[0.9rem] text-arena-muted m-0">Erstelle Reels und Shorts mit Animationen und Hintergrundmusik. Export als MP4 direkt im Browser.</p>
              </div>
              <div className="rounded-xl border border-arena-border-light bg-white p-5 space-y-2">
                <h3 className="text-base font-semibold m-0 text-arena-text">Musik und Animationen</h3>
                <p className="text-[0.9rem] text-arena-muted m-0">Wähle aus kostenlosen BuchArena-Tracks, stelle Fade-In/Out ein und animiere Text und Bilder (Slide, Fade, Zoom).</p>
              </div>
              <div className="rounded-xl border border-arena-border-light bg-white p-5 space-y-2">
                <h3 className="text-base font-semibold m-0 text-arena-text">Rahmen und Designs</h3>
                <p className="text-[0.9rem] text-arena-muted m-0">Über 10 edle Rahmenstile (Elegant, Vintage, Perlen u.v.m.). Speichere und lade eigene Designs.</p>
              </div>
            </div>

            <Link
              href="/social-media/beitrag-tool"
              className="flex items-center justify-center gap-2 rounded-xl bg-arena-blue text-white px-6 py-4 text-[0.95rem] font-semibold no-underline hover:bg-arena-blue-light transition-colors"
            >
              Zum Beitrag-Tool →
            </Link>
          </div>
        )}

        {/* ── Social-Media-Planer ── */}
        {mainTab === "social-media-planer" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-arena-border-light bg-white p-6">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold m-0">Social Media Content planen mit Metricool</h2>
              </div>
              <p className="text-[0.95rem] leading-relaxed m-0">
                Vielleicht habt ihr euch schon gefragt, wie wir es schaffen, unsere Inhalte – zum Beispiel die Vorstellungsvideos – gleichzeitig auf sieben Plattformen zu veröffentlichen: YouTube, Instagram, Facebook, Pinterest, LinkedIn und TikTok.
              </p>
              <p className="text-[0.95rem] leading-relaxed mt-3 m-0">
                Dafür verwenden wir das Tool <strong>Metricool</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-arena-border-light bg-white p-6">
              <h3 className="text-base font-semibold m-0 mb-3">Das bietet einige Vorteile:</h3>
              <ul className="space-y-2 m-0 pl-0 list-none">
                {[
                  "Beiträge bequem im Voraus planen – auch am PC oder Laptop",
                  "Inhalte für verschiedene Plattformen nur einmal eingeben",
                  "Vorlagen wiederverwenden und Posts erneut veröffentlichen",
                  "Test-Reels für Instagram direkt am Laptop oder PC posten",
                  "Umfangreiche Statistiken und Auswertungen",
                  "Sehr guter Support",
                  "Günstiger als viele vergleichbare Plattformen",
                ].map((v) => (
                  <li key={v} className="flex items-start gap-2 text-[0.93rem] leading-relaxed">
                    <span className="text-arena-blue font-bold mt-0.5">✓</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-arena-yellow/40 bg-arena-yellow/10 p-5">
              <p className="font-semibold text-[0.95rem] m-0 mb-2 flex items-center gap-1.5">
                <LightBulbIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>Geheimtipp</span>
              </p>
              <p className="text-[0.93rem] leading-relaxed m-0">
                Man kann bis zu fünf „Marken" verwalten. Wenn du andere Autorinnen oder Autoren kennst, denen du vertraust, könnt ihr euch einen Account teilen. Jede Marke kann dann verschiedene Plattformen enthalten.
              </p>
            </div>

            <div className="rounded-xl border border-arena-blue/20 bg-arena-blue/5 p-5">
              <p className="font-semibold text-[0.95rem] m-0 mb-2">30 Tage kostenlos testen</p>
              <p className="text-[0.93rem] leading-relaxed m-0 mb-3">
                Mit dem Gutscheincode <strong>BUCHARENA</strong> kannst du Metricool 30 Tage kostenlos testen. Wenn du dich über unseren Link registrierst, erhält die BuchArena eine Affiliate-Provision – für dich bleibt der Preis natürlich gleich.
              </p>
              <a
                href="https://f.mtr.cool/bucharena"
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2 rounded-lg bg-arena-blue text-white px-5 py-3 text-[0.93rem] font-semibold no-underline hover:bg-arena-blue-light transition-colors"
              >
                Zu Metricool →
              </a>
            </div>

            <div className="rounded-xl border border-arena-border-light bg-white p-5 text-[0.93rem] leading-relaxed text-arena-muted">
              <p className="m-0">
                Vielleicht hast du jetzt nachgezählt und gemerkt, dass ich nur 6 Plattformen aufgezählt habe: Reddit ist leider nicht enthalten.
              </p>
              <p className="m-0 mt-2">
                Melde dich, wenn du weitere Informationen brauchst!
              </p>
            </div>
          </div>
        )}

        {/* ── Glossar ── */}
        {mainTab === "glossar" && (
          <div className="space-y-5">
            {/* Suchfeld */}
            <input
              type="text"
              placeholder="Begriff oder Erklärung suchen…"
              value={glossarSearch}
              onChange={(e) => { setGlossarSearch(e.target.value); setGlossarLetter(""); }}
              className="w-full rounded-xl border border-arena-border-light bg-white px-4 py-3 text-[0.95rem] outline-none focus:border-arena-blue transition-colors"
            />

            {/* A–Z Navigation */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className={`w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer border-none transition-colors ${
                  glossarLetter === "" ? "bg-arena-blue text-white" : "bg-arena-blue/10 text-arena-text hover:bg-arena-blue/20"
                }`}
                onClick={() => setGlossarLetter("")}
              >
                Alle
              </button>
              {ALPHABET.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer border-none transition-colors ${
                    glossarLetter === l ? "bg-arena-blue text-white" : "bg-arena-blue/10 text-arena-text hover:bg-arena-blue/20"
                  }`}
                  onClick={() => { setGlossarLetter(glossarLetter === l ? "" : l); setGlossarSearch(""); }}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Kategorie-Filter */}
            <select
              value={glossarKategorie}
              onChange={(e) => setGlossarKategorie(e.target.value)}
              className="rounded-xl border border-arena-border-light bg-white px-4 py-2.5 text-[0.9rem] outline-none cursor-pointer focus:border-arena-blue transition-colors"
            >
              <option value="">Alle Kategorien</option>
              {glossarKategorien.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            {/* Ergebnisse */}
            {glossarLoading ? (
              <p className="text-arena-muted text-sm">Lade Glossar…</p>
            ) : filteredGlossar.length === 0 ? (
              <p className="text-arena-muted text-sm">Keine Begriffe gefunden.</p>
            ) : (
              <div className="space-y-2">
                {filteredGlossar.map((e) => {
                  const isOpen = glossarOpen === e.begriff;
                  return (
                    <div key={e.begriff} className="rounded-xl border border-arena-border-light bg-white overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer border-none bg-transparent hover:bg-arena-bg transition-colors"
                        onClick={() => setGlossarOpen(isOpen ? null : e.begriff)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-bold text-[0.95rem] text-arena-text truncate">{e.begriff}</span>
                          <span className="shrink-0 text-xs bg-arena-blue/10 text-arena-blue px-2 py-0.5 rounded-full">{e.bereich}</span>
                        </div>
                        <span className={`text-arena-muted text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-[0.9rem] leading-relaxed text-arena-muted border-t border-arena-border-light pt-3">
                          {e.erklaerung}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 border-t border-arena-border-light pt-6">
          <Link href="/" className="font-medium text-arena-link no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
