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

type DiscoverBlogger = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  genres: string[];
  lieblingsbuch: string;
  beschreibung: string;
  lesezeichenTotal: number;
};

export default function BloggerPage() {
  const [bloggers, setBloggers] = useState<DiscoverBlogger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    async function loadBloggers() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/bloggers/discover", { method: "GET" });
        const data = (await res.json()) as { bloggers?: DiscoverBlogger[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Blogger konnten nicht geladen werden.");
        setBloggers(data.bloggers ?? []);
      } catch {
        setMessage("Blogger konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadBloggers();
  }, []);

  // Alle Genres aus den Bloggern sammeln
  const allGenres = Array.from(
    new Set(bloggers.flatMap((b) => b.genres))
  ).sort((a, b) => a.localeCompare(b, "de"));

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = bloggers;
    if (q) {
      base = base.filter((b) =>
        b.displayName.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.motto?.toLowerCase().includes(q) ||
        b.lieblingsbuch?.toLowerCase().includes(q) ||
        b.beschreibung?.toLowerCase().includes(q)
      );
    }
    if (filterGenre) base = base.filter((b) => b.genres.includes(filterGenre));
    return weightedShuffle(base, seed);
  }, [bloggers, filterGenre, searchQuery, seed]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  // Filter-Wechsel → Seite zurücksetzen
  useEffect(() => { setPage(1); }, [filterGenre, searchQuery]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold m-0">Buchblogger entdecken</h1>
          <Link href="/wohnort-karte/blogger" className="btn">Suche nach Wohnort</Link>
        </div>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du Buchblogger und ihre Lieblingsgenres.
        </p>

        <label className="grid gap-1 text-[0.95rem]">
          Suche
          <input className="input-base" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name …" />
        </label>

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
          <p>Lade Blogger ...</p>
        ) : filtered.length === 0 ? (
          <p>Noch keine Blogger vorhanden.</p>
        ) : (
          <>
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {paged.map((blogger) => (
              <Link
                key={blogger.username}
                href={`/blogger/${encodeURIComponent(blogger.profileSlug || blogger.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={blogger.profileImageUrl ? {
                        backgroundImage: `url(${blogger.profileImageUrl}${blogger.profileImageUrl.includes('?') ? '&' : '?'}w=200)`,
                        backgroundPosition: `${blogger.profileImageCrop?.x ?? 50}% ${blogger.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(blogger.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!blogger.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-base font-semibold">{blogger.displayName}</h2>
                      {blogger.motto && (
                        <p className="mt-0.5 text-sm italic">„{blogger.motto}"</p>
                      )}
                      {blogger.lieblingsbuch && (
                        <p className="mt-0.5 text-xs text-arena-muted">
                          ❤️ {blogger.lieblingsbuch}
                        </p>
                      )}
                      {blogger.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {blogger.genres.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="inline-block rounded-full bg-arena-blue/10 text-arena-blue text-[11px] font-medium px-2.5 py-1"
                            >
                              {g}
                            </span>
                          ))}
                          {blogger.genres.length > 4 && (
                            <span className="text-[11px] text-arena-muted">
                              +{blogger.genres.length - 4}
                            </span>
                          )}
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
