"use client";

import { useEffect, useState } from "react";
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
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";

interface Snippet {
  id: string;
  bookTitle: string;
  text: string;
  audioFileName?: string;
  audioFilePath?: string;
  audioFileSize?: number;
  authorEmail?: string;
  authorName?: string;
  status: "pending" | "processed";
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SnippetsAdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
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

  const loadSnippets = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/bucharena/snippets/admin");
      const data = await res.json();
      if (data.success) setSnippets(data.snippets);
      else setError(data.error || "Fehler beim Laden");
    } catch { setError("Netzwerkfehler"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (account?.role === "SUPERADMIN") loadSnippets(); }, [account]);

  const handleStatusUpdate = async (id: string, newStatus: "pending" | "processed") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/bucharena/snippets/admin", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: newStatus }) });
      const data = await res.json();
      if (data.success) await loadSnippets();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string, bookTitle: string) => {
    if (!confirm(`Schnipsel zu "${bookTitle}" wirklich löschen?`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bucharena/snippets/admin?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) await loadSnippets();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
    finally { setActionLoading(null); }
  };

  const handleExport = () => window.open("/api/bucharena/snippets/export", "_blank");
  const handleDownloadAudio = (id: string) => window.open(`/api/bucharena/snippets/${id}/audio`, "_blank");

  if (account?.role !== "SUPERADMIN") return null;

  const filtered = snippets.filter(s => filter === "all" || s.status === filter);
  const pendingCount = snippets.filter(s => s.status === "pending").length;
  const processedCount = snippets.filter(s => s.status === "processed").length;

  return (
    <main className="top-centered-main">
      <section className="card gap-4">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1>Schnipsel verwalten</h1>
            <p className="text-arena-muted mt-1">Übersicht aller eingereichten Buch-Schnipsel</p>
          </div>
          <button onClick={handleExport} className="btn flex items-center gap-1.5" disabled={snippets.length === 0}>
            <ArrowDownTrayIcon className="w-4 h-4" />Als XLSX exportieren
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 max-[500px]:grid-cols-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold">{snippets.length}</div>
            <div className="text-sm text-[#888]">Gesamt</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <div className="text-sm text-[#888]">Ausstehend</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{processedCount}</div>
            <div className="text-sm text-[#888]">Bearbeitet</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter("all")} className={`btn btn-sm ${filter === "all" ? "btn-primary" : ""}`}>Alle ({snippets.length})</button>
          <button onClick={() => setFilter("pending")} className={`btn btn-sm ${filter === "pending" ? "btn-primary" : ""}`}>Ausstehend ({pendingCount})</button>
          <button onClick={() => setFilter("processed")} className={`btn btn-sm ${filter === "processed" ? "btn-primary" : ""}`}>Bearbeitet ({processedCount})</button>
        </div>

        {/* Content */}
        {loading ? <p>Lade Schnipsel...</p>
        : error ? <p className="text-red-700">{error}</p>
        : filtered.length === 0 ? <p className="text-arena-muted">{filter === "all" ? "Noch keine Schnipsel." : `Keine ${filter === "pending" ? "ausstehenden" : "bearbeiteten"} Schnipsel.`}</p>
        : (
          <div className="grid gap-3">
            {filtered.map(snippet => (
              <div key={snippet.id} className="border border-arena-border-light rounded-lg p-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 grid gap-2">
                    {/* Status + Audio badges */}
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.8rem] font-medium ${snippet.status === "pending" ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-800"}`}>
                        {snippet.status === "pending" ? "⏳ Ausstehend" : "✓ Bearbeitet"}
                      </span>
                      {snippet.audioFileName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.8rem] font-medium bg-blue-50 text-blue-800">
                          <MusicalNoteIcon className="w-3.5 h-3.5" />Audio
                        </span>
                      )}
                    </div>

                    <h3 className="m-0">{snippet.bookTitle}</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="m-0 text-[0.9rem] whitespace-pre-wrap">{snippet.text}</p>
                    </div>

                    {snippet.audioFileName && (
                      <div className="flex items-center gap-1.5 text-sm flex-wrap">
                        <MusicalNoteIcon className="w-4 h-4 text-arena-link shrink-0" />
                        <strong className="break-all">{snippet.audioFileName}</strong>
                        <span className="text-[#888]">({((snippet.audioFileSize || 0) / 1024 / 1024).toFixed(2)} MB)</span>
                        <button onClick={() => handleDownloadAudio(snippet.id)} className="btn btn-ghost text-sm p-0">Herunterladen</button>
                      </div>
                    )}

                    <div className="text-[0.82rem] text-[#888] grid gap-0.5">
                      <div><strong>Eingereicht von:</strong> {snippet.authorName || snippet.authorEmail || "Anonym"}{snippet.authorEmail && ` (${snippet.authorEmail})`}</div>
                      <div><strong>Eingereicht am:</strong> {new Date(snippet.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      {snippet.processedBy && <div><strong>Bearbeitet von:</strong> {snippet.processedBy}</div>}
                      {snippet.processedAt && <div><strong>Bearbeitet am:</strong> {new Date(snippet.processedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-1.5 sm:w-[180px] shrink-0 flex-wrap">
                    {snippet.status === "pending" ? (
                      <button onClick={() => handleStatusUpdate(snippet.id, "processed")} disabled={actionLoading === snippet.id} className="btn btn-sm flex items-center gap-1 text-[0.8rem] bg-green-50 text-green-800">
                        <CheckCircleIcon className="w-3.5 h-3.5" />Als bearbeitet markieren
                      </button>
                    ) : (
                      <button onClick={() => handleStatusUpdate(snippet.id, "pending")} disabled={actionLoading === snippet.id} className="btn btn-sm flex items-center gap-1 text-[0.8rem]">
                        <ArrowPathIcon className="w-3.5 h-3.5" />Zurück zu ausstehend
                      </button>
                    )}
                    <button onClick={() => handleDelete(snippet.id, snippet.bookTitle)} disabled={actionLoading === snippet.id} className="btn btn-sm btn-danger flex items-center gap-1 text-[0.8rem]">
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
