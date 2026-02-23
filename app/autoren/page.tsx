"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AuthorBook = {
  title: string;
  genre: string;
  ageFrom: number;
  ageTo: number;
};

type DiscoverAuthor = {
  username: string;
  profileImageUrl: string;
  books: AuthorBook[];
};

export default function AutorenPage() {
  const [authors, setAuthors] = useState<DiscoverAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAuthors() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/authors/discover", {
          method: "GET",
        });

        const data = (await response.json()) as {
          authors?: DiscoverAuthor[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message ?? "Autoren konnten nicht geladen werden.");
        }

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
      authors
        .flatMap((author) => author.books)
        .map((book) => book.genre?.trim())
        .filter((genre): genre is string => Boolean(genre))
    );

    return [...unique].sort((a, b) => a.localeCompare(b, "de"));
  }, [authors]);

  const filteredAuthors = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";

    return authors
      .map((author) => {
        const matchingBooks = author.books.filter((book) => {
          const matchesGenre = !genreFilter || book.genre === genreFilter;
          const matchesAge = !hasAge || (book.ageFrom <= age && age <= book.ageTo);
          return matchesGenre && matchesAge;
        });

        return {
          ...author,
          books: matchingBooks,
        };
      })
      .filter((author) => author.books.length > 0);
  }, [authors, genreFilter, ageFilter]);

  return (
    <main className="top-centered-main">
      <section className="profile-card">
        <h1>Autoren entdecken</h1>

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
          <p>Lade Autoren ...</p>
        ) : filteredAuthors.length === 0 ? (
          <p>Keine Autoren für den gewählten Filter gefunden.</p>
        ) : (
          <div className="authors-list">
            {filteredAuthors.map((author) => (
              <Link
                key={author.username}
                href={`/autor/${encodeURIComponent(author.username)}`}
                className="author-item-link"
              >
                <article className="author-item">
                  <div className="author-header">
                    <div className="author-avatar">
                      {author.profileImageUrl ? (
                        <img src={author.profileImageUrl} alt={`Profilbild von ${author.username}`} />
                      ) : (
                        <span>Kein Bild</span>
                      )}
                    </div>

                    <div>
                      <h2>{author.username}</h2>
                      <p className="author-book-count">{author.books.length} passende{author.books.length === 1 ? "s Buch" : " Bücher"}</p>
                      <ul className="author-book-titles">
                        {author.books.map((book) => (
                          <li key={`${author.username}-${book.title}`}>
                            {book.title}
                            <span className="author-book-meta">{book.genre} · {book.ageFrom}–{book.ageTo} J.</span>
                          </li>
                        ))}
                      </ul>
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
