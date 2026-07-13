"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedShuffle<T extends { lesezeichenTotal: number }>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const maxLz = Math.max(1, ...items.map((i) => i.lesezeichenTotal));
  const scored = items.map((i) => ({
    item: i,
    score: 0.5 * rng() + 0.5 * Math.log1p(i.lesezeichenTotal) / Math.log1p(maxLz),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

type DiscoverSpeaker = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  ort: string;
  motto: string;
  sprechprobenCount: number;
  lesezeichenTotal: number;
};

export default function SprecherPage() {
  const [speakers, setSpeakers] = useState<DiscoverSpeaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    async function loadSpeakers() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/speakers/discover", { method: "GET" });
        const data = (await res.json()) as { speakers?: DiscoverSpeaker[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Sprecher konnten nicht geladen werden.");
        setSpeakers(data.speakers ?? []);
      } catch {
        setMessage("Sprecher konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadSpeakers();
  }, []);

  const sortedSpeakers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? speakers.filter((s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          s.ort?.toLowerCase().includes(q) ||
          s.motto?.toLowerCase().includes(q)
        )
      : speakers;
    return weightedShuffle(base, seed);
  }, [speakers, searchQuery, seed]);

  const totalPages = Math.max(1, Math.ceil(sortedSpeakers.length / PAGE_SIZE));
  const paged = sortedSpeakers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  useEffect(() => { setPage(1); }, [searchQuery]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight m-0">Hörbuchsprecher entdecken</h1>
          <Link href="/wohnort-karte/sprecher" className="btn">Suche nach Wohnort</Link>
        </div>
        <p className="font-sans text-arena-muted text-sm mt-1.5">
          Hier findest du Hörbuchsprecher und ihre Sprechproben.
        </p>

        <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-4 w-full">
          Suche
          <input className="input-base font-normal" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name oder Ort …" />
        </label>

        {message && <p className="font-sans text-red-700 text-sm mt-4">{message}</p>}

        {isLoading ? (
          <p className="font-sans text-arena-muted text-sm mt-4">Lade Sprecher ...</p>
        ) : speakers.length === 0 ? (
          <p className="font-sans text-arena-muted text-sm mt-4">Noch keine Sprecher vorhanden.</p>
        ) : (
          <>
          <div className="grid gap-3 min-[700px]:grid-cols-2 mt-4">
            {paged.map((speaker) => (
              <Link
                key={speaker.username}
                href={`/sprecher/${encodeURIComponent(speaker.profileSlug || speaker.username)}`}
                className="block no-underline text-inherit h-full"
              >
                <article className="member-card font-sans">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={speaker.profileImageUrl ? {
                        backgroundImage: `url(${speaker.profileImageUrl}${speaker.profileImageUrl.includes('?') ? '&' : '?'}w=200)`,
                        backgroundPosition: `${speaker.profileImageCrop?.x ?? 50}% ${speaker.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(speaker.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!speaker.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="font-sans m-0 text-base font-bold text-arena-blue truncate">{speaker.displayName}</h2>
                      {speaker.ort && (
                        <p className="font-sans mt-0.5 text-sm text-arena-text">{speaker.ort}</p>
                      )}
                      {speaker.motto && (
                        <p className="font-sans mt-1 text-sm italic text-arena-muted">„{speaker.motto}"</p>
                      )}
                      <p className="font-sans mt-1.5 text-xs text-arena-muted font-medium">
                        {speaker.sprechprobenCount}{" "}
                        {speaker.sprechprobenCount === 1 ? "Sprechprobe" : "Sprechproben"}
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <button className="btn btn-sm text-sm" disabled={page === 1} onClick={() => goTo(page - 1)}>← Zurück</button>
              <span className="text-sm text-arena-muted">Seite {page} / {totalPages}</span>
              <button className="btn btn-sm text-sm" disabled={page === totalPages} onClick={() => goTo(page + 1)}>Weiter →</button>
            </div>
          )}
          </>
        )}

        <div className="mt-6 border-t border-arena-border-light pt-6">
          <Link href="/" className="font-sans font-bold text-arena-blue hover:text-arena-blue-light no-underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
