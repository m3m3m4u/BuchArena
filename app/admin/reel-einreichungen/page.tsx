"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import {
  ArrowDownTrayIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  FilmIcon,
} from "@heroicons/react/24/outline";

interface ReelSubmission {
  _id: string;
  bookTitle: string;
  author: string;
  genre?: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  files?: { fileName: string; fileSize: number; filePath: string }[];
  notes?: string;
  beschreibung?: string;
  instagram?: string;
  authorInstagram?: string | null;
  submittedBy?: string;
  status: "pending" | "approved" | "rejected" | "done";
  createdAt: string;
  updatedAt: string;
}

export default function ReelEinreichungenAdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [submissions, setSubmissions] = useState<ReelSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "done">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const s = () => setAccount(getStoredAccount());
    s();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, s);
    window.addEventListener("storage", s);
    return () => { window.removeEventListener(ACCOUNT_CHANGED_EVENT, s); window.removeEventListener("storage", s); };
  }, []);

  useEffect(() => {
    if (account !== null && account.role !== "SUPERADMIN") router.push("/");
  }, [account, router]);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type: "reel" });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/bucharena/submissions/admin?${params}`);
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions);
    } catch { setError("Laden fehlgeschlagen."); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { if (account?.role === "SUPERADMIN") loadSubmissions(); }, [account, loadSubmissions]);

  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/bucharena/submissions/admin/${id}/download`);
      if (!res.ok) { setError("Download fehlgeschlagen."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { setError("Download fehlgeschlagen."); }
  };

  const handleDownloadSelected = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    setError("");
    const toDownload = submissions.filter((s) => selected.has(s._id));
    for (const sub of toDownload) {
      const files = sub.files && sub.files.length > 0 ? sub.files : [{ fileName: sub.fileName, fileSize: sub.fileSize, filePath: sub.filePath }];
      for (const f of files) {
        try {
          const res = await fetch(`/api/bucharena/submissions/admin/${sub._id}/download`);
          if (!res.ok) continue;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = f.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          await new Promise((r) => setTimeout(r, 400));
        } catch { /* skip */ }
      }
    }
    setDownloading(false);
  };

  const handleExportExcel = async () => {
    const toExport = selected.size > 0
      ? submissions.filter((s) => selected.has(s._id))
      : submissions;
    if (toExport.length === 0) return;

    const { utils, writeFile } = await import("xlsx");
    const rows = toExport.map((s) => ({
      Dateiname: s.fileName,
      Buchtitel: s.bookTitle,
      Autor: s.author,
      Instagram: s.instagram || s.authorInstagram || "",
      Beschreibung: s.beschreibung || "",
    }));
    const ws = utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 60 },
      { wch: 40 },
      { wch: 30 },
      { wch: 30 },
      { wch: 80 },
    ];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reel-Einreichungen");
    writeFile(wb, `Reel-Einreichungen_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () =>
    setSelected((prev) => prev.size === submissions.length ? new Set() : new Set(submissions.map((s) => s._id)));

  const updateStatus = async (id: string, status: ReelSubmission["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/bucharena/submissions/admin/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions((s) => s.map((x) => x._id === id ? { ...x, status } : x));
      } else {
        setError(json.error || "Fehler beim Aktualisieren.");
      }
    } catch { setError("Fehler beim Aktualisieren."); }
    finally { setUpdatingId(null); }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending": return <span className="badge badge-warning gap-1"><ClockIcon className="h-3 w-3" /> Ausstehend</span>;
      case "approved": return <span className="badge badge-success gap-1"><CheckIcon className="h-3 w-3" /> Genehmigt</span>;
      case "done": return <span className="badge badge-info gap-1"><CheckIcon className="h-3 w-3" /> Erledigt</span>;
      case "rejected": return <span className="badge badge-error gap-1"><XMarkIcon className="h-3 w-3" /> Abgelehnt</span>;
      default: return <span className="badge">{s}</span>;
    }
  };

  if (!account || account.role !== "SUPERADMIN") return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FilmIcon className="h-7 w-7 text-rose-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reel-Einreichungen</h1>
              <p className="text-sm text-gray-500">Eingereichte Kurzvideos (9:16) verwalten &amp; herunterladen</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/admin" className="btn btn-sm btn-ghost">← Admin</Link>
            <button onClick={loadSubmissions} className="btn btn-sm btn-outline gap-1">
              <ArrowPathIcon className="h-4 w-4" /> Aktualisieren
            </button>
            {selected.size > 0 && (
              <button
                onClick={handleDownloadSelected}
                disabled={downloading}
                className="btn btn-sm btn-outline gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloading ? "Lädt..." : `${selected.size} herunterladen`}
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="btn btn-sm btn-outline gap-1 text-green-700 border-green-200 hover:bg-green-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Excel{selected.size > 0 ? ` (${selected.size})` : " (alle)"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["all", "pending", "approved", "done", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline"}`}
            >
              {f === "all" ? "Alle" : f === "pending" ? "Ausstehend" : f === "approved" ? "Genehmigt" : f === "done" ? "Erledigt" : "Abgelehnt"}
            </button>
          ))}
        </div>

        {/* Alle auswählen */}
        {!loading && submissions.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="select-all"
              className="checkbox checkbox-sm"
              checked={selected.size === submissions.length && submissions.length > 0}
              onChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer">
              Alle auswählen ({submissions.length}){selected.size > 0 && ` · ${selected.size} ausgewählt`}
            </label>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-rose-500" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FilmIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Keine Einreichungen gefunden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub._id} className={`bg-white rounded-xl border p-4 shadow-sm ${selected.has(sub._id) ? "border-blue-400 bg-blue-50/30" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mt-1 shrink-0"
                      checked={selected.has(sub._id)}
                      onChange={() => toggleSelect(sub._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{sub.bookTitle}</h3>
                        {statusBadge(sub.status)}
                      </div>
                      <p className="text-sm text-gray-600">von <span className="font-medium">{sub.author}</span>
                        {sub.submittedBy && <span className="text-gray-400 ml-1">(@{sub.submittedBy})</span>}
                      </p>
                      {sub.genre && <p className="text-xs text-gray-400 mt-0.5">Genre: {sub.genre}</p>}
                      {sub.beschreibung && <p className="text-xs text-gray-500 mt-1">&ldquo;{sub.beschreibung}&rdquo;</p>}
                      {sub.notes && <p className="text-xs text-gray-400 mt-0.5 italic">Notiz: {sub.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(sub.createdAt)} · {fmtSize(sub.fileSize)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {/* Download */}
                    {sub.files && sub.files.length > 0 ? (
                      sub.files.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => handleDownload(sub._id, f.fileName)}
                          className="btn btn-sm btn-outline gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          {f.fileName.length > 30 ? f.fileName.slice(0, 30) + "…" : f.fileName}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => handleDownload(sub._id, sub.fileName)}
                        className="btn btn-sm btn-outline gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Herunterladen
                      </button>
                    )}

                    {/* Status actions */}
                    <div className="flex gap-1 flex-wrap">
                      {sub.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(sub._id, "approved")}
                            disabled={updatingId === sub._id}
                            className="btn btn-xs btn-success gap-1"
                          >
                            <CheckIcon className="h-3 w-3" /> Genehmigen
                          </button>
                          <button
                            onClick={() => updateStatus(sub._id, "rejected")}
                            disabled={updatingId === sub._id}
                            className="btn btn-xs btn-error gap-1"
                          >
                            <XMarkIcon className="h-3 w-3" /> Ablehnen
                          </button>
                        </>
                      )}
                      {sub.status === "approved" && (
                        <button
                          onClick={() => updateStatus(sub._id, "done")}
                          disabled={updatingId === sub._id}
                          className="btn btn-xs btn-info gap-1"
                        >
                          <CheckIcon className="h-3 w-3" /> Als erledigt markieren
                        </button>
                      )}
                      {(sub.status === "rejected" || sub.status === "done") && (
                        <button
                          onClick={() => updateStatus(sub._id, "pending")}
                          disabled={updatingId === sub._id}
                          className="btn btn-xs btn-ghost gap-1"
                        >
                          <ArrowPathIcon className="h-3 w-3" /> Zurücksetzen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
