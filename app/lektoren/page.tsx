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
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    async function loadLektoren() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/lektoren/discover", { method: "GET" });
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
  }, []);

  const filteredLektoren = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? lektoren.filter((lk) =>
          lk.displayName.toLowerCase().includes(q) ||
          lk.username.toLowerCase().includes(q)
        )
      : lektoren;
    return weightedShuffle(base, seed);
  }, [lektoren, searchQuery, seed]);

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
        <h1>Lektoren entdecken</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du Lektoren und ihre Verfügbarkeit.
        </p>

        <label className="grid gap-1 text-[0.95rem]">
          Suche
          <input className="input-base" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name …" />
        </label>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Lektoren ...</p>
        ) : filteredLektoren.length === 0 ? (
          <p>Keine Lektoren für diesen Suchbegriff gefunden.</p>
        ) : (
          <>
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {paged.map((lk) => (
              <Link
                key={lk.username}
                href={`/lektoren/${encodeURIComponent(lk.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
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
                      <h2 className="m-0 text-[1.05rem]">{lk.displayName}</h2>
                      {lk.motto && (
                        <p className="mt-0.5 text-sm italic">„{lk.motto}“</p>
                      )}
                      {lk.kapazitaeten.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lk.kapazitaeten.map((m) => (
                            <span
                              key={m}
                              className="inline-block rounded-full bg-green-100 text-green-700 text-[11px] font-medium px-2 py-0.5"
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

        <div className="pt-2">
          <Link href="/" className="text-arena-link text-sm no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
