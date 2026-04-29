"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AmazonBookRow = {
  id: string;
  title: string;
  author: string;
  amazonUrls: string[];
  amazonUrlOverride: string;
  effectiveAmazonUrls: string[];
};

function normalizeHref(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function AmazonAdminClient() {
  const [books, setBooks] = useState<AmazonBookRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/amazon", { method: "GET" });
      const data = (await response.json()) as { books?: AmazonBookRow[]; message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Amazon-Links konnten nicht geladen werden.");
      }

      const nextBooks = data.books ?? [];
      setBooks(nextBooks);
      setDrafts(Object.fromEntries(nextBooks.map((book) => [book.id, book.amazonUrlOverride ?? ""])));

    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Amazon-Links konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const changedIds = useMemo(() => {
    return new Set(
      books
        .filter((book) => (drafts[book.id] ?? "") !== (book.amazonUrlOverride ?? ""))
        .map((book) => book.id)
    );
  }, [books, drafts]);

  async function saveBook(id: string) {
    setSavingId(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/amazon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, amazonUrlOverride: drafts[id] ?? "" }),
      });
      const data = (await response.json()) as { book?: AmazonBookRow; message?: string };
      if (!response.ok || !data.book) {
        throw new Error(data.message ?? "Amazon-Link konnte nicht gespeichert werden.");
      }

      setBooks((current) => current.map((book) => (book.id === id ? data.book! : book)));
      setDrafts((current) => ({ ...current, [id]: data.book!.amazonUrlOverride ?? "" }));
      setMessage(data.message ?? "Amazon-Link gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Amazon-Link konnte nicht gespeichert werden.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="top-centered-main">
      <section className="card gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1>Amazon-Links verwalten</h1>
            <p className="text-arena-muted mt-1">
              Der Autoren-Link bleibt gespeichert. Verlinkt wird auf den alternativen Amazon-Link, wenn du hier einen einträgst.
            </p>
          </div>
          <Link href="/admin" className="text-arena-link no-underline">← Zurück zum Admin</Link>
        </div>

        {message ? <p className="text-sm text-arena-muted m-0">{message}</p> : null}

        {loading ? (
          <p>Lade Amazon-Links...</p>
        ) : books.length === 0 ? (
          <p className="text-arena-muted">Keine Bücher mit Amazon-Link gefunden.</p>
        ) : (
          <div className="grid gap-3">
            {books.map((book) => {
              const draftValue = drafts[book.id] ?? "";
              const hasChanges = changedIds.has(book.id);
              const isSaving = savingId === book.id;

              return (
                <article key={book.id} className="rounded-lg border border-arena-border-light p-4 grid gap-3">
                  <div>
                    <h2 className="m-0 text-lg">{book.title}</h2>
                    <p className="m-0 mt-1 text-arena-muted">{book.author}</p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div>
                      <strong>Autoren-Link{book.amazonUrls.length !== 1 ? `e (${book.amazonUrls.length})` : ""}:</strong>
                      {book.amazonUrls.length === 0 ? (
                        <span className="text-arena-muted"> Kein Amazon-Link hinterlegt.</span>
                      ) : (
                        <ul className="m-0 mt-1 pl-4 grid gap-0.5">
                          {book.amazonUrls.map((url) => (
                            <li key={url}>
                              <a href={normalizeHref(url)} target="_blank" rel="noopener noreferrer" className="text-arena-link break-all">
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <strong>Aktive Links:</strong>
                      {book.effectiveAmazonUrls.length === 0 ? (
                        <span className="text-arena-muted"> Kein aktiver Link.</span>
                      ) : (
                        <ul className="m-0 mt-1 pl-4 grid gap-0.5">
                          {book.effectiveAmazonUrls.map((url) => (
                            <li key={url}>
                              <a href={normalizeHref(url)} target="_blank" rel="noopener noreferrer" className="text-arena-link break-all">
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Alternativer Amazon-Link</span>
                    <input
                      type="url"
                      value={draftValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDrafts((current) => ({ ...current, [book.id]: value }));
                      }}
                      placeholder="https://www.amazon.de/..."
                      className="w-full rounded-lg border border-arena-border px-3 py-2"
                    />
                  </label>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => void saveBook(book.id)}
                      disabled={!hasChanges || isSaving}
                      className="btn btn-sm btn-primary"
                    >
                      {isSaving ? "Speichert..." : "Speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrafts((current) => ({ ...current, [book.id]: "" }))}
                      disabled={isSaving || !draftValue}
                      className="btn btn-sm"
                    >
                      Override entfernen
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}