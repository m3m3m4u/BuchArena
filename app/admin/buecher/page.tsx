"use client";

import NextImage from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

type Book = { id: string; title?: string; ownerUsername?: string; isbn?: string; genre?: string; coverImageUrl?: string; publicationYear?: number };

export default function AdminBooksPage() {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/books?q=${encodeURIComponent(q)}`);
        const data = await response.json() as { books?: Book[]; message?: string };
        if (!response.ok) throw new Error(data.message ?? "Laden fehlgeschlagen.");
        setBooks(data.books ?? []);
        setError("");
      } catch (err) { setError(err instanceof Error ? err.message : "Laden fehlgeschlagen."); }
      finally { setLoading(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  return <main className="max-w-7xl mx-auto px-4 py-8 font-sans">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div><h1 className="text-2xl font-bold text-arena-blue m-0">Bücherverwaltung</h1><p className="text-sm text-arena-muted mt-1">Importierte und manuelle Bücher suchen und direkt ansehen.</p></div>
      <Link href="/admin" className="btn">Zur Admin-Zentrale</Link>
    </div>
    <input className="input-base w-full mb-5" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titel, Autor, ISBN oder Genre filtern…" aria-label="Bücher filtern" />
    {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
    {loading ? <p className="text-sm text-arena-muted">Bücher werden geladen…</p> : <>
      <p className="text-xs text-arena-muted mb-3">{books.length} Treffer (maximal 500)</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => <Link key={book.id} href={`/buch/${book.id}`} className="flex gap-3 rounded-xl border border-arena-border-light bg-white p-3 hover:border-arena-blue/40 hover:shadow-sm transition-shadow">
          {book.coverImageUrl ? <NextImage width={64} height={96} unoptimized src={book.coverImageUrl} alt="" className="w-16 h-24 object-cover rounded-md bg-slate-100" /> : <div className="w-16 h-24 rounded-md bg-slate-100" />}
          <div className="min-w-0"><h2 className="font-semibold text-sm text-arena-blue line-clamp-2 m-0">{book.title ?? "Ohne Titel"}</h2><p className="text-xs text-arena-muted mt-1">{book.ownerUsername ?? ""}</p>{book.isbn && <p className="text-xs text-arena-muted mt-1">ISBN {book.isbn}</p>}{book.genre && <p className="text-xs text-arena-muted mt-1 line-clamp-2">{book.genre}</p>}</div>
        </Link>)}
      </div>
    </>}
  </main>;
}
