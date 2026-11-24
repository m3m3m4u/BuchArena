"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  DocumentDuplicateIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArchiveBoxIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import {
  buildInstagramCaption,
  cleanInstagramHandle,
  buildReelFileName,
  type ReelExportItem,
} from "@/lib/reel-export-utils";

interface ReelSubmission extends ReelExportItem {
  _id: string;
  bookTitle: string;
  author: string;
  genre?: string;
  geschlecht?: string;
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
  vorlage?: {
    thema?: string;
    hauptfigur?: string;
    inhalte?: string;
    autorHerkunft?: string;
    autorBeruf?: string;
    autorStil?: string;
    erscheinungsjahr?: string;
    verlag?: string;
  } | null;
}

export default function ReelEinreichungenAdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [submissions, setSubmissions] = useState<ReelSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "done">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const s = () => setAccount(getStoredAccount());
    s();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, s);
    window.addEventListener("storage", s);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, s);
      window.removeEventListener("storage", s);
    };
  }, []);

  useEffect(() => {
    if (account !== null && account.role !== "SUPERADMIN" && account.role !== "ADMIN") {
      router.push("/");
    }
  }, [account, router]);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type: "reel" });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/bucharena/submissions/admin?${params}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions);
      } else {
        setError(data.error || "Laden fehlgeschlagen.");
      }
    } catch {
      setError("Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (account?.role === "SUPERADMIN" || account?.role === "ADMIN") {
      loadSubmissions();
    }
  }, [account, loadSubmissions]);

  // Counts for filters
  const counts = useMemo(() => {
    return {
      all: submissions.length,
      pending: submissions.filter((s) => s.status === "pending").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      done: submissions.filter((s) => s.status === "done").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
    };
  }, [submissions]);

  const fmtSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  /** Single download: v2 (default) or v1 */
  const handleDownloadPptx = async (id: string, defaultName: string, version: "v1" | "v2" = "v2") => {
    try {
      const url = `/api/bucharena/submissions/admin/${id}/download?v=${version === "v2" ? "2" : "1"}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError("Download fehlgeschlagen.");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const targetName =
        version === "v2"
          ? defaultName.replace(/\.pptx$/i, "") + " (v2).pptx"
          : defaultName;
      a.download = targetName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      setError("Download fehlgeschlagen.");
    }
  };

  /** Batch download v2 PPTX files via sequential browser triggers */
  const handleDownloadSelectedV2 = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    setError("");
    const toDownload = submissions.filter((s) => selected.has(s._id));
    for (const sub of toDownload) {
      try {
        const res = await fetch(`/api/bucharena/submissions/admin/${sub._id}/download?v=2`);
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = buildReelFileName(sub.bookTitle, sub.author, "v2");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        await new Promise((r) => setTimeout(r, 450));
      } catch {
        /* skip */
      }
    }
    setDownloading(false);
  };

  /** Download a ZIP package with Version 02 PPTX files + Excel */
  const handleDownloadZipV2 = async (forAllDone = false) => {
    setDownloadingZip(true);
    setError("");
    try {
      const targetIds = forAllDone
        ? []
        : selected.size > 0
        ? Array.from(selected)
        : [];

      const res = await fetch("/api/bucharena/submissions/admin/batch-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: targetIds.length > 0 ? targetIds : undefined,
          allDone: forAllDone || targetIds.length === 0,
          includeExcel: true,
          maxCount: 40,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ZIP-Erstellung fehlgeschlagen.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reels_Version02_${forAllDone ? "Erledigt" : "Auswahl"}_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setSuccessMsg("ZIP-Paket erfolgreich heruntergeladen!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen des ZIP-Pakets.");
    } finally {
      setDownloadingZip(false);
    }
  };

  /** Export Excel table with Title, Autor, Insta, Caption, Beschreibung */
  const handleExportExcelV2 = async (onlyDone = false) => {
    let toExport = submissions;
    if (onlyDone) {
      toExport = submissions.filter((s) => s.status === "done");
    } else if (selected.size > 0) {
      toExport = submissions.filter((s) => selected.has(s._id));
    }
    if (toExport.length === 0) {
      setError("Keine Einreichungen zum Exportieren vorhanden.");
      return;
    }

    const { utils, writeFile } = await import("xlsx");
    const rows = toExport.map((s) => {
      const autorLabel = s.geschlecht === "Autor" ? "Autor" : "Autorin";
      const beschreibung = (s.beschreibung || "")
        .replace(/\bTitel\b/g, s.bookTitle)
        .replace(/\bAutorin\b/g, autorLabel)
        .trim();
      const insta = cleanInstagramHandle(s.instagram || s.authorInstagram);
      const caption = buildInstagramCaption(s);
      const dateiname = buildReelFileName(s.bookTitle, s.author, "v2");

      return {
        Title: s.bookTitle,
        Autor: s.author,
        Insta: insta,
        Caption: caption,
        Beschreibung: beschreibung,
        Dateiname: dateiname,
        Genre: s.genre || "",
        Status: s.status,
      };
    });

    const ws = utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 35 }, // Title
      { wch: 25 }, // Autor
      { wch: 25 }, // Insta
      { wch: 90 }, // Caption
      { wch: 90 }, // Beschreibung
      { wch: 45 }, // Dateiname
      { wch: 25 }, // Genre
      { wch: 15 }, // Status
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reels Version 02");
    const suffix = onlyDone ? "Erledigt" : selected.size > 0 ? "Auswahl" : "Alle";
    writeFile(wb, `Reels_Version02_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const copyCaptionToClipboard = (sub: ReelSubmission) => {
    const caption = buildInstagramCaption(sub);
    navigator.clipboard.writeText(caption);
    setCopiedId(sub._id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleCaptionExpand = (id: string) => {
    setExpandedCaptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleSelectAll = () =>
    setSelected((prev) =>
      prev.size === submissions.length ? new Set() : new Set(submissions.map((s) => s._id))
    );

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
        setSubmissions((s) => s.map((x) => (x._id === id ? { ...x, status } : x)));
      } else {
        setError(json.error || "Fehler beim Aktualisieren.");
      }
    } catch {
      setError("Fehler beim Aktualisieren.");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending":
        return (
          <span className="badge badge-warning gap-1">
            <ClockIcon className="h-3 w-3" /> Ausstehend
          </span>
        );
      case "approved":
        return (
          <span className="badge badge-success gap-1">
            <CheckIcon className="h-3 w-3" /> Genehmigt
          </span>
        );
      case "done":
        return (
          <span className="badge badge-info gap-1 bg-arena-bg text-arena-blue border-arena-border-light">
            <CheckIcon className="h-3 w-3" /> Erledigt
          </span>
        );
      case "rejected":
        return (
          <span className="badge badge-error gap-1">
            <XMarkIcon className="h-3 w-3" /> Abgelehnt
          </span>
        );
      default:
        return <span className="badge">{s}</span>;
    }
  };

  if (!account || (account.role !== "SUPERADMIN" && account.role !== "ADMIN")) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FilmIcon className="h-8 w-8 text-arena-blue" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Reel-Einreichungen</h1>
                <span className="bg-arena-bg text-arena-blue text-xs font-semibold px-2.5 py-0.5 rounded-full border border-arena-border-light flex items-center gap-1">
                  <SparklesIcon className="w-3.5 h-3.5" /> Version 02 bereit
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Eingereichte Kurzvideos (9:16) verwalten, mit <strong>Kurzvideo2.pptx</strong> neu erzeugen &amp; Excel mit Captions exportieren
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Link href="/admin" className="btn btn-sm">
              ← Admin
            </Link>
            <Link href="/social-media" className="btn btn-sm">
              ← Social Media
            </Link>
            <button onClick={loadSubmissions} className="btn btn-sm btn-outline gap-1">
              <ArrowPathIcon className="h-4 w-4" /> Aktualisieren
            </button>
          </div>
        </div>

        {/* Version 02 Schnell-Aktionsleiste */}
        <div className="card-info mb-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-arena-blue" />
                <span className="font-bold text-arena-blue text-sm">Version 02 (Kurzvideo2.pptx)</span>
                <span className="text-xs bg-white/80 border border-arena-border-light text-arena-blue px-2 py-0.5 rounded-md font-medium">
                  Ohne &bdquo;Buchempfehlung&ldquo;-Überlagerung auf Folie 2 &amp; 3
                </span>
              </div>
              <p className="text-xs text-arena-blue mt-1">
                Erzeuge PPTX-Dateien neu mit der neuen Vorlage und exportiere Excel-Tabellen mit{" "}
                <code className="text-arena-blue font-semibold bg-white/70 px-1 py-0.5 rounded">
                  Title · Autor · Insta · Caption · Beschreibung
                </code>
              </p>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Excel v2 Button */}
              <button
                onClick={() => handleExportExcelV2(false)}
                className="btn btn-sm btn-outline gap-1.5 text-arena-blue bg-white border-arena-border-light hover:bg-arena-bg shadow-xs font-semibold"
                title="Excel mit den 5 Spalten Title, Autor, Insta, Caption, Beschreibung exportieren"
              >
                <TableCellsIcon className="h-4 w-4 text-arena-blue" />
                Excel v2 {selected.size > 0 ? `(${selected.size})` : `(${submissions.length})`}
              </button>

              {/* ZIP Paket Button */}
              <button
                onClick={() => handleDownloadZipV2(false)}
                disabled={downloadingZip}
                className="btn btn-sm btn-outline gap-1.5 text-arena-blue bg-white border-arena-border-light hover:bg-arena-bg shadow-xs font-semibold"
                title="Erzeugt ein ZIP mit Version-02-PPTX-Dateien und der fertigen Excel-Tabelle"
              >
                <ArchiveBoxIcon className="h-4 w-4 text-arena-blue" />
                {downloadingZip
                  ? "Erzeuge ZIP..."
                  : selected.size > 0
                  ? `ZIP v2 (${selected.size})`
                  : "ZIP Paket v2"}
              </button>

              {/* Batch Download Button */}
              {selected.size > 0 && (
                <button
                  onClick={handleDownloadSelectedV2}
                  disabled={downloading}
                  className="btn btn-sm btn-primary gap-1.5 shadow-xs"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {downloading ? "Lädt..." : `${selected.size} v2 PPTX laden`}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-green-600" /> {successMsg}
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline"}`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`btn btn-sm ${filter === "pending" ? "btn-primary" : "btn-outline"}`}
            >
              Ausstehend
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`btn btn-sm ${filter === "approved" ? "btn-primary" : "btn-outline"}`}
            >
              Genehmigt
            </button>
            <button
              onClick={() => setFilter("done")}
              className={`btn btn-sm ${
                filter === "done"
                  ? "bg-arena-blue text-white border-arena-blue font-bold"
                  : "btn-outline border-arena-border-light text-arena-blue hover:bg-arena-bg"
              }`}
            >
              ✓ Erledigt ({counts.done || submissions.length})
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`btn btn-sm ${filter === "rejected" ? "btn-primary" : "btn-outline"}`}
            >
              Abgelehnt
            </button>
          </div>

          {filter === "done" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Nur Erledigte:</span>
              <button
                onClick={() => handleExportExcelV2(true)}
                className="btn btn-xs btn-outline text-arena-blue border-arena-border-light bg-arena-bg hover:bg-arena-blue/5 gap-1"
              >
                <TableCellsIcon className="w-3.5 h-3.5" /> Excel Erledigte (v2)
              </button>
              <button
                onClick={() => handleDownloadZipV2(true)}
                disabled={downloadingZip}
                className="btn btn-xs btn-outline text-arena-blue border-arena-border-light bg-arena-bg hover:bg-arena-blue/5 gap-1"
              >
                <ArchiveBoxIcon className="w-3.5 h-3.5" /> ZIP Erledigte (v2)
              </button>
            </div>
          )}
        </div>

        {/* Alle auswählen */}
        {!loading && submissions.length > 0 && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all"
                className="checkbox checkbox-sm"
                checked={selected.size === submissions.length && submissions.length > 0}
                onChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer">
                Alle auswählen ({submissions.length})
                {selected.size > 0 && ` · ${selected.size} ausgewählt`}
              </label>
            </div>

            {selected.size > 0 && (
              <span className="text-xs text-gray-500">
                Aktionen für die {selected.size} ausgewählten Einreichungen stehen oben in der Leiste bereit.
              </span>
            )}
          </div>
        )}

        {/* Table / List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-arena-blue" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FilmIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Keine Einreichungen gefunden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const instaHandle = cleanInstagramHandle(sub.instagram || sub.authorInstagram);
              const captionExpanded = expandedCaptions.has(sub._id);
              const isCopied = copiedId === sub._id;
              const v2FileName = buildReelFileName(sub.bookTitle, sub.author, "v2");

              return (
                <div
                  key={sub._id}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-all ${
                    selected.has(sub._id)
                      ? "border-arena-blue bg-arena-bg ring-1 ring-arena-blue/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm mt-1 shrink-0"
                        checked={selected.has(sub._id)}
                        onChange={() => toggleSelect(sub._id)}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Title & Status */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-900 text-base">{sub.bookTitle}</h3>
                          {statusBadge(sub.status)}
                          <span className="text-[0.7rem] bg-arena-bg text-arena-blue font-medium px-2 py-0.5 rounded-full border border-arena-border-light">
                            v2 bereit
                          </span>
                        </div>

                        {/* Author & Instagram */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                          <span>
                            von <span className="font-semibold text-gray-800">{sub.author}</span>
                          </span>
                          {sub.submittedBy && (
                            <span className="text-gray-400 text-xs">(@{sub.submittedBy})</span>
                          )}
                          {instaHandle ? (
                            <a
                              href={`https://instagram.com/${instaHandle.replace(/^@/, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-arena-blue bg-arena-bg hover:bg-arena-blue/5 px-2 py-0.5 rounded-md border border-arena-border-light no-underline"
                            >
                              {instaHandle}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Kein Instagram angegeben</span>
                          )}
                        </div>

                        {/* Genre & Meta */}
                        {sub.genre && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium text-gray-600">Genre:</span> {sub.genre}
                          </p>
                        )}

                        {/* Description */}
                        {sub.beschreibung && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2.5 line-clamp-2">
                            <span className="font-semibold text-gray-700">Beschreibung: </span>
                            &ldquo;{sub.beschreibung}&rdquo;
                          </div>
                        )}

                        {sub.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">Notiz: {sub.notes}</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                          <span>{fmtDate(sub.createdAt)}</span>
                          <span>·</span>
                          <span>{fmtSize(sub.fileSize)}</span>
                          <span>·</span>
                          <span className="text-arena-blue font-mono text-[0.7rem]">{v2FileName}</span>
                        </div>

                        {/* Inline Caption Accordion */}
                        {captionExpanded && (
                          <div className="mt-3 p-3 bg-arena-bg border border-arena-border-light rounded-xl text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-arena-blue flex items-center gap-1">
                                <SparklesIcon className="w-3.5 h-3.5 text-arena-blue" />
                                Instagram Caption Vorschlag (Version 02)
                              </span>
                              <button
                                onClick={() => copyCaptionToClipboard(sub)}
                                className="btn btn-xs btn-outline gap-1 text-arena-blue border-arena-border-light hover:bg-arena-bg bg-white"
                              >
                                {isCopied ? (
                                  <>
                                    <CheckIcon className="w-3.5 h-3.5 text-green-600" /> Kopiert!
                                  </>
                                ) : (
                                  <>
                                    <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Kopieren
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-700 bg-white p-3 rounded-lg border border-arena-border-light max-h-48 overflow-y-auto">
                              {buildInstagramCaption(sub)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {/* PowerPoint / Video v2 Download */}
                      <button
                        onClick={() => handleDownloadPptx(sub._id, sub.fileName, "v2")}
                        className="btn btn-sm btn-primary gap-1.5 shadow-xs w-full justify-center"
                        title="Neu generieren mit Kurzvideo2.pptx (Version 02)"
                      >
                        <FilmIcon className="h-4 w-4" />
                        v2 herunterladen
                      </button>

                      {/* Second row: Caption copy & preview toggle */}
                      <div className="flex gap-1 w-full justify-end">
                        <button
                          onClick={() => copyCaptionToClipboard(sub)}
                          className={`btn btn-xs gap-1 ${
                            isCopied
                              ? "btn-success text-white"
                              : "btn-outline text-arena-blue border-arena-border-light hover:bg-arena-bg"
                          }`}
                          title="Fertige Instagram Caption in die Zwischenablage kopieren"
                        >
                          {isCopied ? (
                            <>
                              <CheckIcon className="h-3 w-3" /> Kopiert!
                            </>
                          ) : (
                            <>
                              <DocumentDuplicateIcon className="h-3 w-3" /> Caption
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => toggleCaptionExpand(sub._id)}
                          className="btn btn-xs btn-ghost text-gray-500 gap-0.5"
                          title="Caption-Vorschlag ansehen"
                        >
                          {captionExpanded ? (
                            <>
                              <ChevronUpIcon className="h-3 w-3" /> Schließen
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon className="h-3 w-3" /> Vorschau
                            </>
                          )}
                        </button>
                      </div>

                      {/* Fallback v1 Download */}
                      <button
                        onClick={() => handleDownloadPptx(sub._id, sub.fileName, "v1")}
                        className="btn btn-xs btn-ghost text-gray-400 hover:text-gray-600 gap-1"
                        title="Originale Version 01 mit altem Template herunterladen"
                      >
                        <ArrowDownTrayIcon className="h-3 w-3" />
                        v1 (alt)
                      </button>

                      {/* Status actions */}
                      <div className="flex gap-1 flex-wrap mt-1 justify-end">
                        {sub.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(sub._id, "approved")}
                              disabled={updatingId === sub._id}
                              className="btn btn-xs btn-success gap-1 text-white"
                            >
                              <CheckIcon className="h-3 w-3" /> Genehmigen
                            </button>
                            <button
                              onClick={() => updateStatus(sub._id, "rejected")}
                              disabled={updatingId === sub._id}
                              className="btn btn-xs btn-error gap-1 text-white"
                            >
                              <XMarkIcon className="h-3 w-3" /> Ablehnen
                            </button>
                          </>
                        )}
                        {sub.status === "approved" && (
                          <button
                            onClick={() => updateStatus(sub._id, "done")}
                            disabled={updatingId === sub._id}
                            className="btn btn-xs btn-info gap-1 text-white bg-arena-blue hover:bg-arena-blue border-none"
                          >
                            <CheckIcon className="h-3 w-3" /> Als erledigt markieren
                          </button>
                        )}
                        {(sub.status === "rejected" || sub.status === "done") && (
                          <button
                            onClick={() => updateStatus(sub._id, "pending")}
                            disabled={updatingId === sub._id}
                            className="btn btn-xs btn-ghost gap-1 text-gray-500"
                          >
                            <ArrowPathIcon className="h-3 w-3" /> Zurücksetzen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
