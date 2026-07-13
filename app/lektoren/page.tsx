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

const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type DiscoverLektor = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  kapazitaeten: number[];
  lesezeichenTotal: number;
};

export default function LektorenPage() {
  const [lektoren, setLektoren] = useState<DiscoverLektor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadLektoren() {
      setIsLoading(true);
      setMessage("");
      try {
        const url = debouncedQuery
          ? `/api/lektoren/discover?q=${encodeURIComponent(debouncedQuery)}`
          : "/api/lektoren/discover";
        const res = await fetch(url, { method: "GET" });
        const data = (await res.json()) as { lektoren?: DiscoverLektor[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Lektoren konnten nicht geladen werden.");
        setLektoren(data.lektoren ?? []);
      } catch {
        setMessage("Lektoren konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadLektoren();
  }, [debouncedQuery]);

  const filteredLektoren = useMemo(() => {
    return weightedShuffle(lektoren, seed);
  }, [lektoren, seed]);

  const totalPages = Math.max(1, Math.ceil(filteredLektoren.length / PAGE_SIZE));
  const paged = filteredLektoren.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  useEffect(() => { setPage(1); }, [searchQuery]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight m-0">Lektoren entdecken</h1>
          <Link href="/wohnort-karte/lektoren" className="btn">Suche nach Wohnort</Link>
        </div>
        <p className="font-sans text-arena-muted text-sm mt-1.5">
          Hier findest du Lektoren und ihre Verfügbarkeit.
        </p>

        <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-4 w-full">
          Suche
          <input className="input-base font-normal" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name …" />
        </label>

        {message && <p className="font-sans text-red-700 text-sm mt-4">{message}</p>}

        {isLoading ? (
          <p className="font-sans text-arena-muted text-sm mt-4">Lade Lektoren ...</p>
        ) : filteredLektoren.length === 0 ? (
          <p className="font-sans text-arena-muted text-sm mt-4">Keine Lektoren für diesen Suchbegriff gefunden.</p>
        ) : (
          <>
          <div className="grid gap-3 min-[700px]:grid-cols-2 mt-4">
            {paged.map((lk) => (
              <Link
                key={lk.username}
                href={`/lektoren/${encodeURIComponent(lk.profileSlug || lk.username)}`}
                className="block no-underline text-inherit h-full"
              >
                <article className="member-card font-sans">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={lk.profileImageUrl ? {
                        backgroundImage: `url(${lk.profileImageUrl})`,
                        backgroundPosition: `${lk.profileImageCrop?.x ?? 50}% ${lk.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(lk.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!lk.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="font-sans m-0 text-base font-bold text-arena-blue truncate">{lk.displayName}</h2>
                      {lk.motto && (
                        <p className="font-sans mt-1 text-sm italic text-arena-muted">„{lk.motto}“</p>
                      )}
                      {lk.kapazitaeten.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lk.kapazitaeten.map((m) => (
                            <span
                              key={m}
                              className="font-sans inline-block rounded-full bg-green-50 text-green-700 text-[11px] font-semibold px-2 py-0.5 border border-green-200"
                            >
                              {monthLabels[m - 1]}
                            </span>
                          ))}
                        </div>
                      )}
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
