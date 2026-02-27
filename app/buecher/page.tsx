"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeGenre } from "@/lib/genres";

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
};

export default function BuecherPage() {
  return (
    <Suspense>
      <BuecherContent />
    </Suspense>
  );
}

function BuecherContent() {
  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const [genreFilter, setGenreFilter] = useState(normalizeGenre(searchParams.get("genre") ?? ""));
  const [ageFilter, setAgeFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      setMessage("");
      try {
        const response = await fetch("/api/books/discover", { method: "GET" });
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
  }, []);

  const genres = useMemo(() => {
    const unique = new Set(
      books.flatMap((b) => (b.genre ?? "").split(",").map((g) => normalizeGenre(g.trim())).filter(Boolean)),
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "de"));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";
    return books.filter((book) => {
      const genreList = (book.genre ?? "").split(",").map((g) => normalizeGenre(g.trim()));
      const matchesGenre = !genreFilter || genreList.includes(genreFilter);
      const matchesAge = !hasAge || (book.ageFrom <= age && age <= book.ageTo);
      return matchesGenre && matchesAge;
    });
  }, [books, genreFilter, ageFilter]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1>Bücher entdecken</h1>

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
          <p>Lade Bücher ...</p>
        ) : filteredBooks.length === 0 ? (
          <p>Keine Bücher für den gewählten Filter gefunden.</p>
        ) : (
          <div className="grid gap-3 min-[1200px]:grid-cols-2">
            {filteredBooks.map((book, index) => (
              <Link
                href={`/buch/${book.id}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md"
                key={`${book.title}-${book.ownerUsername}-${book.createdAt}-${index}`}
              >
                <article className="rounded-lg border border-arena-border p-3 hover:border-gray-500">
                  <div className="grid grid-cols-[120px_1fr] items-start gap-3.5 max-[600px]:grid-cols-1">
                    <div className="grid h-auto w-[120px] place-items-center overflow-hidden rounded-lg border border-arena-border bg-arena-bg text-xs text-arena-muted max-[600px]:w-full max-[600px]:max-w-[180px]" style={{ aspectRatio: "3/4" }}>
                      {book.coverImageUrl ? (
                        <img src={`${book.coverImageUrl}${book.coverImageUrl.includes('?') ? '&' : '?'}w=240`} alt={`Cover von ${book.title}`} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <span>Kein Cover</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1.5 mt-0 truncate">{book.title}</h3>
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
        )}
      </section>
    </main>
  );
}
