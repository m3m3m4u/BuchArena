"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { normalizeGenre } from "@/lib/genres";

type AuthorBook = { title: string; genre: string; ageFrom: number; ageTo: number };
type DiscoverAuthor = { username: string; displayName: string; profileImageUrl: string; lastOnline: string | null; books: AuthorBook[] };

const PAGE_SIZE = 10;

/** Simple seeded PRNG (mulberry32) – deterministic per session seed */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted-random shuffle: recently-online authors get a score boost */
function weightedShuffle(authors: DiscoverAuthor[], seed: number): DiscoverAuthor[] {
  const rng = mulberry32(seed);
  const now = Date.now();

  const scored = authors.map((a) => {
    const random = rng(); // 0..1
    // lastOnline boost: 0..1, decaying over 7 days
    let onlineBoost = 0;
    if (a.lastOnline) {
      const age = now - new Date(a.lastOnline).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      onlineBoost = Math.max(0, 1 - age / sevenDays);
    }
    // Final score: 60 % random + 40 % recency
    const score = 0.6 * random + 0.4 * onlineBoost;
    return { author: a, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.author);
}

export default function AutorenPage() {
  const [authors, setAuthors] = useState<DiscoverAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    async function loadAuthors() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/authors/discover", { method: "GET" });
        const data = (await res.json()) as { authors?: DiscoverAuthor[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Autoren konnten nicht geladen werden.");
        setAuthors(data.authors ?? []);
      } catch {
        setMessage("Autoren konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadAuthors();
  }, []);

  const genres = useMemo(() => {
    const unique = new Set(
      authors.flatMap((a) => a.books).flatMap((b) => (b.genre ?? "").split(",").map((g) => normalizeGenre(g.trim())).filter(Boolean)),
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "de"));
  }, [authors]);

  const hasActiveFilter = genreFilter !== "" || ageFilter.trim() !== "" || searchQuery.trim() !== "";

  const filteredAuthors = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";
    const q = searchQuery.trim().toLowerCase();

    if (!hasActiveFilter) {
      // No filter → show ALL authors (including those without books)
      return weightedShuffle(authors, seed);
    }

    // With filter → only authors that have matching books (or matching name)
    let result = authors;

    // Text search: match on author name or book titles
    if (q) {
      result = result.filter((a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.books.some((b) => b.title.toLowerCase().includes(q))
      );
    }

    // Genre / age filter
    if (genreFilter || hasAge) {
      result = result
        .map((a) => ({
          ...a,
          books: a.books.filter((b) => {
            const genreList = (b.genre ?? "").split(",").map((g) => normalizeGenre(g.trim()));
            const matchesGenre = !genreFilter || genreList.includes(genreFilter);
            const matchesAge = !hasAge || (b.ageFrom <= age && age <= b.ageTo);
            return matchesGenre && matchesAge;
          }),
        }))
        .filter((a) => a.books.length > 0);
    }

    return weightedShuffle(result, seed);
  }, [authors, genreFilter, ageFilter, searchQuery, hasActiveFilter, seed]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [genreFilter, ageFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAuthors.length / PAGE_SIZE));
  const pagedAuthors = filteredAuthors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1>Autoren entdecken</h1>

        <label className="grid gap-1 text-[0.95rem]">
          Suche
          <input className="input-base" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name oder Buchtitel …" />
        </label>

        <div className="grid grid-cols-[1fr_220px] items-end gap-3 max-sm:grid-cols-1">
          <label className="grid gap-1 text-[0.95rem]">
            Genre
            <select className="input-base" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
              <option value="">Alle</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            Alter
            <input className="input-base" type="number" min={0} value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} placeholder="z. B. 10" />
          </label>
        </div>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Autoren ...</p>
        ) : filteredAuthors.length === 0 ? (
          <p>Keine Autoren für den gewählten Filter gefunden.</p>
        ) : (
          <>
            <div className="grid gap-3 min-[700px]:grid-cols-2">
              {pagedAuthors.map((author) => (
                <Link
                  key={author.username}
                  href={`/autor/${encodeURIComponent(author.username)}`}
                  className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md"
                >
                  <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                    <div className="grid grid-cols-[72px_1fr] items-start gap-3">
                      <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted">
                        {author.profileImageUrl ? (
                          <img src={`${author.profileImageUrl}${author.profileImageUrl.includes('?') ? '&' : '?'}w=200`} alt={`Profilbild von ${author.displayName}`} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span>Kein Bild</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="m-0 text-[1.05rem] truncate">{author.displayName}</h2>
                        <p className="mt-0.5 mb-0 text-sm">
                          {author.books.length === 0
                            ? "Noch keine Bücher"
                            : hasActiveFilter
                              ? `${author.books.length} passende${author.books.length === 1 ? "s Buch" : " Bücher"}`
                              : `${author.books.length} ${author.books.length === 1 ? "Buch" : "Bücher"}`}
                        </p>
                        {(() => {
                          const allGenres = new Set(
                            author.books.flatMap((b) => (b.genre ?? "").split(",").map((g) => g.trim()).filter(Boolean))
                          );
                          return allGenres.size > 0 ? (
                            <p className="mt-1 mb-0 text-xs text-arena-muted truncate">{[...allGenres].join(", ")}</p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <button className="btn btn-sm text-sm" disabled={page === 1} onClick={() => goTo(page - 1)}>← Zurück</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`btn btn-sm text-sm ${p === page ? "btn-primary" : ""}`}
                    onClick={() => goTo(p)}
                  >
                    {p}
                  </button>
                ))}
                <button className="btn btn-sm text-sm" disabled={page === totalPages} onClick={() => goTo(page + 1)}>Weiter →</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
