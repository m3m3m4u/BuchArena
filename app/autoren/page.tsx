"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AuthorBook = { title: string; genre: string; ageFrom: number; ageTo: number };
type DiscoverAuthor = { username: string; displayName: string; profileImageUrl: string; books: AuthorBook[] };

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
    const unique = new Set(authors.flatMap((a) => a.books).map((b) => b.genre?.trim()).filter((g): g is string => Boolean(g)));
    return [...unique].sort((a, b) => a.localeCompare(b, "de"));
  }, [authors]);

  const filteredAuthors = useMemo(() => {
    const age = Number(ageFilter);
    const hasAge = Number.isFinite(age) && ageFilter.trim() !== "";
    return authors
      .map((a) => ({
        ...a,
        books: a.books.filter((b) => {
          const matchesGenre = !genreFilter || b.genre === genreFilter;
          const matchesAge = !hasAge || (b.ageFrom <= age && age <= b.ageTo);
          return matchesGenre && matchesAge;
        }),
      }))
      .filter((a) => a.books.length > 0);
  }, [authors, genreFilter, ageFilter]);

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
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {filteredAuthors.map((author) => (
              <Link
                key={author.username}
                href={`/autor/${encodeURIComponent(author.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted">
                      {author.profileImageUrl ? (
                        <img src={author.profileImageUrl} alt={`Profilbild von ${author.displayName}`} className="h-full w-full object-cover" />
                      ) : (
                        <span>Kein Bild</span>
                      )}
                    </div>
                    <div>
                      <h2 className="m-0 text-[1.05rem]">{author.displayName}</h2>
                      <p className="mt-0.5 text-sm font-semibold">
                        {author.books.length} passende{author.books.length === 1 ? "s Buch" : " Bücher"}
                      </p>
                      <ul className="m-0 mt-1.5 grid gap-1 p-0" style={{ listStyle: "none" }}>
                        {author.books.map((book) => (
                          <li key={`${author.username}-${book.title}`} className="text-sm leading-snug">
                            {book.title}
                            <span className="block text-xs text-gray-500">{book.genre}{(book.ageFrom > 0 || book.ageTo > 0) ? ` · ${book.ageFrom}–${book.ageTo} J.` : ""}</span>
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
