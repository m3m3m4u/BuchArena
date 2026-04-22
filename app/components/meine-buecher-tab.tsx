"use client";

import { ProgressiveImage } from "@/app/components/progressive-image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import GenrePicker, { parseGenres } from "@/app/components/genre-picker";
import { showLesezeichenToast } from "@/app/components/lesezeichen-toast";

type BookExcerpt = {
  id: string;
  type: "text" | "mp3";
  title: string;
  content?: string;
  fileUrl?: string;
  createdAt: string;
};

type CoAuthor = {
  username: string;
  status: "pending" | "confirmed" | "declined";
  invitedAt: string;
  confirmedAt?: string;
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
  presentationVideoInternal: boolean;
  excerpts: BookExcerpt[];
  coAuthors: CoAuthor[];
  createdAt: string;
};

type MeineBuecherTabProps = {
  username: string;
};

export default function MeineBuecherTab({ username }: MeineBuecherTabProps) {
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
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isBookOverlayOpen, setIsBookOverlayOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  /* ── co-author state ── */
  const [coAuthorInput, setCoAuthorInput] = useState("");
  const [coAuthorBusy, setCoAuthorBusy] = useState(false);
  const [coAuthorMsg, setCoAuthorMsg] = useState("");
  const [coAuthorIsError, setCoAuthorIsError] = useState(false);
  const [currentCoAuthors, setCurrentCoAuthors] = useState<CoAuthor[]>([]);
  // Beim Anlegen: Liste der Benutzernamen, die nach dem Speichern eingeladen werden
  const [pendingCoAuthorUsernames, setPendingCoAuthorUsernames] = useState<string[]>([]);

  /* ── excerpt state ── */
  const [excerptTitle, setExcerptTitle] = useState("");
  const [excerptType, setExcerptType] = useState<"text" | "mp3">("text");
  const [excerptContent, setExcerptContent] = useState("");
  const [excerptFile, setExcerptFile] = useState<File | null>(null);
  const [isUploadingExcerpt, setIsUploadingExcerpt] = useState(false);
  const [currentBookExcerpts, setCurrentBookExcerpts] = useState<BookExcerpt[]>([]);

  useEffect(() => {
    async function loadBooks() {
      if (!username) {
        setBooks([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/books/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerUsername: username }),
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
  }, [username]);

  async function refreshBooks() {
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
    setCoAuthorInput("");
    setCoAuthorMsg("");
    setCoAuthorIsError(false);
    setCurrentCoAuthors([]);
    setPendingCoAuthorUsernames([]);
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
    setCoAuthorInput("");
    setCoAuthorMsg("");
    setCoAuthorIsError(false);
    setCurrentCoAuthors([]);
    setPendingCoAuthorUsernames([]);
    setIsBookOverlayOpen(true);
  }

  async function onSaveBook() {
    if (!username) return;

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
          ownerUsername: username,
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

      const data = (await response.json()) as { message?: string; lesezeichen?: number; bookId?: string };
      if (!response.ok) {
        throw new Error(
          data.message ?? (editingBookId ? "Buch konnte nicht gespeichert werden." : "Buch konnte nicht angelegt werden.")
        );
      }

      if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);

      // Beim Anlegen: Mitautoren einladen
      if (!editingBookId && data.bookId && pendingCoAuthorUsernames.length > 0) {
        for (const coAuthorUsername of pendingCoAuthorUsernames) {
          await fetch("/api/books/co-authors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId: data.bookId, coAuthorUsername }),
          }).catch(() => {});
        }
      }

      setMessage(editingBookId ? "Buch gespeichert." : "Buch angelegt.");
      resetForm();
      await refreshBooks();
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
    setCoAuthorInput("");
    setCoAuthorMsg("");
    setCoAuthorIsError(false);
    setCurrentCoAuthors(book.coAuthors ?? []);
    setExcerptTitle("");
    setExcerptType("text");
    setExcerptContent("");
    setExcerptFile(null);
    setIsBookOverlayOpen(true);
    setMessage("");
    setIsError(false);
  }

  async function onUploadExcerpt() {
    if (!username || !editingBookId) return;

    if (excerptType === "mp3" && excerptFile && excerptFile.size > 50 * 1024 * 1024) {
      setIsError(true);
      setMessage("Die MP3-Datei darf maximal 50 MB groß sein.");
      return;
    }

    setIsUploadingExcerpt(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("bookId", editingBookId);
      formData.append("username", username);
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

      if (response.status === 413) {
        throw new Error("Die Datei ist zu groß. Bitte eine kleinere Datei wählen.");
      }

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
      await refreshBooks();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Textausschnitt konnte nicht hochgeladen werden.");
    } finally {
      setIsUploadingExcerpt(false);
    }
  }

  async function onDeleteExcerpt(excerptId: string) {
    if (!username || !editingBookId) return;

    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/books/delete-excerpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: editingBookId,
          ownerUsername: username,
          excerptId,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Textausschnitt konnte nicht gelöscht werden.");
      }

      setCurrentBookExcerpts((prev) => prev.filter((e) => e.id !== excerptId));
      setMessage("Textausschnitt gelöscht.");
      await refreshBooks();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Textausschnitt konnte nicht gelöscht werden.");
    }
  }

  async function onUploadCover(file: File) {
    if (!username) return;

    if (file.size > 10 * 1024 * 1024) {
      setIsError(true);
      setMessage("Das Cover-Bild darf maximal 10 MB groß sein.");
      return;
    }

    setIsUploadingCover(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", username);

      const response = await fetch("/api/books/upload-cover", {
        method: "POST",
        body: formData,
      });

      if (response.status === 413) {
        throw new Error("Das Bild ist zu groß. Bitte ein kleineres Bild wählen (max. 10 MB).");
      }

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
    if (!username) return;

    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/books/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerUsername: username,
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
      await refreshBooks();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Buch konnte nicht gelöscht werden.");
    }
  }

  async function onInviteCoAuthor() {
    if (!username || !editingBookId || !coAuthorInput.trim()) return;
    setCoAuthorBusy(true);
    setCoAuthorMsg("");
    setCoAuthorIsError(false);
    try {
      const res = await fetch("/api/books/co-authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: editingBookId, coAuthorUsername: coAuthorInput.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Einladen.");
      setCoAuthorMsg(data.message ?? "Einladung gesendet!");
      setCoAuthorInput("");
      // Mitautoren-Liste aktualisieren
      const refreshed = await fetch("/api/books/list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerUsername: username }) });
      const refreshedData = (await refreshed.json()) as { books?: Book[] };
      const updatedBook = refreshedData.books?.find((b) => b.id === editingBookId);
      if (updatedBook) setCurrentCoAuthors(updatedBook.coAuthors ?? []);
      await refreshBooks();
    } catch (err) {
      setCoAuthorIsError(true);
      setCoAuthorMsg(err instanceof Error ? err.message : "Fehler beim Einladen.");
    } finally {
      setCoAuthorBusy(false);
    }
  }

  async function onRemoveCoAuthor(coAuthorUsername: string) {
    if (!editingBookId) return;
    setCoAuthorBusy(true);
    setCoAuthorMsg("");
    setCoAuthorIsError(false);
    try {
      const res = await fetch(`/api/books/co-authors?bookId=${encodeURIComponent(editingBookId)}&username=${encodeURIComponent(coAuthorUsername)}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Entfernen.");
      setCurrentCoAuthors((prev) => prev.filter((c) => c.username !== coAuthorUsername));
      setCoAuthorMsg("Mitautor*in entfernt.");
      await refreshBooks();
    } catch (err) {
      setCoAuthorIsError(true);
      setCoAuthorMsg(err instanceof Error ? err.message : "Fehler beim Entfernen.");
    } finally {
      setCoAuthorBusy(false);
    }
  }

  async function onRemoveSelfAsCoAuthor(bookId: string) {
    try {
      const res = await fetch(`/api/books/co-authors?bookId=${encodeURIComponent(bookId)}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler.");
      setMessage("Mitautorenschaft entfernt.");
      await refreshBooks();
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Fehler beim Entfernen.");
    }
  }

  function getCoAuthorStatusLabel(status: CoAuthor["status"]) {
    if (status === "confirmed") return { label: "bestätigt", cls: "text-green-700" };
    if (status === "declined") return { label: "abgelehnt", cls: "text-red-600" };
    return { label: "ausstehend", cls: "text-arena-muted" };
  }

  return (
    <>
      <button type="button" className="btn" onClick={openCreateOverlay}>
        Neues Buch anlegen
      </button>

      {message && !isError && <p className="text-sm text-green-700 mt-2">{message}</p>}
      {isError && message && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl mx-4">
            <p className="text-red-700 font-medium mb-4">{message}</p>
            <button
              type="button"
              className="btn w-full"
              onClick={() => { setMessage(""); setIsError(false); }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <h2>Meine angelegten Bücher</h2>
      {isLoading ? (
        <p>Lade Bücher ...</p>
      ) : books.length === 0 ? (
        <p>Noch keine Bücher angelegt.</p>
      ) : (
        <div className="grid gap-3 min-[1200px]:grid-cols-2">
          {[...books].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((book, index) => {
            const isOwner = book.ownerUsername === username;
            return (
              <article className="rounded-lg border border-arena-border p-3" key={`${book.title}-${book.createdAt}-${index}`}>
                <Link href={`/buch/${book.id}`} className="block no-underline text-inherit hover:opacity-90">
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3.5 max-[400px]:grid-cols-1">
                    <div className="relative w-[100px] aspect-[2/3] rounded-lg border border-arena-border bg-arena-bg flex items-center justify-center text-xs text-arena-muted max-[400px]:w-full max-[400px]:max-w-[120px]">
                      {book.coverImageUrl ? (
                        <ProgressiveImage src={book.coverImageUrl} alt={`Cover von ${book.title}`} fill className="object-contain rounded p-1" sizes="100px" />
                      ) : (
                        <span className="px-6 py-10">Kein Cover</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1 mt-0 truncate">{book.title}</h3>
                      {!isOwner && (
                        <span className="inline-block mb-1 text-xs bg-arena-blue/10 text-arena-blue px-2 py-0.5 rounded-full font-medium">Mitautor*in</span>
                      )}
                      {(() => {
                        const lines: { label: string; value: string }[] = [];
                        if (book.genre) lines.push({ label: "Genre", value: parseGenres(book.genre).join(", ") || book.genre });
                        if (book.ageFrom > 0 || book.ageTo > 0) lines.push({ label: "Alter", value: `${book.ageFrom} bis ${book.ageTo}` });
                        if (book.publicationYear) lines.push({ label: "Erscheinungsjahr", value: String(book.publicationYear) });
                        if (book.publisher) lines.push({ label: "Verlag", value: book.publisher });
                        if (book.isbn) lines.push({ label: "ISBN", value: book.isbn });
                        if (book.pageCount && book.pageCount > 0) lines.push({ label: "Seitenanzahl", value: String(book.pageCount) });
                        return lines.slice(0, 5).map((l) => (
                          <p key={l.label} className="my-0.5 truncate">{l.label}: {l.value}</p>
                        ));
                      })()}
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 flex-wrap mt-3">
                  {isOwner ? (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => onEditBook(book)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onDeleteBook(book.id)}
                      >
                        Löschen
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onRemoveSelfAsCoAuthor(book.id)}
                    >
                      Mitautorenschaft entfernen
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isBookOverlayOpen && (
        <div className="overlay-backdrop" onClick={resetForm}>
          <section className="w-[min(960px,100%)] bg-white rounded-xl p-4 box-border grid gap-2.5" onClick={(event) => event.stopPropagation()}>
            <h2>{editingBookId ? "Buch bearbeiten" : "Neues Buch"}</h2>

            {!editingBookId && (
              <p className="text-sm text-arena-muted mt-0 mb-1">Weitere Daten (Textausschnitte, Cover etc.) können beim Bearbeiten des Buches nachträglich hinzugefügt werden.</p>
            )}

            <div className="grid grid-cols-[2fr_1fr] gap-4 items-start max-[900px]:grid-cols-1">
              <div className="grid gap-2">
                <label className="grid gap-1 text-[0.95rem]">
                  Titel
                  <input className="input-base" value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>

                <div className="grid grid-cols-2 max-[400px]:grid-cols-1 gap-2">
                  <label className="grid gap-1 text-[0.95rem]">
                    Erscheinungsjahr
                    <input
                      className="input-base"
                      type="number"
                      value={publicationYear}
                      onChange={(event) => setPublicationYear(event.target.value)}
                    />
                  </label>
                  <GenrePicker label="Genre" value={genre} onChange={setGenre} />
                </div>

                <div className="grid grid-cols-2 max-[400px]:grid-cols-1 gap-2">
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

                <div className="grid grid-cols-2 max-[400px]:grid-cols-1 gap-2">
                  <label className="grid gap-1 text-[0.95rem]">
                    Verlag
                    <input className="input-base" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-[0.95rem]">
                    ISBN
                    <input className="input-base" value={isbn} onChange={(event) => setIsbn(event.target.value)} />
                  </label>
                </div>

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
                  Beschreibung
                  <textarea
                    className="input-base"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                  />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Links zum Buch kaufen (ein Link pro Zeile)
                  <textarea
                    className="input-base"
                    value={buyLinksText}
                    onChange={(event) => setBuyLinksText(event.target.value)}
                    rows={2}
                  />
                </label>

                <label className="grid gap-1 text-[0.95rem]">
                  Link zum Vorstellungsvideo (YouTube)
                  <input
                    className="input-base"
                    value={presentationVideoUrl}
                    onChange={(event) => setPresentationVideoUrl(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-2.5">
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void onUploadCover(file);
                    }
                    event.currentTarget.value = "";
                  }}
                />

                <div
                  className={`w-full border border-arena-border rounded-lg overflow-hidden grid place-items-center bg-arena-bg ${coverImageUrl ? "cursor-pointer" : "cursor-pointer"}`}
                  style={{ aspectRatio: "3/4" }}
                  onClick={() => coverFileInputRef.current?.click()}
                  title={coverImageUrl ? "Klicken zum Ändern" : "Klicken zum Auswählen"}
                >
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Buchcover" className="h-full w-full object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-arena-muted text-xs text-center p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Cover auswählen
                    </span>
                  )}
                </div>

                {isUploadingCover && <span className="text-xs text-arena-muted">Cover wird hochgeladen ...</span>}

                {/* ── Weitere Autoren ── */}
                <div className="mt-5 pt-4 border-t border-arena-border-light">
                  <h3 className="mt-0 mb-3">Weitere Autoren</h3>

                  {/* Bestehende Mitautoren (nur beim Bearbeiten) */}
                  {editingBookId && currentCoAuthors.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      {currentCoAuthors.map((ca) => {
                        const { label, cls } = getCoAuthorStatusLabel(ca.status);
                        return (
                          <div key={ca.username} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#f9f9f9] border border-arena-border-light rounded-md">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-medium truncate">{ca.username}</span>
                              <span className={`text-xs ${cls}`}>({label})</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => onRemoveCoAuthor(ca.username)}
                              disabled={coAuthorBusy}
                            >
                              Entfernen
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Noch nicht gespeicherte Liste (beim Anlegen) */}
                  {!editingBookId && pendingCoAuthorUsernames.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      {pendingCoAuthorUsernames.map((u) => (
                        <div key={u} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#f9f9f9] border border-arena-border-light rounded-md">
                          <span className="font-medium truncate">{u}</span>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setPendingCoAuthorUsernames((prev) => prev.filter((x) => x !== u))}
                          >
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <label className="grid gap-1 text-[0.95rem] flex-1">
                      Benutzername hinzufügen
                      <input
                        className="input-base"
                        value={coAuthorInput}
                        onChange={(e) => setCoAuthorInput(e.target.value)}
                        placeholder="Benutzername eingeben"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (editingBookId) {
                              void onInviteCoAuthor();
                            } else {
                              const val = coAuthorInput.trim();
                              if (val && !pendingCoAuthorUsernames.includes(val)) {
                                setPendingCoAuthorUsernames((prev) => [...prev, val]);
                                setCoAuthorInput("");
                              }
                            }
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={coAuthorBusy || !coAuthorInput.trim()}
                      onClick={() => {
                        if (editingBookId) {
                          void onInviteCoAuthor();
                        } else {
                          const val = coAuthorInput.trim();
                          if (val && !pendingCoAuthorUsernames.includes(val)) {
                            setPendingCoAuthorUsernames((prev) => [...prev, val]);
                          }
                          setCoAuthorInput("");
                        }
                      }}
                    >
                      {coAuthorBusy ? "..." : "Hinzufügen"}
                    </button>
                  </div>
                  {coAuthorMsg && (
                    <p className={`text-xs mt-1 ${coAuthorIsError ? "text-red-600" : "text-green-700"}`}>{coAuthorMsg}</p>
                  )}
                  <p className="text-xs text-arena-muted mt-1">
                    {editingBookId
                      ? "Die eingeladene Person erhält eine Nachricht und kann die Mitautorenschaft bestätigen oder ablehnen."
                      : "Die angegebenen Personen werden nach dem Anlegen eingeladen und können die Mitautorenschaft bestätigen."}
                  </p>
                </div>

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
    </>
  );
}
