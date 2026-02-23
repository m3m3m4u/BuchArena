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
        <section className="profile-card">
          <h1>Meine Bücher</h1>
          <p>Bitte zuerst anmelden.</p>
          <Link href="/auth" className="footer-button">
            Zur Anmeldung
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="centered-main">
      <section className="profile-card">
        <h1>Meine Bücher</h1>

        <button type="button" className="footer-button" onClick={openCreateOverlay}>
          Neues Buch anlegen
        </button>

        <p className={isError ? "message error" : "message"}>{message}</p>

        <h2>Meine angelegten Bücher</h2>
        {isLoading ? (
          <p>Lade Bücher ...</p>
        ) : books.length === 0 ? (
          <p>Noch keine Bücher angelegt.</p>
        ) : (
          <div className="books-list">
            {books.map((book, index) => (
              <article className="book-item" key={`${book.title}-${book.createdAt}-${index}`}>
                <div className="book-item-layout">
                  <div className="book-list-cover">
                    {book.coverImageUrl ? (
                      <img src={book.coverImageUrl} alt={`Cover von ${book.title}`} />
                    ) : (
                      <span>Kein Cover</span>
                    )}
                  </div>

                  <div className="book-item-content">
                    <h3>Titel: {book.title}</h3>
                    <p>
                      Erscheinungsjahr: {book.publicationYear}
                    </p>
                    <p>Genre: {book.genre}</p>
                    <p>
                      Alter: {book.ageFrom} bis {book.ageTo}
                    </p>
                    {book.publisher && <p>Verlag: {book.publisher}</p>}
                    {book.isbn && <p>ISBN: {book.isbn}</p>}
                    {book.pageCount !== undefined && book.pageCount > 0 && <p>Seitenanzahl: {book.pageCount}</p>}
                    {book.language && <p>Sprache: {book.language}</p>}
                    {book.description && <p>Beschreibung: {book.description}</p>}
                    {book.buyLinks.length > 0 && (
                      <div className="book-meta-row">
                        <strong>Kauf-Links:</strong>
                        <div className="book-meta-value book-links-inline">
                          {book.buyLinks.map((link) => (
                            <a key={link} href={link} target="_blank" rel="noreferrer">
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {book.presentationVideoUrl && (
                      <div className="book-meta-row">
                        <strong>YouTube-Link:</strong>
                        <div className="book-meta-value">
                          <Link
                            href={`/video?url=${encodeURIComponent(book.presentationVideoUrl)}&title=${encodeURIComponent(book.title)}`}
                          >
                            {book.presentationVideoUrl}
                          </Link>
                        </div>
                      </div>
                    )}

                    <div className="social-preview">
                      <button type="button" className="footer-button" onClick={() => onEditBook(book)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="footer-button"
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
          <section className="book-overlay" onClick={(event) => event.stopPropagation()}>
            <h2>{editingBookId ? "Buch bearbeiten" : "Neues Buch"}</h2>

            <div className="book-overlay-layout">
              <div className="books-grid">
                <label>
                  Titel
                  <input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>

                <label>
                  Erscheinungsjahr
                  <input
                    type="number"
                    value={publicationYear}
                    onChange={(event) => setPublicationYear(event.target.value)}
                  />
                </label>

                <label>
                  Genre
                  <input value={genre} onChange={(event) => setGenre(event.target.value)} />
                </label>

                <div className="books-age-row">
                  <label>
                    Alter von
                    <input
                      type="number"
                      value={ageFrom}
                      onChange={(event) => setAgeFrom(event.target.value)}
                    />
                  </label>
                  <label>
                    Alter bis
                    <input
                      type="number"
                      value={ageTo}
                      onChange={(event) => setAgeTo(event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Verlag
                  <input value={publisher} onChange={(event) => setPublisher(event.target.value)} />
                </label>

                <label>
                  ISBN
                  <input value={isbn} onChange={(event) => setIsbn(event.target.value)} />
                </label>

                <label>
                  Seitenanzahl
                  <input
                    type="number"
                    min={0}
                    value={pageCount}
                    onChange={(event) => setPageCount(event.target.value)}
                  />
                </label>

                <label>
                  Sprache
                  <input value={language} onChange={(event) => setLanguage(event.target.value)} />
                </label>

                <label>
                  Beschreibung
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                  />
                </label>

                <label>
                  Links zum Buch kaufen (ein Link pro Zeile)
                  <textarea
                    value={buyLinksText}
                    onChange={(event) => setBuyLinksText(event.target.value)}
                    rows={3}
                  />
                </label>

                <label>
                  Link zum Vorstellungsvideo (YouTube-Verlinkung)
                  <input
                    value={presentationVideoUrl}
                    onChange={(event) => setPresentationVideoUrl(event.target.value)}
                  />
                </label>
              </div>

              <div className="book-cover-column">
                <div className="book-cover-preview">
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Buchcover" />
                  ) : (
                    <span>Kein Cover</span>
                  )}
                </div>

                <label>
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

                {isUploadingCover && <span className="input-help">Cover wird hochgeladen ...</span>}

                {/* ── Textausschnitte ── */}
                {editingBookId && (
                  <div className="excerpt-section">
                    <h3>Textausschnitte</h3>

                    {currentBookExcerpts.length > 0 && (
                      <div className="excerpt-list">
                        {currentBookExcerpts.map((ex) => (
                          <div key={ex.id} className="excerpt-item">
                            <div className="excerpt-item-info">
                              <strong>{ex.title}</strong>
                              <span className="excerpt-badge">{ex.type === "mp3" ? "MP3" : "Text"}</span>
                            </div>
                            <button
                              type="button"
                              className="footer-button small"
                              onClick={() => onDeleteExcerpt(ex.id)}
                            >
                              Entfernen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="excerpt-form">
                      <label>
                        Titel des Ausschnitts
                        <input
                          value={excerptTitle}
                          onChange={(event) => setExcerptTitle(event.target.value)}
                          placeholder="z.B. Kapitel 1 – Leseprobe"
                        />
                      </label>

                      <div className="excerpt-type-row">
                        <label>
                          <input
                            type="radio"
                            name="excerptType"
                            value="text"
                            checked={excerptType === "text"}
                            onChange={() => setExcerptType("text")}
                          />
                          Text
                        </label>
                        <label>
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
                        <label>
                          Textinhalt
                          <textarea
                            value={excerptContent}
                            onChange={(event) => setExcerptContent(event.target.value)}
                            rows={5}
                            placeholder="Textausschnitt eingeben ..."
                          />
                        </label>
                      ) : (
                        <label>
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
                            <span className="input-help">{excerptFile.name}</span>
                          )}
                        </label>
                      )}

                      <button
                        type="button"
                        className="footer-button"
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

            <div className="social-preview">
              <button
                type="button"
                className="footer-button"
                onClick={onSaveBook}
                disabled={isSaving}
              >
                {isSaving ? "Speichern ..." : editingBookId ? "Buch speichern" : "Buch anlegen"}
              </button>
              <button type="button" className="footer-button" onClick={resetForm}>
                Abbrechen
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
