"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DiscoverBook = {
  id: string;
  ownerUsername: string;
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
  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/books/discover", {
          method: "GET",
        });

        const data = (await response.json()) as { books?: DiscoverBook[]; message?: string };
        if (!response.ok) {
          throw new Error(data.message ?? "Bücher konnten nicht geladen werden.");
        }

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
      books
        .map((book) => book.genre?.trim())
        .filter((genre): genre is string => Boolean(genre))
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "de"));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";

    return books.filter((book) => {
      const matchesGenre = !genreFilter || book.genre === genreFilter;
      const matchesAge = !hasAge || (book.ageFrom <= age && age <= book.ageTo);
      return matchesGenre && matchesAge;
    });
  }, [books, genreFilter, ageFilter]);

  return (
    <main className="top-centered-main">
      <section className="profile-card">
        <h1>Bücher entdecken</h1>

        <div className="books-filter-row">
          <label>
            Genre
            <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
              <option value="">Alle</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Alter
            <input
              type="number"
              min={0}
              value={ageFilter}
              onChange={(event) => setAgeFilter(event.target.value)}
              placeholder="z. B. 10"
            />
          </label>
        </div>

        {message && <p className="message error">{message}</p>}

        {isLoading ? (
          <p>Lade Bücher ...</p>
        ) : filteredBooks.length === 0 ? (
          <p>Keine Bücher für den gewählten Filter gefunden.</p>
        ) : (
          <div className="books-list">
            {filteredBooks.map((book, index) => (
              <Link
                href={`/buch/${book.id}`}
                className="book-item-link"
                key={`${book.title}-${book.ownerUsername}-${book.createdAt}-${index}`}
              >
                <article className="book-item">
                  <div className="book-item-layout">
                    <div className="book-list-cover">
                      {book.coverImageUrl ? (
                        <img src={book.coverImageUrl} alt={`Cover von ${book.title}`} />
                      ) : (
                        <span>Kein Cover</span>
                      )}
                    </div>

                    <div className="book-item-content">
                      <h3>{book.title}</h3>
                      <p>Autor: {book.ownerUsername}</p>
                      <p>Genre: {book.genre}</p>
                      <p>Alter: {book.ageFrom} bis {book.ageTo}</p>
                      <p>Erscheinungsjahr: {book.publicationYear}</p>
                      {book.publisher && <p>Verlag: {book.publisher}</p>}
                      {book.isbn && <p>ISBN: {book.isbn}</p>}
                      {book.pageCount > 0 && <p>Seitenanzahl: {book.pageCount}</p>}
                      {book.language && <p>Sprache: {book.language}</p>}
                      {book.description && <p>{book.description}</p>}
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
