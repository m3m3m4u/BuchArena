"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import {
  TrashIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface Review {
  id: string;
  bookTitle: string;
  review: string;
  authorEmail: string;
  authorName?: string;
  status: "pending" | "processed";
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewsAdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "processed">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const s = () => setAccount(getStoredAccount());
    s();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, s);
    window.addEventListener("storage", s);
    return () => { window.removeEventListener(ACCOUNT_CHANGED_EVENT, s); window.removeEventListener("storage", s); };
  }, []);

  useEffect(() => {
    if (account !== null && account.role !== "SUPERADMIN") router.push("/social-media");
  }, [account, router]);

  const loadReviews = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/bucharena/reviews/admin");
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
      else setError(data.error || "Fehler beim Laden");
    } catch { setError("Netzwerkfehler"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (account?.role === "SUPERADMIN") loadReviews(); }, [account, loadReviews]);

  const handleStatusUpdate = async (id: string, newStatus: "pending" | "processed") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/bucharena/reviews/admin", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: newStatus }) });
      const data = await res.json();
      if (data.success) await loadReviews();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string, bookTitle: string) => {
    if (!confirm(`Rezension zu "${bookTitle}" wirklich löschen?`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bucharena/reviews/admin?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) await loadReviews();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
    finally { setActionLoading(null); }
  };

  const handleExport = () => window.open("/api/bucharena/reviews/export", "_blank");

  if (account?.role !== "SUPERADMIN") return null;

  const filtered = reviews.filter(r => filter === "all" || r.status === filter);
  const pendingCount = reviews.filter(r => r.status === "pending").length;
  const processedCount = reviews.filter(r => r.status === "processed").length;

  return (
    <main className="top-centered-main">
      <section className="card gap-4">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1>Rezensionen verwalten</h1>
            <p className="text-arena-muted mt-1">Übersicht aller eingereichten Buchrezensionen</p>
          </div>
          <button onClick={handleExport} className="btn flex items-center gap-1.5" disabled={reviews.length === 0}>
            <ArrowDownTrayIcon className="w-4 h-4" />Als XLSX exportieren
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 max-[500px]:grid-cols-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold">{reviews.length}</div>
            <div className="text-[0.85rem] text-[#888]">Gesamt</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <div className="text-[0.85rem] text-[#888]">Ausstehend</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{processedCount}</div>
            <div className="text-[0.85rem] text-[#888]">Bearbeitet</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {([["all", "Alle", reviews.length], ["pending", "Ausstehend", pendingCount], ["processed", "Bearbeitet", processedCount]] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg border border-arena-border text-[0.85rem] cursor-pointer min-h-[44px] sm:min-h-0 ${
                filter === key
                  ? "bg-arena-yellow text-arena-blue font-semibold"
                  : "bg-white"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? <p>Lade Rezensionen...</p>
        : error ? <p className="text-red-700">{error}</p>
        : filtered.length === 0 ? <p className="text-arena-muted">{filter === "all" ? "Noch keine Rezensionen." : `Keine ${filter === "pending" ? "ausstehenden" : "bearbeiteten"} Rezensionen.`}</p>
        : (
          <div className="grid gap-3">
            {filtered.map(review => (
              <div key={review.id} className="rounded-lg border border-arena-border-light p-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 grid gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.8rem] font-medium w-fit ${
                      review.status === "pending"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-green-50 text-green-800"
                    }`}>
                      {review.status === "pending" ? "⏳ Ausstehend" : "✓ Bearbeitet"}
                    </span>
                    <h3 className="m-0">{review.bookTitle}</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="m-0 text-[0.9rem] whitespace-pre-wrap">{review.review}</p>
                    </div>
                    <div className="text-[0.82rem] text-[#888] grid gap-0.5">
                      <div><strong>Eingereicht von:</strong> {review.authorName || review.authorEmail} ({review.authorEmail})</div>
                      <div><strong>Eingereicht am:</strong> {new Date(review.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      {review.processedBy && <div><strong>Bearbeitet von:</strong> {review.processedBy}</div>}
                      {review.processedAt && <div><strong>Bearbeitet am:</strong> {new Date(review.processedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-1.5 sm:w-[180px] shrink-0 flex-wrap max-[500px]:w-full">
                    {review.status === "pending" ? (
                      <button onClick={() => handleStatusUpdate(review.id, "processed")} disabled={actionLoading === review.id} className="btn btn-sm flex items-center gap-1 text-[0.8rem] bg-green-50 text-green-800">
                        <CheckCircleIcon className="w-3.5 h-3.5" />Als bearbeitet markieren
                      </button>
                    ) : (
                      <button onClick={() => handleStatusUpdate(review.id, "pending")} disabled={actionLoading === review.id} className="btn btn-sm flex items-center gap-1 text-[0.8rem]">
                        <ArrowPathIcon className="w-3.5 h-3.5" />Zurück zu ausstehend
                      </button>
                    )}
                    <button onClick={() => handleDelete(review.id, review.bookTitle)} disabled={actionLoading === review.id} className="btn btn-sm btn-danger flex items-center gap-1 text-[0.8rem]">
                      <TrashIcon className="w-3.5 h-3.5" />Löschen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/social-media" className="text-arena-link no-underline">← Zurück zur Übersicht</Link>
        </div>
      </section>
    </main>
  );
}
