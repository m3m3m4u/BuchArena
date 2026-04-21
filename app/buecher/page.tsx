"use client";

import { ProgressiveImage } from "@/app/components/progressive-image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeGenre } from "@/lib/genres";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedShuffleBooks(books: DiscoverBook[], seed: number): DiscoverBook[] {
  const rng = mulberry32(seed);
  const maxEmpf = Math.max(1, ...books.map((b) => b.empfehlungenCount));
  const scored = books.map((b) => ({
    book: b,
    score: 0.5 * rng() + 0.5 * b.empfehlungenCount / maxEmpf,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.book);
}

type DiscoverBook = {
  id: string;
  ownerUsername: string;
  authorDisplayName: string;
  coverImageUrl: string;
  title: string;
  publicationYear: number;
  genre: string;
  ageFrom: number;
  ageTo: number;
  publisher: string;
  isbn: string;
  pageCount: number;
  language: string;
  description: string;
  buyLinks: string[];
  presentationVideoUrl: string;
  createdAt: string;
  empfehlungenCount: number;
};

export default function BuecherPage() {
  return (
    <Suspense>
      <BuecherContent />
    </Suspense>
  );
}

const PAGE_SIZE = 10;

function BuecherContent() {
  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState(normalizeGenre(searchParams.get("genre") ?? ""));
  const [ageFilter, setAgeFilter] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      setMessage("");
      try {
        const url = debouncedQuery
          ? `/api/books/discover?q=${encodeURIComponent(debouncedQuery)}`
          : "/api/books/discover";
        const response = await fetch(url, { method: "GET" });
        const data = (await response.json()) as { books?: DiscoverBook[]; message?: string };
        if (!response.ok) throw new Error(data.message ?? "Bücher konnten nicht geladen werden.");
        setBooks(data.books ?? []);
      } catch {
        setMessage("Bücher konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadBooks();
  }, [debouncedQuery]);

  const genres = useMemo(() => {
    const unique = new Set(
      books.flatMap((b) => (b.genre ?? "").split(",").map((g) => normalizeGenre(g.trim())).filter(Boolean)),
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "de"));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";
    const q = searchQuery.trim().toLowerCase();
    const filtered = books.filter((book) => {
      const genreList = (book.genre ?? "").split(",").map((g) => normalizeGenre(g.trim()));
      const matchesGenre = !genreFilter || genreList.includes(genreFilter);
      const matchesAge = !hasAge || (book.ageFrom <= age && age <= book.ageTo);
      // Bei Server-seitiger Suche wurde bereits gefiltert; nur Genre + Alter client-seitig anwenden.
      // Ohne aktive Server-Suche (Erst-Laden): Volltext client-seitig prüfen.
      const matchesSearch = debouncedQuery
        ? true
        : !q ||
          book.title.toLowerCase().includes(q) ||
          book.authorDisplayName.toLowerCase().includes(q) ||
          (book.publisher ?? "").toLowerCase().includes(q) ||
          (book.isbn ?? "").toLowerCase().includes(q);
      return matchesGenre && matchesAge && matchesSearch;
    });
    return weightedShuffleBooks(filtered, seed);
  }, [books, genreFilter, ageFilter, searchQuery, debouncedQuery, seed]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [genreFilter, ageFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const pagedBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  return (
    <main className="top-centered-main">
      {/* Buchtipp-Banner */}
      <Link href="/buchempfehlung" className="card no-underline text-inherit hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #e2b714 0%, #d4a90e 100%)", color: "#1a1a2e" }}>
        <div className="flex items-center gap-4 py-2">
          <div>
            <p className="text-lg font-bold m-0">Buchtipp – intelligent nach deinen Vorlieben</p>
            <p className="text-sm opacity-75 m-0 mt-1">Beantworte ein paar kurze Fragen und erhalte eine persönliche Buchempfehlung aus unserer Bibliothek.</p>
          </div>
          <span className="text-2xl ml-auto flex-shrink-0 opacity-60">→</span>
        </div>
      </Link>

      <section className="card mt-3">
        <h1>Bücher entdecken</h1>

        <label className="grid gap-1 text-[0.95rem]">
          Suche
          <input className="input-base" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Titel, Autor, Verlag oder ISBN …" />
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
          <p>Lade Bücher ...</p>
        ) : filteredBooks.length === 0 ? (
          <p>Keine Bücher für den gewählten Filter gefunden.</p>
        ) : (
          <>
          <div className="grid gap-3 min-[1200px]:grid-cols-2">
            {pagedBooks.map((book, index) => (
              <Link
                href={`/buch/${book.id}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
                key={`${book.title}-${book.ownerUsername}-${book.createdAt}-${index}`}
              >
                <article className="h-full rounded-lg border border-arena-border p-3 hover:border-gray-500">
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3.5 max-[400px]:grid-cols-1">
                    <div className="relative w-[100px] aspect-[2/3] rounded-lg border border-arena-border bg-arena-bg flex items-center justify-center text-xs text-arena-muted max-[400px]:w-full max-[400px]:max-w-[120px]">
                      {book.coverImageUrl ? (
                        <ProgressiveImage src={book.coverImageUrl} alt={`Cover von ${book.title}`} fill className="object-contain rounded p-1" sizes="100px" />
                      ) : (
                        <span className="px-6 py-10">Kein Cover</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1 mt-0 truncate">{book.title}</h3>
                      {(() => {
                        const lines: { label: string; value: string }[] = [];
                        lines.push({ label: "Autor", value: book.authorDisplayName });
                        if (book.genre) lines.push({ label: "Genre", value: book.genre });
                        if (book.ageFrom > 0 || book.ageTo > 0) lines.push({ label: "Alter", value: `${book.ageFrom} bis ${book.ageTo}` });
                        if (book.publicationYear) lines.push({ label: "Erscheinungsjahr", value: String(book.publicationYear) });
                        if (book.publisher) lines.push({ label: "Verlag", value: book.publisher });
                        if (book.isbn) lines.push({ label: "ISBN", value: book.isbn });
                        if (book.pageCount > 0) lines.push({ label: "Seitenanzahl", value: String(book.pageCount) });
                        return lines.slice(0, 5).map((l) => (
                          <p key={l.label} className="my-0.5 truncate">{l.label}: {l.value}</p>
                        ));
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
                {(() => {
                  const pages: (number | "…")[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (page > 3) pages.push("…");
                    const start = Math.max(2, page - 1);
                    const end = Math.min(totalPages - 1, page + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (page < totalPages - 2) pages.push("…");
                    pages.push(totalPages);
                  }
                  return pages.map((p, idx) =>
                    p === "…" ? (
                      <span key={`dots-${idx}`} className="px-1 text-sm select-none">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`btn btn-sm text-sm ${p === page ? "btn-primary" : ""}`}
                        onClick={() => goTo(p)}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}
                <button className="btn btn-sm text-sm" disabled={page === totalPages} onClick={() => goTo(page + 1)}>Weiter →</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
