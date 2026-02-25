"use client";

import { useState } from "react";
import Link from "next/link";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

export default function BucharenaSnippetsPage() {
  const [bookTitle, setBookTitle] = useState("");
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".mp3")) {
        setMessage({ type: "error", text: "Nur MP3-Dateien sind erlaubt" });
        e.target.value = "";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "Die Audio-Datei darf maximal 10MB groß sein" });
        e.target.value = "";
        return;
      }
      setAudioFile(file);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!bookTitle.trim() || !text.trim()) {
      setMessage({ type: "error", text: "Bitte fülle beide Felder aus" });
      return;
    }
    setSubmitting(true);
    try {
      let audioFileName: string | undefined;
      let audioFilePath: string | undefined;
      let audioFileSize: number | undefined;

      // Large files: upload to WebDAV directly
      if (audioFile && audioFile.size > 4 * 1024 * 1024) {
        const urlRes = await fetch("/api/bucharena/snippets/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: audioFile.name, bookTitle: bookTitle.trim() }),
        });
        const urlData = await urlRes.json();
        if (!urlData.success) throw new Error(urlData.error || "Fehler beim Generieren der Upload-URL");

        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: "Basic " + btoa(`${urlData.credentials.username}:${urlData.credentials.password}`),
            "Content-Type": "audio/mpeg",
          },
          body: audioFile,
        });
        if (!uploadRes.ok) throw new Error("Fehler beim Hochladen der Audio-Datei");

        audioFileName = urlData.fileName;
        audioFilePath = urlData.filePath;
        audioFileSize = audioFile.size;
      }

      const formData = new FormData();
      formData.append("bookTitle", bookTitle.trim());
      formData.append("text", text.trim());

      if (audioFileName && audioFilePath && audioFileSize) {
        formData.append("audioFileName", audioFileName);
        formData.append("audioFilePath", audioFilePath);
        formData.append("audioFileSize", audioFileSize.toString());
      } else if (audioFile && audioFile.size <= 4 * 1024 * 1024) {
        formData.append("audio", audioFile);
      }

      const res = await fetch("/api/bucharena/snippets", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Schnipsel erfolgreich eingereicht! Vielen Dank." });
        setBookTitle("");
        setText("");
        setAudioFile(null);
        const fi = document.getElementById("audioFile") as HTMLInputElement;
        if (fi) fi.value = "";
      } else {
        setMessage({ type: "error", text: data.error || "Fehler beim Einreichen" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="top-centered-main">
      <section className="card gap-5 max-w-[700px]">
        <div className="text-center">
          <h1>Schnipsel einreichen</h1>
          <p className="text-arena-muted mt-1">Teile einen Text-Schnipsel aus einem Buch – optional mit Audio-Aufnahme!</p>
        </div>

        {message && (
          <p className={`rounded-lg px-3 py-2.5 border ${message.type === "success" ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-700"}`}>
            {message.text}
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3.5">
          <label className="grid gap-1 text-[0.95rem]">
            Buchtitel <span className="text-red-600">*</span>
            <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} className="input-base" placeholder="z.B. Harry Potter und der Stein der Weisen" required maxLength={200} disabled={submitting} />
            <span className="text-xs text-[#888]">{bookTitle.length}/200 Zeichen</span>
          </label>

          <label className="grid gap-1 text-[0.95rem]">
            Text-Schnipsel <span className="text-red-600">*</span>
            <textarea value={text} onChange={e => setText(e.target.value)} className="input-base min-h-[150px] resize-y" placeholder="Schreibe hier deinen Lieblings-Schnipsel aus dem Buch..." required maxLength={3000} disabled={submitting} />
            <span className="text-xs text-[#888]">{text.length}/3000 Zeichen (mindestens 10 Zeichen erforderlich)</span>
          </label>

          <div>
            <label className="text-[0.95rem] block mb-1.5">Audio-Aufnahme (optional)</label>
            <div className="flex items-center gap-2.5">
              <label className="btn cursor-pointer flex items-center gap-1.5">
                <MusicalNoteIcon className="w-4 h-4" />
                {audioFile ? "Andere Datei wählen" : "MP3 auswählen"}
                <input type="file" id="audioFile" accept=".mp3,audio/mpeg" onChange={handleFileChange} className="hidden" disabled={submitting} />
              </label>
              {audioFile && (
                <span className="text-sm">
                  <strong>{audioFile.name}</strong>
                  <span className="text-[#888] ml-1.5">({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#888] mt-1">Maximal 10MB, nur MP3-Format</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !bookTitle.trim() || !text.trim() || text.trim().length < 10}
            className={`btn btn-primary py-2.5 px-4 ${submitting ? "opacity-60" : ""}`}
          >
            {submitting ? "Wird eingereicht..." : "Schnipsel einreichen"}
          </button>
        </form>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="m-0 text-sm text-blue-800">
            <strong>Tipp:</strong> Du kannst deinen Lieblings-Textabschnitt auch selbst vorlesen und als MP3 hochladen. Das macht deinen Schnipsel noch persönlicher!
          </p>
        </div>

        <div className="text-center">
          <Link href="/social-media" className="text-arena-link no-underline">← Zurück zur Übersicht</Link>
        </div>
      </section>
    </main>
  );
}
