"use client";

import { useState } from "react";
import Link from "next/link";

export default function BucharenaReviewsPage() {
  const [bookTitle, setBookTitle] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!bookTitle.trim() || !review.trim()) {
      setMessage({ type: "error", text: "Bitte fülle beide Felder aus" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bucharena/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle: bookTitle.trim(), review: review.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Rezension erfolgreich eingereicht! Vielen Dank." });
        setBookTitle("");
        setReview("");
      } else {
        setMessage({ type: "error", text: data.error || "Fehler beim Einreichen der Rezension" });
      }
    } catch {
      setMessage({ type: "error", text: "Ein unerwarteter Fehler ist aufgetreten" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="top-centered-main">
      <section className="card gap-[1.2rem] max-w-[700px]">
        {/* Header */}
        <div className="text-center">
          <h1>Rezension einreichen</h1>
          <p className="mt-1 text-sm text-arena-muted">Wir sammeln deine Rezensionen und veröffentlichen Ausschnitte davon.</p>
        </div>

        {/* Message */}
        {message && (
          <p className={`rounded-lg px-3 py-2.5 border ${
            message.type === "success"
              ? "bg-green-50 border-green-300 text-green-800"
              : "bg-red-50 border-red-300 text-red-700"
          }`}>
            {message.text}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid gap-[0.9rem]">
          <label className="grid gap-1 text-[0.95rem]">
            Buchtitel <span className="text-red-600">*</span>
            <input
              type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)}
              className="input-base" placeholder="z.B. Harry Potter und der Stein der Weisen"
              required maxLength={200} disabled={submitting}
            />
            <span className="text-xs text-[#888]">{bookTitle.length}/200 Zeichen</span>
          </label>

          <label className="grid gap-1 text-[0.95rem]">
            Rezension <span className="text-red-600">*</span>
            <textarea
              value={review} onChange={e => setReview(e.target.value)}
              className="input-base min-h-[200px] resize-y"
              placeholder="Schreibe hier deine Rezension..."
              required maxLength={5000} disabled={submitting}
            />
            <span className="text-xs text-[#888]">{review.length}/5000 Zeichen (mindestens 10 Zeichen erforderlich)</span>
          </label>

          <button
            type="submit"
            disabled={submitting || !bookTitle.trim() || !review.trim() || review.trim().length < 10}
            className="btn btn-primary py-2.5 px-4 font-semibold"
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Wird eingereicht..." : "Rezension einreichen"}
          </button>
        </form>

        {/* Back */}
        <div className="text-center">
          <Link href="/social-media" className="text-arena-link no-underline">← Zurück zur Übersicht</Link>
        </div>
      </section>
    </main>
  );
}
