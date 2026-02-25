"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type Book = {
  id: string;
  ownerUsername: string;
  coverImageUrl: string;
  title: string;
  publicationYear: number;
  genre: string;
  ageFrom: number;
  ageTo: number;
  publisher?: string;
  isbn?: string;
  pageCount?: number;
  language?: string;
  description: string;
  buyLinks: string[];
  presentationVideoUrl: string;
  presentationVideoInternal: true;
  excerpts: BookExcerpt[];
  createdAt: string;
};

export default function MeineBuecherPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [genre, setGenre] = useState("");
  const [ageFrom, setAgeFrom] = useState("");
  const [ageTo, setAgeTo] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isbn, setIsbn] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [language, setLanguage] = useState("");
  const [description, setDescription] = useState("");
  const [buyLinksText, setBuyLinksText] = useState("");
  const [presentationVideoUrl, setPresentationVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isBookOverlayOpen, setIsBookOverlayOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  /* ── excerpt state ── */
  const [excerptTitle, setExcerptTitle] = useState("");
  const [excerptType, setExcerptType] = useState<"text" | "mp3">("text");
  const [excerptContent, setExcerptContent] = useState("");
  const [excerptFile, setExcerptFile] = useState<File | null>(null);
  const [isUploadingExcerpt, setIsUploadingExcerpt] = useState(false);
  const [currentBookExcerpts, setCurrentBookExcerpts] = useState<BookExcerpt[]>([]);

  useEffect(() => {
    function syncAccount() {
      setAccount(getStoredAccount());
    }

    syncAccount();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
    window.addEventListener("storage", syncAccount);

    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
      window.removeEventListener("storage", syncAccount);
    };
  }, []);

  useEffect(() => {
    async function loadBooks() {
      if (!account?.username) {
        setBooks([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/books/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerUsername: account.username }),
        });
        const data = (await response.json()) as { books?: Book[] };
        if (!response.ok) {
          throw new Error("Laden fehlgeschlagen");
        }
        setBooks(data.books ?? []);
      } catch {
        setIsError(true);
        setMessage("Bücher konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadBooks();
  }, [account]);

  async function refreshBooks(username: string) {
    const refresh = await fetch("/api/books/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUsername: username }),
    });
    const refreshData = (await refresh.json()) as { books?: Book[] };
    if (refresh.ok) {
      setBooks(refreshData.books ?? []);
    }
  }

  function resetForm() {
    setEditingBookId(null);
    setCoverImageUrl("");
    setTitle("");
    setPublicationYear("");
    setGenre("");
    setAgeFrom("");
    setAgeTo("");
    setPublisher("");
    setIsbn("");
    setPageCount("");
    setLanguage("");
    setDescription("");
    setBuyLinksText("");
    setPresentationVideoUrl("");
    setExcerptTitle("");
    setExcerptType("text");
    setExcerptContent("");
    setExcerptFile(null);
    setCurrentBookExcerpts([]);
    setIsBookOverlayOpen(false);
  }

  function openCreateOverlay() {
    setEditingBookId(null);
    setCoverImageUrl("");
    setTitle("");
    setPublicationYear("");
    setGenre("");
    setAgeFrom("");
    setAgeTo("");
    setPublisher("");
    setIsbn("");
    setPageCount("");
    setLanguage("");
    setDescription("");
    setBuyLinksText("");
    setPresentationVideoUrl("");
    setExcerptTitle("");
    setExcerptType("text");
    setExcerptContent("");
    setExcerptFile(null);
    setCurrentBookExcerpts([]);
    setIsBookOverlayOpen(true);
  }

  async function onSaveBook() {
    if (!account?.username) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const endpoint = editingBookId ? "/api/books/update" : "/api/books/create";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: editingBookId ?? undefined,
          ownerUsername: account.username,
          coverImageUrl,
          title,
          publicationYear: Number(publicationYear),
          genre,
          ageFrom: Number(ageFrom),
          ageTo: Number(ageTo),
          publisher,
          isbn,
          pageCount: Number(pageCount),
          language,
          description,
          buyLinks: buyLinksText
            .split(/\r?\n/)
            .map((entry) => entry.trim())
            .filter(Boolean),
          presentationVideoUrl,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          data.message ?? (editingBookId ? "Buch konnte nicht gespeichert werden." : "Buch konnte nicht angelegt werden.")
        );
      }

      setMessage(editingBookId ? "Buch gespeichert." : "Buch angelegt.");
      resetForm();
      await refreshBooks(account.username);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Buch konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }

  function onEditBook(book: Book) {
    setEditingBookId(book.id);
    setCoverImageUrl(book.coverImageUrl ?? "");
    setTitle(book.title);
    setPublicationYear(String(book.publicationYear));
    setGenre(book.genre);
    setAgeFrom(String(book.ageFrom));
    setAgeTo(String(book.ageTo));
    setPublisher(book.publisher ?? "");
    setIsbn(book.isbn ?? "");
    setPageCount(book.pageCount ? String(book.pageCount) : "");
    setLanguage(book.language ?? "");
    setDescription(book.description);
    setBuyLinksText(book.buyLinks.join("\n"));
    setPresentationVideoUrl(book.presentationVideoUrl);
    setCurrentBookExcerpts(book.excerpts ?? []);
    setExcerptTitle("");
    setExcerptType("text");
    setExcerptContent("");
    setExcerptFile(null);
    setIsBookOverlayOpen(true);
    setMessage("");
    setIsError(false);
  }

  async function onUploadExcerpt() {
    if (!account?.username || !editingBookId) {
      return;
    }

    setIsUploadingExcerpt(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("bookId", editingBookId);
      formData.append("username", account.username);
      formData.append("title", excerptTitle);
      formData.append("type", excerptType);

      if (excerptType === "mp3") {
        if (!excerptFile) {
          throw new Error("Bitte eine MP3-Datei auswählen.");
        }
        formData.append("file", excerptFile);
      } else {
        formData.append("content", excerptContent);
      }

      const response = await fetch("/api/books/upload-excerpt", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string; excerpt?: BookExcerpt };
      if (!response.ok) {
        throw new Error(data.message ?? "Textausschnitt konnte nicht hochgeladen werden.");
      }

      if (data.excerpt) {
        setCurrentBookExcerpts((prev) => [...prev, data.excerpt as BookExcerpt]);
      }

      setExcerptTitle("");
      setExcerptContent("");
      setExcerptFile(null);
      setMessage("Textausschnitt hinzugefügt.");
      await refreshBooks(account.username);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Textausschnitt konnte nicht hochgeladen werden.");
    } finally {
      setIsUploadingExcerpt(false);
    }
  }

  async function onDeleteExcerpt(excerptId: string) {
    if (!account?.username || !editingBookId) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/books/delete-excerpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: editingBookId,
          ownerUsername: account.username,
          excerptId,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Textausschnitt konnte nicht gelöscht werden.");
      }

      setCurrentBookExcerpts((prev) => prev.filter((e) => e.id !== excerptId));
      setMessage("Textausschnitt gelöscht.");
      await refreshBooks(account.username);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Textausschnitt konnte nicht gelöscht werden.");
    }
  }

  async function onUploadCover(file: File) {
    if (!account?.username) {
      return;
    }

    setIsUploadingCover(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", account.username);

      const response = await fetch("/api/books/upload-cover", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string; imageUrl?: string };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.message ?? "Cover-Upload fehlgeschlagen.");
      }

      setCoverImageUrl(data.imageUrl);
      setMessage("Cover hochgeladen.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Cover-Upload fehlgeschlagen.");
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function onDeleteBook(bookId: string) {
    if (!account?.username) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/books/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerUsername: account.username,
          bookId,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Buch konnte nicht gelöscht werden.");
      }

      if (editingBookId === bookId) {
        resetForm();
      }

      setMessage("Buch gelöscht.");
      await refreshBooks(account.username);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Buch konnte nicht gelöscht werden.");
    }
  }

  if (!account) {
    return (
      <main className="centered-main">
        <section className="card">
          <h1>Meine Bücher</h1>
          <p>Bitte zuerst anmelden.</p>
          <Link href="/auth" className="btn">
            Zur Anmeldung
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="centered-main">
      <section className="card">
        <h1>Meine Bücher</h1>

        <button type="button" className="btn" onClick={openCreateOverlay}>
          Neues Buch anlegen
        </button>

        <p className={isError ? "text-red-700" : ""}>{message}</p>

        <h2>Meine angelegten Bücher</h2>
        {isLoading ? (
          <p>Lade Bücher ...</p>
        ) : books.length === 0 ? (
          <p>Noch keine Bücher angelegt.</p>
        ) : (
          <div className="grid gap-3 min-[1200px]:grid-cols-2">
            {books.map((book, index) => (
              <article className="border border-arena-border rounded-lg p-3" key={`${book.title}-${book.createdAt}-${index}`}>
                <div className="grid grid-cols-[120px_1fr] gap-3.5 items-start max-[900px]:grid-cols-1">
                  <div
                    className="w-[120px] border border-arena-border rounded-lg overflow-hidden bg-arena-bg grid place-items-center text-xs text-arena-muted max-[900px]:w-[140px]"
                    style={{ aspectRatio: "3/4" }}
                  >
                    {book.coverImageUrl ? (
                      <img src={book.coverImageUrl} alt={`Cover von ${book.title}`} />
                    ) : (
                      <span>Kein Cover</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3>Titel: {book.title}</h3>
                    <p>
                      Erscheinungsjahr: {book.publicationYear}
                    </p>
                    <p>Genre: {book.genre}</p>
                    {(book.ageFrom > 0 || book.ageTo > 0) && (
                      <p>
                        Alter: {book.ageFrom} bis {book.ageTo}
                      </p>
                    )}
                    {book.publisher && <p>Verlag: {book.publisher}</p>}
                    {book.isbn && <p>ISBN: {book.isbn}</p>}
                    {book.pageCount !== undefined && book.pageCount > 0 && <p>Seitenanzahl: {book.pageCount}</p>}
                    {book.language && <p>Sprache: {book.language}</p>}
                    {book.description && <p>Beschreibung: {book.description}</p>}
                    {book.buyLinks.length > 0 && (
                      <div className="mt-1.5 grid grid-cols-[120px_1fr] gap-2 items-start">
                        <strong>Kauf-Links:</strong>
                        <div className="min-w-0 break-all grid gap-1">
                          {book.buyLinks.map((link) => (
                            <a key={link} href={link} target="_blank" rel="noreferrer">
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {book.presentationVideoUrl && (
                      <div className="mt-1.5 grid grid-cols-[120px_1fr] gap-2 items-start">
                        <strong>YouTube-Link:</strong>
                        <div className="min-w-0">
                          <Link
                            href={`/video?url=${encodeURIComponent(book.presentationVideoUrl)}&title=${encodeURIComponent(book.title)}`}
                          >
                            {book.presentationVideoUrl}
                          </Link>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button type="button" className="btn" onClick={() => onEditBook(book)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onDeleteBook(book.id)}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isBookOverlayOpen && (
        <div className="overlay-backdrop" onClick={resetForm}>
          <section className="w-[min(760px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5" onClick={(event) => event.stopPropagation()}>
            <h2>{editingBookId ? "Buch bearbeiten" : "Neues Buch"}</h2>

            <div className="grid grid-cols-[2fr_1fr] gap-4 items-start max-[900px]:grid-cols-1">
              <div className="grid gap-3">
                <label className="grid gap-1 text-[0.95rem]">
                  Titel
                  <input className="input-base" value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Erscheinungsjahr
                  <input
                    className="input-base"
                    type="number"
                    value={publicationYear}
                    onChange={(event) => setPublicationYear(event.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Genre
                  <input className="input-base" value={genre} onChange={(event) => setGenre(event.target.value)} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-[0.95rem]">
                    Alter von
                    <input
                      className="input-base"
                      type="number"
                      value={ageFrom}
                      onChange={(event) => setAgeFrom(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-[0.95rem]">
                    Alter bis
                    <input
                      className="input-base"
                      type="number"
                      value={ageTo}
                      onChange={(event) => setAgeTo(event.target.value)}
                    />
                  </label>
                </div>

                <label className="grid gap-1 text-[0.95rem]">
                  Verlag
                  <input className="input-base" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  ISBN
                  <input className="input-base" value={isbn} onChange={(event) => setIsbn(event.target.value)} />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Seitenanzahl
                  <input
                    className="input-base"
                    type="number"
                    min={0}
                    value={pageCount}
                    onChange={(event) => setPageCount(event.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Sprache
                  <input className="input-base" value={language} onChange={(event) => setLanguage(event.target.value)} />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Beschreibung
                  <textarea
                    className="input-base"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                  />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Links zum Buch kaufen (ein Link pro Zeile)
                  <textarea
                    className="input-base"
                    value={buyLinksText}
                    onChange={(event) => setBuyLinksText(event.target.value)}
                    rows={3}
                  />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Link zum Vorstellungsvideo (YouTube-Verlinkung)
                  <input
                    className="input-base"
                    value={presentationVideoUrl}
                    onChange={(event) => setPresentationVideoUrl(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-2.5">
                <div
                  className="w-full border border-arena-border rounded-lg overflow-hidden grid place-items-center bg-arena-bg"
                  style={{ aspectRatio: "3/4" }}
                >
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Buchcover" />
                  ) : (
                    <span>Kein Cover</span>
                  )}
                </div>

                <label className="grid gap-1 text-[0.95rem]">
                  Cover hochladen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onUploadCover(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {isUploadingCover && <span className="text-xs text-arena-muted">Cover wird hochgeladen ...</span>}

                {/* ── Textausschnitte ── */}
                {editingBookId && (
                  <div className="mt-5 pt-4 border-t border-arena-border-light">
                    <h3>Textausschnitte</h3>

                    {currentBookExcerpts.length > 0 && (
                      <div className="flex flex-col gap-2 mb-4">
                        {currentBookExcerpts.map((ex) => (
                          <div key={ex.id} className="flex items-center justify-between gap-2.5 px-3 py-2 bg-[#f9f9f9] border border-arena-border-light rounded-md">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <strong>{ex.title}</strong>
                              <span className="badge">{ex.type === "mp3" ? "MP3" : "Text"}</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => onDeleteExcerpt(ex.id)}
                            >
                              Entfernen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      <label className="grid gap-1 text-[0.95rem]">
                        Titel des Ausschnitts
                        <input
                          className="input-base"
                          value={excerptTitle}
                          onChange={(event) => setExcerptTitle(event.target.value)}
                          placeholder="z.B. Kapitel 1 – Leseprobe"
                        />
                      </label>

                      <div className="flex gap-5 items-center">
                        <label className="flex items-center gap-1 cursor-pointer font-normal">
                          <input
                            type="radio"
                            name="excerptType"
                            value="text"
                            checked={excerptType === "text"}
                            onChange={() => setExcerptType("text")}
                          />
                          Text
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer font-normal">
                          <input
                            type="radio"
                            name="excerptType"
                            value="mp3"
                            checked={excerptType === "mp3"}
                            onChange={() => setExcerptType("mp3")}
                          />
                          MP3-Datei
                        </label>
                      </div>

                      {excerptType === "text" ? (
                        <label className="grid gap-1 text-[0.95rem]">
                          Textinhalt
                          <textarea
                            className="input-base"
                            value={excerptContent}
                            onChange={(event) => setExcerptContent(event.target.value)}
                            rows={5}
                            placeholder="Textausschnitt eingeben ..."
                          />
                        </label>
                      ) : (
                        <label className="grid gap-1 text-[0.95rem]">
                          MP3-Datei hochladen
                          <input
                            type="file"
                            accept=".mp3,audio/mpeg"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setExcerptFile(file);
                              event.currentTarget.value = "";
                            }}
                          />
                          {excerptFile && (
                            <span className="text-xs text-arena-muted">{excerptFile.name}</span>
                          )}
                        </label>
                      )}

                      <button
                        type="button"
                        className="btn"
                        onClick={onUploadExcerpt}
                        disabled={isUploadingExcerpt}
                      >
                        {isUploadingExcerpt ? "Wird hochgeladen ..." : "Textausschnitt hinzufügen"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn"
                onClick={onSaveBook}
                disabled={isSaving}
              >
                {isSaving ? "Speichern ..." : editingBookId ? "Buch speichern" : "Buch anlegen"}
              </button>
              <button type="button" className="btn" onClick={resetForm}>
                Abbrechen
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
