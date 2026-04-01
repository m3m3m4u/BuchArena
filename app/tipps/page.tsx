"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Platform = "intro" | "instagram" | "youtube" | "reddit" | "tiktok" | "facebook" | "pinterest" | "linkedin";
type MainTab = "social" | "musik";

const TABS: { key: Platform; label: string; icon: string }[] = [
  { key: "intro", label: "Überblick", icon: "🚀" },
  { key: "instagram", label: "Instagram", icon: "📸" },
  { key: "youtube", label: "YouTube", icon: "▶️" },
  { key: "reddit", label: "Reddit", icon: "🧠" },
  { key: "tiktok", label: "TikTok", icon: "🎵" },
  { key: "facebook", label: "Facebook", icon: "👥" },
  { key: "pinterest", label: "Pinterest", icon: "📌" },
  { key: "linkedin", label: "LinkedIn", icon: "💼" },
];

function ChecklistItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-arena-border-light bg-white p-5 space-y-2">
      <h3 className="text-[1rem] font-bold m-0">{title}</h3>
      <div className="text-[0.93rem] leading-relaxed text-[#444] space-y-2">{children}</div>
    </div>
  );
}

function SectionIntro({ icon, text }: { icon: string; text: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-arena-blue/20 bg-arena-blue/5 p-5 flex gap-4 items-start">
      <span className="text-3xl flex-shrink-0">{icon}</span>
      <div className="text-[0.93rem] leading-relaxed">{text}</div>
    </div>
  );
}

const PLATFORM_LINKS: Record<string, { url: string; label: string; icon: string }> = {
  instagram: { url: "https://www.instagram.com/bucharena/", label: "Hier kommst du zu unserer Instagram-Seite", icon: "📸" },
  youtube:   { url: "https://www.youtube.com/@BuchArena", label: "Hier kommst du zu unserem YouTube-Kanal", icon: "▶️" },
  reddit:    { url: "https://www.reddit.com/user/BuchArena/", label: "Hier kommst du zu unserer Reddit-Seite", icon: "🧠" },
  tiktok:    { url: "https://www.tiktok.com/@bucharena", label: "Hier kommst du zu unserem TikTok-Account", icon: "🎵" },
  facebook:  { url: "https://www.facebook.com/BuchArena", label: "Hier kommst du zu unserer Facebook-Seite", icon: "👥" },
  pinterest: { url: "https://at.pinterest.com/bucharena365/", label: "Hier kommst du zu unserer Pinterest-Seite", icon: "📌" },
  linkedin:  { url: "https://www.linkedin.com/company/bucharena/", label: "Hier kommst du zu unserer LinkedIn-Seite", icon: "💼" },
};

function PlatformLink({ platform }: { platform: string }) {
  const link = PLATFORM_LINKS[platform];
  if (!link) return null;
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 rounded-xl border border-arena-blue/20 bg-arena-blue/5 px-5 py-4 no-underline text-arena-blue font-semibold hover:bg-arena-blue/10 transition-colors">
      <span className="text-xl">{link.icon}</span>
      <span>{link.label} →</span>
    </a>
  );
}

export default function TippsPage() {
  const [tab, setTab] = useState<Platform>("intro");
  const [mainTab, setMainTab] = useState<MainTab>("social");

  type Track = { id: string; title: string; style: string; description: string; fileUrl: string; fileName: string; fileSize: number | null };
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  useEffect(() => {
    if (mainTab !== "musik") return;
    setTracksLoading(true);
    fetch("/api/musik")
      .then((r) => r.json())
      .then((d: { tracks?: Track[] }) => setTracks(d.tracks ?? []))
      .catch(() => {})
      .finally(() => setTracksLoading(false));
  }, [mainTab]);

  return (
    <main className="centered-main">
      <section className="w-full max-w-[1100px] rounded-[14px] bg-white px-12 py-10 box-border max-sm:px-4 max-sm:py-6">
        <h1 className="mb-2 text-3xl font-extrabold max-sm:text-2xl">
          💡 Support-Tipps für Autoren
        </h1>
        <p className="text-[0.95rem] text-[#555] leading-relaxed mb-6">
          Wir übernehmen die Video-Erstellung, das Design und den Upload.
          Dein Job ist es, den „Motor" zu starten. Hier erfährst du, wie du das Beste aus jeder Plattform herausholst.
        </p>

        {/* Haupt-Tabs */}
        <div className="flex gap-2 mb-5 border-b border-gray-200">
          <button
            type="button"
            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "social"
                ? "bg-white border border-b-white border-gray-200 text-arena-blue"
                : "bg-gray-50 text-[#666] hover:bg-gray-100 border border-transparent"
            }`}
            onClick={() => setMainTab("social")}
          >
            📢 Social Media Tipps
          </button>
          <button
            type="button"
            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold cursor-pointer border-none transition-colors -mb-px ${
              mainTab === "musik"
                ? "bg-white border border-b-white border-gray-200 text-arena-blue"
                : "bg-gray-50 text-[#666] hover:bg-gray-100 border border-transparent"
            }`}
            onClick={() => setMainTab("musik")}
          >
            🎵 Hintergrundmusik
          </button>
        </div>

        {/* Plattform-Tabs (nur bei Social Media) */}
        {mainTab === "social" && (
          <div className="flex gap-1.5 flex-wrap mb-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors ${tab === t.key ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text hover:bg-gray-200"}`}
                onClick={() => setTab(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Social Media Content ── */}
        {mainTab === "social" && tab === "intro" && (
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-arena-blue/30 bg-arena-blue/5 p-6">
              <h2 className="text-xl font-bold m-0 mb-3">🤝 Der Community-Effekt</h2>
              <p className="m-0 mb-3 text-[0.95rem] leading-relaxed">
                Der größte Fehler, den du machen kannst, ist nur deinen eigenen Beitrag zu supporten („Post &amp; Run").
              </p>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0">📊</span>
                  <div>
                    <p className="font-semibold m-0">Die Mathematik</p>
                    <p className="text-[0.9rem] text-[#555] m-0">Wenn wir 100 Autoren sind und jeder nur sich selbst liked, hat jeder 1 Like. Wenn jeder auch die Beiträge der anderen supportet, hat jeder 100 Likes.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0">⚙️</span>
                  <div>
                    <p className="font-semibold m-0">Der Algorithmus</p>
                    <p className="text-[0.9rem] text-[#555] m-0">Plattformen erkennen Nutzer, die nur online kommen, wenn es um sie selbst geht. Wer regelmäßig bei anderen interagiert, wird als „wertvolles Community-Mitglied" eingestuft – deine eigenen Beiträge werden höher gerankt.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0">🌐</span>
                  <div>
                    <p className="font-semibold m-0">Nicht nur Instagram!</p>
                    <p className="text-[0.9rem] text-[#555] m-0">Es gibt Plattformen, die für die Auffindbarkeit auf Suchmaschinen und KI-Systemen wie ChatGPT viel wichtiger sind. Deshalb: Wende die folgenden Tipps bei deinem Post an UND regelmäßig bei Posts anderer Autorinnen und Autoren.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-arena-border-light bg-white p-6">
              <h2 className="text-lg font-bold m-0 mb-4">🔗 Wichtige Links</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a href="https://www.youtube.com/@BuchArena" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">▶️</span>
                  <span className="font-medium text-[0.95rem]">YouTube-Kanal</span>
                </a>
                <a href="https://www.youtube.com/@BuchArena/playlists" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">📋</span>
                  <span className="font-medium text-[0.95rem]">YouTube Playlist</span>
                </a>
                <a href="https://www.reddit.com/user/BuchArena/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">🧠</span>
                  <span className="font-medium text-[0.95rem]">Eure Bücher auf Reddit</span>
                </a>
                <a href="https://www.tiktok.com/@bucharena" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">🎵</span>
                  <span className="font-medium text-[0.95rem]">TikTok-Account</span>
                </a>
                <a href="https://www.facebook.com/BuchArena" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">👥</span>
                  <span className="font-medium text-[0.95rem]">Facebook-Account</span>
                </a>
                <a href="https://www.instagram.com/bucharena/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">📸</span>
                  <span className="font-medium text-[0.95rem]">Instagram-Account</span>
                </a>
                <a href="https://at.pinterest.com/bucharena365/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">📌</span>
                  <span className="font-medium text-[0.95rem]">Pinterest-Account</span>
                </a>
                <a href="https://www.linkedin.com/company/bucharena/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-arena-border-light px-4 py-3 no-underline text-inherit hover:border-arena-blue transition-colors">
                  <span className="text-xl">💼</span>
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
              icon="📸"
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Instagram bewertet Interaktionen nach einer strengen Hierarchie. Ein einfaches „Gefällt mir" ist nett, aber für den Algorithmus fast wertlos. Ein „Speichern" oder „Teilen" hingegen signalisiert: „Dieser Inhalt ist so gut, ich will ihn behalten oder meinen Freunden zeigen."</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
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
              icon="▶️"
              text={<p className="m-0"><strong>Warum das hier ein „Game Changer" ist (SEO &amp; KI):</strong> YouTube gehört Google. Videos veralten nicht nach 24 Stunden, sie bleiben jahrelang suchbar. Noch wichtiger: Künstliche Intelligenzen (wie ChatGPT, Google Gemini) nutzen YouTube-Transkripte und Kommentare, um Wissen zu sammeln. Wenn jemand eine KI fragt „Welche neuen Fantasy-Bücher von kleinen Autoren sind gut?", durchsucht die KI YouTube-Daten. Wenn wir dort nicht stattfinden, existiert dein Buch für die KI nicht.</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
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
              icon="🧠"
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Reddit ist keine Social-Media-Plattform wie Instagram, sondern ein Wissensarchiv. Extrem wichtig: Reddit ist die Hauptdatenquelle für das Training von LLMs (Large Language Models). Wenn du willst, dass ChatGPT dein Buch kennt und empfiehlt, muss es auf Reddit „validiert" sein. Ein Reddit-Thread mit guter Diskussion ist für die KI ein Qualitätssiegel.</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
            <ChecklistItem title="1. Upvote">
              <p className="m-0"><strong>Was tun:</strong> Klicke auf den Pfeil nach oben.</p>
              <p className="m-0"><strong>Der Effekt:</strong> Es erhöht die Sichtbarkeit im Subreddit und auf der Google-Startseite (Google zeigt Reddit-Ergebnisse inzwischen sehr weit oben an).</p>
            </ChecklistItem>
            <ChecklistItem title="2. Qualitative Diskussion (Keine Werbung!)">
              <p className="m-0"><strong>Was tun:</strong> Wenn wir dein Buch posten, fungiere als Experte, nicht als Verkäufer. Antworte auf Fragen, gib Hintergrundinformationen.</p>
              <p className="m-0"><strong>Community-Tipp:</strong> Wenn du unter dem Post eines anderen Autors kommentierst, stelle ihm eine Frage zum Buch („Wie bist du auf die Idee gekommen?"). Das kurbelt die Diskussion an.</p>
              <p className="m-0"><strong>Der Effekt:</strong> KIs scannen diese Konversationen, um den Kontext und Inhalt des Buches zu verstehen. Je mehr Text du lieferst, desto präziser kann eine KI dein Buch später empfehlen.</p>
            </ChecklistItem>
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
              <h3 className="text-[1rem] font-bold m-0 mb-2 text-red-700">🚫 Absolute No-Gos</h3>
              <p className="m-0 text-[0.9rem]"><strong>Brigading (Vote-Manipulation):</strong> Rufe niemals öffentlich (z.&nbsp;B. in deiner Insta-Story) dazu auf: „Geht alle auf Reddit und votet hoch!". Reddit erkennt, wenn viele User von extern kommen und nur voten. Das führt zur Löschung des Posts oder Sperrung unseres Accounts. Die Interaktion muss organisch wirken.</p>
            </div>
            <PlatformLink platform="reddit" />
          </div>
        )}

        {/* ── TikTok ── */}
        {mainTab === "social" && tab === "tiktok" && (
          <div className="space-y-4">
            <SectionIntro
              icon="🎵"
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> TikTok interessiert sich nicht dafür, wer dir folgt. Es interessiert sich nur dafür: „Hält dieses Video die Leute in der App?".</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
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
              icon="👥"
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Facebook priorisiert Inhalte, die „bedeutungsvolle Interaktionen" zwischen Menschen auslösen. Stilles Liken bringt fast nichts mehr.</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
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
              icon="📌"
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> Pinterest ist keine klassische Social-Media-Plattform, sondern eine visuelle Suchmaschine. Pins bleiben jahrelang auffindbar und bringen langfristig Traffic. Pinterest-Nutzer suchen aktiv nach Inspiration – perfekt für Buchcover, Zitate und Leseempfehlungen.</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
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
              icon="💼"
              text={<p className="m-0"><strong>So tickt der Algorithmus:</strong> LinkedIn belohnt Fachwissen und echte Gespräche. Im Gegensatz zu anderen Plattformen geht es hier nicht um Unterhaltung, sondern um Expertise. Für Autoren ist LinkedIn Gold wert: Verlage, Buchhändler, Literaturagenten und Journalisten sind hier aktiv.</p>}
            />
            <h2 className="text-lg font-bold mt-2 mb-0">Deine Checkliste</h2>
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
              <h2 className="text-xl font-bold m-0 mb-3">🎶 Musik für deine Social-Media-Beiträge</h2>
              <p className="m-0 text-[0.95rem] leading-relaxed">
                Hier findest du kostenlose MP3-Dateien, die du in deinen Videos und Reels verwenden kannst.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-[0.9rem] leading-relaxed text-amber-900">
              <p className="m-0 font-semibold mb-1">🖥️ Nutzungshinweis</p>
              <p className="m-0">
                Die Musik darf frei verwendet werden – für private und kommerzielle Beiträge.
                Wir freuen uns, wenn du in der Beschreibung{" "}
                <strong>bucharena.org</strong> als Quelle erwähnst – eine Verpflichtung dazu gibt es aber nicht.
              </p>
            </div>

            {tracksLoading ? (
              <p className="text-[#888] text-sm">Lade Tracks…</p>
            ) : tracks.length === 0 ? (
              <p className="text-[#888] text-sm">Aktuell sind keine Tracks verfügbar. Schau bald wieder vorbei!</p>
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
                        href={track.fileUrl}
                        download={track.fileName}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-blue text-white text-sm font-medium hover:bg-arena-blue-light transition-colors no-underline"
                      >
                        ↓ Download
                      </a>
                    </div>
                    <p className="text-[0.9rem] text-[#555] m-0">{track.description}</p>
                    <audio controls className="w-full h-10" src={track.fileUrl} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 border-t border-gray-200 pt-6">
          <Link href="/" className="font-medium text-arena-link no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
