import { useState } from "react";
import {
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { extractYouTubeId, isYouTubeShort } from "@/lib/bucharena-types";

export type MyBookOption = {
  id: string;
  title: string;
  ownerUsername: string;
  presentationVideoUrl: string;
  buyUrl: string;
  coverImageUrl: string;
};

type BdwSubmissionFormProps = {
  myBooks: MyBookOption[];
  hasSubmissions: boolean;
  defaultAuthor: string;
  onCloseForm?: () => void;
  onSuccess: () => void;
};

export default function BdwSubmissionForm({
  myBooks,
  hasSubmissions,
  defaultAuthor,
  onCloseForm,
  onSuccess,
}: BdwSubmissionFormProps) {
  const [selectedBookId, setSelectedBookId] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [speaker, setSpeaker] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const previewYtId = extractYouTubeId(youtubeUrl);
  const isShort = isYouTubeShort(youtubeUrl);

  function handleSelectOwnBook(bookId: string) {
    setSelectedBookId(bookId);
    if (!bookId) return;

    const book = myBooks.find((b) => b.id === bookId);
    if (!book) return;

    setTitle(book.title || "");
    if (book.ownerUsername && !author) {
      setAuthor(book.ownerUsername);
    }
    if (book.presentationVideoUrl) {
      setYoutubeUrl(book.presentationVideoUrl);
    }
    if (book.buyUrl) {
      setBuyUrl(book.buyUrl);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim()) {
      setErrorMsg("Bitte gib den Buchtitel ein.");
      return;
    }
    if (!author.trim()) {
      setErrorMsg("Bitte gib den Namen des Autors ein.");
      return;
    }
    if (!youtubeUrl.trim() || !previewYtId) {
      setErrorMsg("Bitte gib einen gueltigen YouTube-Link zu einem Video oder Reel/Short ein.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/buch-der-woche/bewerbung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          speaker,
          youtubeUrl,
          buyUrl,
          bookId: selectedBookId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Fehler beim Einreichen.");
      } else {
        setSuccessMsg(data.message || "Bewerbung erfolgreich eingereicht.");
        setTitle("");
        setSpeaker("");
        setYoutubeUrl("");
        setBuyUrl("");
        setSelectedBookId("");
        onSuccess();
      }
    } catch {
      setErrorMsg("Verbindungsfehler beim Absenden der Bewerbung.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-sans font-bold text-base text-arena-blue m-0 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-arena-blue" />
          {hasSubmissions ? "Weiteres Buch bewerben" : "Jetzt Buch einreichen"}
        </h4>
        {hasSubmissions && onCloseForm && (
          <button
            type="button"
            onClick={onCloseForm}
            className="text-xs text-arena-muted hover:text-arena-text cursor-pointer"
          >
            Abbrechen
          </button>
        )}
      </div>

      {myBooks.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs font-semibold text-arena-text mb-1">
            Aus deinen hochgeladenen Buechern uebernehmen (optional):
          </label>
          <select
            className="input-base w-full text-sm"
            value={selectedBookId}
            onChange={(e) => handleSelectOwnBook(e.target.value)}
          >
            <option value="">– Manuell eingeben oder Buch waehlen –</option>
            {myBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-arena-text mb-1">
              Buchtitel *
            </label>
            <input
              type="text"
              className="input-base w-full text-sm"
              placeholder="z. B. Im Schatten des Mondes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-arena-text mb-1">
              Autor *
            </label>
            <input
              type="text"
              className="input-base w-full text-sm"
              placeholder="z. B. Anna Mueller"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-arena-text mb-1">
              Sprecher (optional)
            </label>
            <input
              type="text"
              className="input-base w-full text-sm"
              placeholder="Name des Hoerbuch-Sprechers (falls vorhanden)"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-arena-text mb-1">
              Kauf- / Buch-Link (optional)
            </label>
            <input
              type="url"
              className="input-base w-full text-sm"
              placeholder="https://... (Shop-, Verlags- oder Amazon-Link)"
              value={buyUrl}
              onChange={(e) => setBuyUrl(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-arena-text mb-1">
            YouTube-Link (Video oder Reel / Short) *
          </label>
          <input
            type="url"
            className="input-base w-full text-sm"
            placeholder="https://www.youtube.com/watch?v=... oder https://youtube.com/shorts/..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
          />
          <p className="text-[11px] text-arena-muted mt-1 m-0">
            Buchtrailer, Lesungsvideo, Autorenvorstellung oder vertikales YouTube-Short / Reel.
          </p>
        </div>

        {previewYtId && (
          <div className="card-tip p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-arena-blue mb-2">
              <CheckIcon className="h-4 w-4" />
              <span>Gueltiges YouTube-{isShort ? "Reel / Short" : "Video"} erkannt</span>
            </div>

            <div
              className={`mx-auto relative rounded overflow-hidden ${
                isShort ? "w-[200px]" : "w-full max-w-[360px]"
              }`}
              style={{ paddingBottom: isShort ? "355px" : "200px" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full rounded"
                src={`https://www.youtube-nocookie.com/embed/${previewYtId}`}
                title="Vorschau"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg border border-arena-danger/30 text-xs text-arena-danger flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-arena-danger" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="card-tip p-2.5 text-xs text-arena-blue flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !author.trim() || !previewYtId}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <span>{isSubmitting ? "Wird eingereicht …" : "Bewerbung absenden"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
