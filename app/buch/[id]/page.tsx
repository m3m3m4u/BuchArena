"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BookExcerpt = {
  id: string;
  type: "text" | "mp3";
  title: string;
  content?: string;
  fileUrl?: string;
  createdAt: string;
};

type BookDetail = {
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
  presentationVideoInternal: boolean;
  excerpts: BookExcerpt[];
  createdAt: string;
};

type AuthorInfo = { username: string; name: string; imageUrl: string };
type PageProps = { params: Promise<{ id: string }> };

export default function BookDetailPage({ params }: PageProps) {
  const [bookId, setBookId] = useState("");
  const [book, setBook] = useState<BookDetail | null>(null);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => { params.then((r) => setBookId(r.id)); }, [params]);

  useEffect(() => {
    async function loadBook() {
      if (!bookId) return;
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch(`/api/books/get?id=${encodeURIComponent(bookId)}`, { method: "GET" });
        const data = (await res.json()) as { book?: BookDetail; author?: AuthorInfo; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Buch konnte nicht geladen werden.");
        setBook(data.book ?? null);
        setAuthor(data.author ?? null);
      } catch {
        setMessage("Buch konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadBook();
  }, [bookId]);

  return (
    <main className="top-centered-main">
      <section className="card">
        {isLoading ? (
          <p>Lade Buchdetails ...</p>
        ) : message ? (
          <p className="text-red-700">{message}</p>
        ) : book ? (
          <>
            <div className="mb-6 grid grid-cols-[200px_1fr] items-start gap-6 max-[600px]:grid-cols-1 max-[600px]:gap-4">
              <div className="grid w-[200px] place-items-center overflow-hidden rounded-lg border border-arena-border bg-arena-bg text-sm text-arena-muted max-[600px]:mx-auto max-[600px]:w-[160px]" style={{ aspectRatio: "3/4" }}>
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={`Cover von ${book.title}`} className="h-full w-full object-contain" />
                ) : (
                  <span>Kein Cover</span>
                )}
              </div>
              <div>
                <h1 className="mb-2.5">{book.title}{author && <span className="block text-base font-normal text-arena-muted mt-1">von {author.name || author.username}</span>}</h1>
                <div className="mt-2 space-y-1">
                  {author && (
                    <p className="my-1"><strong>Autor*in:</strong>{" "}
                      <Link href={`/autor/${author.username}`} className="no-underline text-inherit hover:underline">
                        {author.name || author.username}
                      </Link>
                    </p>
                  )}
                  {book.genre && <p className="my-1"><strong>Genre:</strong> <Link href={`/buecher?genre=${encodeURIComponent(book.genre)}`} className="no-underline text-inherit hover:underline">{book.genre}</Link></p>}
                  {(book.ageFrom > 0 || book.ageTo > 0) && <p className="my-1"><strong>Alter:</strong> {book.ageFrom} bis {book.ageTo}</p>}
                  {book.publicationYear > 0 && <p className="my-1"><strong>Erscheinungsjahr:</strong> {book.publicationYear}</p>}
                  {book.publisher && <p className="my-1"><strong>Verlag:</strong> {book.publisher}</p>}
                  {book.isbn && <p className="my-1"><strong>ISBN:</strong> {book.isbn}</p>}
                  {book.pageCount > 0 && <p className="my-1"><strong>Seitenanzahl:</strong> {book.pageCount}</p>}
                </div>
              </div>
            </div>

            {book.description && (
              <div className="mb-5">
                <h2 className="mb-2 text-lg">Beschreibung</h2>
                <p className="[overflow-wrap:break-word]">{book.description}</p>
              </div>
            )}

            {book.buyLinks.length > 0 && (
              <div className="mb-4">
                <h2 className="mb-2 text-lg">Kaufen</h2>
                <div className="flex flex-wrap gap-2">
                  {book.buyLinks.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="btn">
                      Jetzt kaufen
                    </a>
                  ))}
                </div>
              </div>
            )}

            {book.excerpts && book.excerpts.length > 0 && (
              <div className="mb-4">
                <h2 className="mb-2 text-lg">Textausschnitte</h2>
                <div className="flex flex-col gap-4">
                  {book.excerpts.map((ex) => (
                    <div key={ex.id} className="rounded-lg border border-arena-border-light bg-[#fafafa] p-4">
                      <h3 className="mb-2 mt-0 flex items-center gap-2 text-base">
                        {ex.title}
                        <span className="badge">{ex.type === "mp3" ? "MP3" : "Text"}</span>
                      </h3>
                      {ex.type === "text" && ex.content && (
                        <p className="m-0 max-h-[300px] overflow-y-auto whitespace-pre-wrap text-[0.95rem] leading-relaxed text-arena-text">{ex.content}</p>
                      )}
                      {ex.type === "mp3" && ex.fileUrl && (
                        <audio controls preload="none" className="w-full max-w-[400px]">
                          <source src={ex.fileUrl} type="audio/mpeg" />
                          Ihr Browser unterstützt kein Audio.
                        </audio>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {book.presentationVideoUrl && (
              <div className="mb-4">
                <h2 className="mb-2 text-lg">Vorstellungsvideo</h2>
                <Link
                  href={`/video?url=${encodeURIComponent(book.presentationVideoUrl)}&title=${encodeURIComponent(book.title)}`}
                  className="btn"
                >
                  Video ansehen
                </Link>
              </div>
            )}
          </>
        ) : (
          <p>Buch nicht gefunden.</p>
        )}
        <Link href="/buecher" className="btn mt-6">Zurück zu Bücher entdecken</Link>
      </section>
    </main>
  );
}
