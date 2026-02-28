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

  const hasActiveFilter = genreFilter !== "" || ageFilter.trim() !== "";

  const filteredAuthors = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";

    if (!hasActiveFilter) {
      // No filter → show ALL authors (including those without books)
      return weightedShuffle(authors, seed);
    }

    // With filter → only authors that have matching books
    const result = authors
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

    return weightedShuffle(result, seed);
  }, [authors, genreFilter, ageFilter, hasActiveFilter, seed]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [genreFilter, ageFilter]);

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

        <div className="grid grid-cols-[1fr_220px] items-end gap-3 max-[900px]:grid-cols-1">
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
                        {author.books.length > 0 ? (
                          <>
                            <p className="mt-0.5 text-sm font-semibold">
                              {hasActiveFilter
                                ? `${author.books.length} passende${author.books.length === 1 ? "s Buch" : " Bücher"}`
                                : `${author.books.length} ${author.books.length === 1 ? "Buch" : "Bücher"}`}
                            </p>
                            <ul className="m-0 mt-1.5 grid gap-1 p-0" style={{ listStyle: "none" }}>
                              {author.books.slice(0, 2).map((book) => (
                                <li key={`${author.username}-${book.title}`} className="text-sm leading-snug truncate">
                                  {book.title}
                                  <span className="block text-xs text-gray-500 truncate">{book.genre}{(book.ageFrom > 0 || book.ageTo > 0) ? ` · ${book.ageFrom}–${book.ageTo} J.` : ""}</span>
                                </li>
                              ))}
                              {author.books.length > 2 && (
                                <li className="text-xs text-arena-muted mt-0.5">
                                  + {author.books.length - 2} weitere{author.books.length - 2 === 1 ? "s Buch" : " Bücher"} →
                                </li>
                              )}
                            </ul>
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm text-arena-muted">Noch keine Bücher</p>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <button className="btn-secondary text-sm px-3 py-1" disabled={page === 1} onClick={() => goTo(page - 1)}>← Zurück</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`text-sm px-3 py-1 rounded ${p === page ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => goTo(p)}
                  >
                    {p}
                  </button>
                ))}
                <button className="btn-secondary text-sm px-3 py-1" disabled={page === totalPages} onClick={() => goTo(page + 1)}>Weiter →</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
