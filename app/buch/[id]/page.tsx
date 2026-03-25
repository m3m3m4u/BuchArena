"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { normalizeGenre } from "@/lib/genres";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";

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

type Empfehlung = {
  id: string;
  username: string;
  displayName: string;
  text: string;
  createdAt: string;
};

export default function BookDetailPage({ params }: PageProps) {
  const [bookId, setBookId] = useState("");
  const [book, setBook] = useState<BookDetail | null>(null);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [empfehlungen, setEmpfehlungen] = useState<Empfehlung[]>([]);
  const [empText, setEmpText] = useState("");
  const [empBusy, setEmpBusy] = useState(false);
  const [empMsg, setEmpMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    function sync() { setAccount(getStoredAccount()); }
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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

  /* ── Empfehlungen laden ── */
  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/empfehlungen?bookId=${encodeURIComponent(bookId)}`)
      .then((r) => r.json())
      .then((d: { empfehlungen?: Empfehlung[] }) => setEmpfehlungen(d.empfehlungen ?? []))
      .catch(() => {});
  }, [bookId]);

  async function reloadEmpfehlungen() {
    const r = await fetch(`/api/books/empfehlungen?bookId=${encodeURIComponent(bookId)}`);
    const d = (await r.json()) as { empfehlungen?: Empfehlung[] };
    setEmpfehlungen(d.empfehlungen ?? []);
  }

  async function submitEmpfehlung() {
    if (!empText.trim()) return;
    setEmpBusy(true);
    setEmpMsg("");
    try {
      const res = await fetch("/api/books/empfehlungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, text: empText.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler.");
      setEmpMsg(data.message ?? "Gespeichert!");
      setEmpText("");
      await reloadEmpfehlungen();
    } catch (err) {
      setEmpMsg(err instanceof Error ? err.message : "Fehler beim Speichern.");
    } finally {
      setEmpBusy(false);
    }
  }

  async function deleteEmpfehlung(id: string) {
    if (!confirm("Empfehlung wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/books/empfehlungen?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler.");
      await reloadEmpfehlungen();
    } catch (err) {
      setEmpMsg(err instanceof Error ? err.message : "Fehler beim Löschen.");
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    setEmpBusy(true);
    try {
      const res = await fetch("/api/books/empfehlungen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text: editText.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler.");
      setEditingId(null);
      setEditText("");
      await reloadEmpfehlungen();
    } catch (err) {
      setEmpMsg(err instanceof Error ? err.message : "Fehler beim Bearbeiten.");
    } finally {
      setEmpBusy(false);
    }
  }

  const alreadyRecommended = account
    ? empfehlungen.some((e) => e.username === account.username)
    : false;
  const isBookOwner = account?.username === book?.ownerUsername;

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
              <div className="w-[200px] overflow-hidden rounded-lg border border-arena-border bg-arena-bg text-sm text-arena-muted max-[600px]:mx-auto max-[600px]:w-[150px] max-[380px]:w-[120px]">
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={`Cover von ${book.title}`} className="w-full h-auto object-contain" />
                ) : (
                  <div className="grid place-items-center" style={{ aspectRatio: "3/4" }}>
                    <span>Kein Cover</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="mb-2.5">{book.title}{author && <span className="block text-base font-normal text-arena-muted mt-1">von {author.name || author.username}</span>}</h1>
                {empfehlungen.length > 0 && (
                  <div className="mb-3 flex items-center gap-1.5" title={`${empfehlungen.length} Empfehlung${empfehlungen.length !== 1 ? "en" : ""}`}>
                    <span className="text-xl leading-none">❤️</span>
                    <span className="text-base font-semibold text-red-600">{empfehlungen.length}</span>
                    <span className="text-sm text-arena-muted">{empfehlungen.length === 1 ? "Empfehlung" : "Empfehlungen"}</span>
                  </div>
                )}
                <div className="mt-2 space-y-1">
                  {author && (
                    <p className="my-1"><strong>Autor*in:</strong>{" "}
                      <Link href={`/autor/${author.username}`} className="no-underline text-inherit hover:underline">
                        {author.name || author.username}
                      </Link>
                    </p>
                  )}
                  {book.genre && <p className="my-1"><strong>Genre:</strong> {book.genre.split(",").map((g) => normalizeGenre(g.trim())).filter(Boolean).map((g, i) => (<span key={g}>{i > 0 && ", "}<Link href={`/buecher?genre=${encodeURIComponent(g)}`} className="no-underline text-inherit hover:underline">{g}</Link></span>))}</p>}
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
                <p className="whitespace-pre-line [overflow-wrap:break-word]">{book.description}</p>
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

            {/* ── Empfehlungen ── */}
            <div className="mt-8">
              <h2 className="mb-3 text-lg">Empfehlungen</h2>

              {account && !alreadyRecommended && (
                <div className="mb-4 rounded-lg border border-arena-border-light bg-[#fafafa] p-4">
                  <textarea
                    className="input w-full"
                    rows={3}
                    maxLength={2000}
                    placeholder="Schreibe eine Empfehlung für dieses Buch …"
                    value={empText}
                    onChange={(e) => setEmpText(e.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      className="btn"
                      disabled={empBusy || !empText.trim()}
                      onClick={submitEmpfehlung}
                    >
                      {empBusy ? "Wird gespeichert …" : "Empfehlung abschicken"}
                    </button>
                    {empMsg && <span className="text-sm text-arena-muted">{empMsg}</span>}
                  </div>
                  <p className="mt-1 text-xs text-arena-muted">+1 Lesezeichen für dich und den Autor (max. 3 pro Tag)</p>
                </div>
              )}

              {account && alreadyRecommended && !empMsg && (
                <p className="mb-4 text-sm text-arena-muted">Du hast dieses Buch bereits empfohlen.</p>
              )}
              {empMsg && !empBusy && <p className="mb-4 text-sm text-arena-muted">{empMsg}</p>}

              {empfehlungen.length === 0 ? (
                <p className="text-sm text-arena-muted">Noch keine Empfehlungen. {!account && "Melde dich an, um die erste zu schreiben!"}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {empfehlungen.map((e) => {
                    const isOwn = account?.username === e.username;
                    const canDelete = isOwn || isBookOwner;
                    const isEditing = editingId === e.id;

                    return (
                      <div key={e.id} className="rounded-lg border border-arena-border-light bg-[#fafafa] p-4">
                        <div className="mb-1 flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium">{e.displayName}</span>
                          <span className="text-xs text-arena-muted">
                            {new Date(e.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          {account && (isOwn || canDelete) && !isEditing && (
                            <span className="ml-auto flex gap-2 text-xs">
                              {isOwn && (
                                <button
                                  className="text-arena-muted hover:text-arena-text underline"
                                  onClick={() => { setEditingId(e.id); setEditText(e.text); }}
                                >
                                  Bearbeiten
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="text-red-600 hover:text-red-800 underline"
                                  onClick={() => deleteEmpfehlung(e.id)}
                                >
                                  Löschen
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <div>
                            <textarea
                              className="input w-full"
                              rows={3}
                              maxLength={2000}
                              value={editText}
                              onChange={(ev) => setEditText(ev.target.value)}
                            />
                            <div className="mt-2 flex gap-2">
                              <button className="btn" disabled={empBusy || !editText.trim()} onClick={() => saveEdit(e.id)}>
                                {empBusy ? "Speichern …" : "Speichern"}
                              </button>
                              <button className="btn" onClick={() => { setEditingId(null); setEditText(""); }}>
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="m-0 whitespace-pre-line text-[0.95rem] [overflow-wrap:break-word]">{e.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <p>Buch nicht gefunden.</p>
        )}
        <Link href="/buecher" className="btn mt-6">Zurück zu Bücher entdecken</Link>
      </section>
    </main>
  );
}
