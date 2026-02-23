"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BookDetail = {
  id: string;
  ownerUsername: string;
  coverImageUrl: string;
  title: string;
  publicationYear: number;
  genre: string;
  ageFrom: number;
  ageTo: number;
  description: string;
  buyLinks: string[];
  presentationVideoUrl: string;
  presentationVideoInternal: boolean;
  createdAt: string;
};

type AuthorInfo = {
  username: string;
  imageUrl: string;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function BookDetailPage({ params }: PageProps) {
  const [bookId, setBookId] = useState("");
  const [book, setBook] = useState<BookDetail | null>(null);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setBookId(resolved.id);
    }

    void resolveParams();
  }, [params]);

  useEffect(() => {
    async function loadBook() {
      if (!bookId) {
        return;
      }

      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/books/get?id=${encodeURIComponent(bookId)}`,
          { method: "GET" }
        );

        const data = (await response.json()) as {
          book?: BookDetail;
          author?: AuthorInfo;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message ?? "Buch konnte nicht geladen werden.");
        }

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
      <section className="profile-card">
        {isLoading ? (
          <p>Lade Buchdetails ...</p>
        ) : message ? (
          <p className="message error">{message}</p>
        ) : book ? (
          <>
            <div className="book-detail-header">
              <div className="book-detail-cover">
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={`Cover von ${book.title}`} />
                ) : (
                  <span>Kein Cover</span>
                )}
              </div>

              <div className="book-detail-info">
                <h1>{book.title}</h1>

                {author && (
                  <Link href={`/autor/${author.username}`} className="book-detail-author">
                    {author.imageUrl && (
                      <img
                        src={author.imageUrl}
                        alt={author.username}
                        className="book-detail-author-avatar"
                      />
                    )}
                    <span>{author.username}</span>
                  </Link>
                )}

                <div className="book-detail-meta">
                  {book.genre && <p><strong>Genre:</strong> {book.genre}</p>}
                  {(book.ageFrom > 0 || book.ageTo > 0) && (
                    <p><strong>Alter:</strong> {book.ageFrom} bis {book.ageTo}</p>
                  )}
                  {book.publicationYear > 0 && (
                    <p><strong>Erscheinungsjahr:</strong> {book.publicationYear}</p>
                  )}
                </div>
              </div>
            </div>

            {book.description && (
              <div className="book-detail-description">
                <h2>Beschreibung</h2>
                <p>{book.description}</p>
              </div>
            )}

            {book.buyLinks.length > 0 && (
              <div className="book-detail-section">
                <h2>Kaufen</h2>
                <div className="book-links-inline">
                  {book.buyLinks.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {book.presentationVideoUrl && (
              <div className="book-detail-section">
                <h2>Vorstellungsvideo</h2>
                <Link
                  href={`/video?url=${encodeURIComponent(book.presentationVideoUrl)}&title=${encodeURIComponent(book.title)}`}
                  className="footer-button"
                >
                  Video ansehen
                </Link>
              </div>
            )}
          </>
        ) : (
          <p>Buch nicht gefunden.</p>
        )}

        <Link href="/buecher" className="footer-button" style={{ marginTop: "1.5rem" }}>
          Zurück zu Bücher entdecken
        </Link>
      </section>
    </main>
  );
}
