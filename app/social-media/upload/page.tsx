"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import GenrePicker from "@/app/components/genre-picker";

const AGE_RANGE_OPTIONS = [
  "ab 2 Jahren",
  "ab 4 Jahren",
  "ab 6 Jahren",
  "ab 8 Jahren",
  "ab 10 Jahren",
  "ab 12 Jahren",
  "ab 14 Jahren",
  "ab 16 Jahren",
  "ab 18 Jahren",
  "Alle Altersgruppen",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function sync() {
      setAccount(getStoredAccount());
      setAccountLoaded(true);
    }
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleFile = useCallback((f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pptx") && !name.endsWith(".ppt")) {
      setError("Nur PowerPoint-Dateien (.pptx, .ppt) sind erlaubt.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Die Datei darf maximal 50 MB groß sein.");
      return;
    }
    setError("");
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => setDragActive(false), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!bookTitle.trim() || !author.trim() || !genre || !ageRange || !email.trim() || !instagram.trim() || !file) {
      setError("Bitte fülle alle Pflichtfelder aus und wähle eine Datei.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Use chunked upload for large files, simple upload for small ones
      if (file.size > CHUNK_SIZE) {
        await uploadChunked();
      } else {
        await uploadSimple();
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadSimple() {
    const formData = new FormData();
    formData.append("bookTitle", bookTitle.trim());
    formData.append("author", author.trim());
    formData.append("genre", genre);
    formData.append("ageRange", ageRange);
    formData.append("notes", notes.trim());
    formData.append("contact", email.trim());
    formData.append("contactType", "email");
    formData.append("instagram", instagram.trim());
    formData.append("file", file!);

    const res = await fetch("/api/bucharena/submissions", { method: "POST", body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload fehlgeschlagen");
    setProgress(100);
  }

  async function uploadChunked() {
    const totalChunks = Math.ceil(file!.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file!.size);
      const chunk = file!.slice(start, end);

      const formData = new FormData();
      formData.append("uploadId", uploadId);
      formData.append("chunkIndex", i.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("chunk", new File([chunk], "chunk"));

      // Include metadata on first chunk
      if (i === 0) {
        formData.append("bookTitle", bookTitle.trim());
        formData.append("author", author.trim());
        formData.append("genre", genre);
        formData.append("ageRange", ageRange);
        formData.append("notes", notes.trim());
        formData.append("contact", email.trim());
        formData.append("contactType", "email");
        formData.append("instagram", instagram.trim());
        formData.append("fileName", file!.name);
        formData.append("fileSize", file!.size.toString());
      }

      const res = await fetch("/api/bucharena/submissions/chunk", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || `Chunk ${i + 1} fehlgeschlagen`);

      setProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  // Warten auf Account-Laden
  if (!accountLoaded) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <p className="text-arena-muted text-center">Lade …</p>
        </section>
      </main>
    );
  }

  // Gäste können nicht hochladen
  if (!account) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1 className="text-xl font-bold">Anmeldung erforderlich</h1>
          <p className="text-arena-muted text-[0.95rem]">
            Um eine Buchvorstellung einzureichen, musst du eingeloggt sein.
            Gäste können keine Dateien hochladen.
          </p>
          <div className="flex gap-3 pt-2">
            <Link href="/auth" className="btn btn-primary">
              Jetzt einloggen
            </Link>
            <Link href="/social-media" className="btn">
              ← Zurück
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (success) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <div className="grid gap-4 place-items-center py-6 text-center">
            <CheckCircleIcon className="size-16 text-green-600" />
            <h1 className="text-xl font-bold">Einreichung erfolgreich!</h1>
            <p className="text-arena-muted text-[0.95rem]">
              Vielen Dank! Deine Buchvorstellung wurde erfolgreich eingereicht.
              Wir melden uns bei dir, sobald sie bearbeitet wurde.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSuccess(false);
                  setBookTitle("");
                  setAuthor("");
                  setGenre("");
                  setAgeRange("");
                  setNotes("");
                  setEmail("");
                  setInstagram("");
                  setFile(null);
                  setProgress(0);
                }}
              >
                Weitere Einreichung
              </button>
              <Link href="/social-media" className="btn">
                ← Zurück
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold">Buchvorstellung einreichen</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Du hast eine PowerPoint-Präsentation zu einem Buch erstellt? Teile sie
          mit uns und werde Teil der BuchArena!
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Buchtitel */}
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">
              Buchtitel <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              className="input-base"
              placeholder="z.\u00a0B. Harry Potter und der Stein der Weisen"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              disabled={uploading}
              required
            />
          </label>

          {/* Autor */}
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">
              Autor des Buchs <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              className="input-base"
              placeholder="z.\u00a0B. J. K. Rowling"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={uploading}
              required
            />
          </label>

          {/* Genre */}
          <GenrePicker value={genre} onChange={setGenre} required />

          {/* Altersempfehlung */}
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">
              Altersempfehlung <span className="text-red-500">*</span>
            </span>
            <select
              className="input-base"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              disabled={uploading}
              required
            >
              <option value="">– bitte wählen –</option>
              {AGE_RANGE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          {/* Datei-Upload (Drag & Drop) */}
          <div className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">
              PowerPoint-Datei <span className="text-red-500">*</span>
            </span>

            {!file ? (
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`grid cursor-pointer place-items-center gap-2 rounded-lg border-2 border-dashed p-8 max-sm:p-4 text-center transition-colors ${
                  dragActive
                    ? "border-arena-link bg-blue-50"
                    : "border-arena-border hover:border-gray-400"
                }`}
              >
                <ArrowUpTrayIcon className="size-8 text-arena-muted" />
                <span className="text-arena-muted">
                  Datei hierher ziehen
                  <br />
                  <span className="text-sm">oder klicken zum Auswählen</span>
                </span>
                <span className="text-xs text-arena-muted">
                  Erlaubt: .pptx, .ppt (max. 50&nbsp;MB)
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pptx,.ppt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-arena-border bg-green-50 p-3">
                <DocumentIcon className="size-8 shrink-0 text-green-700" />
                <div className="grid min-w-0 gap-0.5 text-sm">
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-arena-muted">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    className="btn btn-sm ml-auto"
                    onClick={() => {
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  >
                    <XMarkIcon className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Anmerkungen */}
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Anmerkungen (optional)</span>
            <textarea
              className="input-base"
              rows={3}
              placeholder="Hast du Wünsche oder Anmerkungen?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
            />
          </label>

          {/* E-Mail */}
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">
              E-Mail-Adresse <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              className="input-base"
              placeholder="deine@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={uploading}
              required
            />
          </label>

          {/* Instagram */}
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">
              Instagram <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              className="input-base"
              placeholder="@dein_instagram_name"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              disabled={uploading}
              required
            />
          </label>

          {/* Hinweis */}
          <p className="text-xs text-arena-muted leading-relaxed">
            Mit dem Absenden stimmst du zu, dass wir deine Daten zur Bearbeitung
            deiner Einreichung verwenden dürfen. Deine Kontaktdaten werden nur
            verwendet, um dich zu kontaktieren.
          </p>

          {/* Fehler */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Fortschritt */}
          {uploading && (
            <div className="grid gap-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-arena-link transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-arena-muted text-center">
                {progress}% hochgeladen …
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={uploading}
          >
            {uploading ? "Wird hochgeladen …" : "Einreichung absenden"}
          </button>
        </form>

        <div className="pt-2">
          <Link
            href="/social-media"
            className="text-arena-link text-sm no-underline hover:underline"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </section>
    </main>
  );
}
