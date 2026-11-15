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

type FilterMode = "alle" | "ohne" | "mit";

export default function AmazonAdminClient() {
  const [books, setBooks] = useState<AmazonBookRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [unclaimedExcludedCount, setUnclaimedExcludedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("alle");

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/amazon", { method: "GET" });
      const data = (await response.json()) as {
        books?: AmazonBookRow[];
        unclaimedExcludedCount?: number;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message ?? "Amazon-Links konnten nicht geladen werden.");
      }

      const nextBooks = data.books ?? [];
      setBooks(nextBooks);
      setDrafts(Object.fromEntries(nextBooks.map((book) => [book.id, book.amazonUrlOverride ?? ""])));
      setUnclaimedExcludedCount(data.unclaimedExcludedCount ?? 0);
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

  const filteredBooks = useMemo(() => {
    if (filter === "mit") return books.filter((b) => b.amazonUrlOverride);
    if (filter === "ohne") return books.filter((b) => !b.amazonUrlOverride);
    return books;
  }, [books, filter]);

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
      <section className="card gap-4 font-sans">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-sans text-2xl font-bold text-arena-blue tracking-tight m-0">
              Amazon-Links verwalten (Registrierte Autoren)
            </h1>
            <p className="text-arena-muted text-sm mt-1">
              Hier verwaltest du alternative Amazon-Affiliate-Links für Bücher von <strong>registrierten Autoren</strong>.
              Bücher von Katalogautoren sind automatisch ausgeschlossen, da diese bereits mit deinen BuchArena-Affiliate-Links importiert wurden.
            </p>
          </div>
          <Link href="/admin" className="btn btn-sm font-sans" title="Zurück zur Admin-Zentrale">
            ← Admin
          </Link>
        </div>

        {unclaimedExcludedCount > 0 && (
          <div className="text-xs bg-blue-50 text-blue-800 border border-blue-200/80 rounded-xl p-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              <strong>{unclaimedExcludedCount} Bücher von Katalogautoren</strong> werden hier nicht aufgeführt, da sie bereits deine Partnerprogramm-Links nutzen.
            </span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(["alle", "ohne", "mit"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`btn btn-sm${filter === mode ? " btn-primary" : ""}`}
            >
              {mode === "alle" ? "Alle" : mode === "mit" ? "Nur mit alternativem Link" : "Nur ohne alternativen Link"}
            </button>
          ))}
        </div>

        {message ? <p className="text-sm text-arena-muted m-0">{message}</p> : null}

        {loading ? (
          <p>Lade Amazon-Links...</p>
        ) : books.length === 0 ? (
          <p className="text-arena-muted">Keine Bücher von registrierten Autoren mit Amazon-Link gefunden.</p>
        ) : (
          <div className="grid gap-3">
            {filteredBooks.map((book) => {
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
                      <strong>Autoren-Link:</strong>
                      {book.amazonUrls.length === 0 ? (
                        <span className="text-arena-muted"> Kein Amazon-Link hinterlegt.</span>
                      ) : (
                        <span className="ml-1">
                          <a href={normalizeHref(book.amazonUrls[0])} target="_blank" rel="noopener noreferrer" className="text-arena-link">
                            {book.amazonUrls[0].length > 40 ? book.amazonUrls[0].slice(0, 40) + "…" : book.amazonUrls[0]}
                          </a>
                          {book.amazonUrls.length > 1 && <span className="text-arena-muted ml-1">+{book.amazonUrls.length - 1} weitere</span>}
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>Aktiver Link:</strong>
                      {book.effectiveAmazonUrls.length === 0 ? (
                        <span className="text-arena-muted"> Kein aktiver Link.</span>
                      ) : (
                        <span className="ml-1">
                          <a href={normalizeHref(book.effectiveAmazonUrls[0])} target="_blank" rel="noopener noreferrer" className="text-arena-link">
                            {book.effectiveAmazonUrls[0].length > 40 ? book.effectiveAmazonUrls[0].slice(0, 40) + "…" : book.effectiveAmazonUrls[0]}
                          </a>
                        </span>
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