"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseGenres } from "@/app/components/genre-picker";

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

type DiscoverTestleser = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  genres: string[];
  verfuegbar: boolean;
  lesezeichenTotal: number;
};

export default function TestleserPage() {
  const [testleser, setTestleser] = useState<DiscoverTestleser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    async function loadTestleser() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/testleser/discover", { method: "GET" });
        const data = (await res.json()) as { testleser?: DiscoverTestleser[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Testleser konnten nicht geladen werden.");
        setTestleser(data.testleser ?? []);
      } catch {
        setMessage("Testleser konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadTestleser();
  }, []);

  const allGenres = Array.from(
    new Set(testleser.flatMap((t) => t.genres))
  ).sort((a, b) => a.localeCompare(b, "de"));

  const filtered = useMemo(() => {
    const base = filterGenre
      ? testleser.filter((t) => t.genres.includes(filterGenre) || t.genres.length === 0)
      : testleser;
    return weightedShuffle(base, seed);
  }, [testleser, filterGenre, seed]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  useEffect(() => { setPage(1); }, [filterGenre]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="m-0">(Test)Leser entdecken</h1>
          <Link href="/wohnort-karte/testleser" className="btn">Suche nach Wohnort</Link>
        </div>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du (Test)Leser und ihre bevorzugten Genres.
        </p>

        {allGenres.length > 0 && (
          <label className="grid gap-1 text-[0.95rem]">
            Genre
            <select className="input-base" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
              <option value="">Alle</option>
              {allGenres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        )}

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Testleser ...</p>
        ) : filtered.length === 0 ? (
          <p>Noch keine Testleser vorhanden.</p>
        ) : (
          <>
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {paged.map((tl) => (
              <Link
                key={tl.username}
                href={`/testleser/${encodeURIComponent(tl.profileSlug || tl.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={tl.profileImageUrl ? {
                        backgroundImage: `url(${tl.profileImageUrl})`,
                        backgroundPosition: `${tl.profileImageCrop?.x ?? 50}% ${tl.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(tl.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!tl.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-[1.05rem]">
                        {tl.displayName}
                        {tl.verfuegbar && (
                          <span className="ml-2 inline-block rounded-full bg-green-100 text-green-700 text-[11px] font-medium px-2.5 py-0.5 align-middle">
                            Verfügbar
                          </span>
                        )}
                      </h2>
                      {tl.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tl.genres.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="inline-block rounded-full bg-arena-blue/10 text-arena-blue text-[11px] font-medium px-2.5 py-1"
                            >
                              {g}
                            </span>
                          ))}
                          {tl.genres.length > 4 && (
                            <span className="text-[11px] text-arena-muted">
                              +{tl.genres.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-arena-muted mt-1 m-0">Hat kein bevorzugtes Genre angegeben.</p>
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
