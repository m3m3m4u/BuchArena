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
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const GENRE_OPTIONS = [
  "Fantasy", "Science-Fiction", "Krimi / Thriller", "Horror",
  "Liebesroman / Romance", "Historischer Roman", "Abenteuer",
  "Biografie / Autobiografie", "Sachbuch", "Kinderbuch", "Jugendbuch",
  "Comic / Manga / Graphic Novel", "Klassiker", "Drama", "Humor / Satire",
  "Dystopie", "Mystery", "Märchen / Sagen", "Gedichte / Lyrik",
  "Kurzgeschichten", "Sonstiges",
];
const AGE_RANGE_OPTIONS = [
  "ab 2 Jahren", "ab 4 Jahren", "ab 6 Jahren", "ab 8 Jahren",
  "ab 10 Jahren", "ab 12 Jahren", "ab 14 Jahren", "ab 16 Jahren",
  "ab 18 Jahren", "Alle Altersgruppen",
];

const SvgIg = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{ color: "#E1306C" }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

interface Submission {
  _id: string;
  bookTitle: string;
  author: string;
  genre?: string;
  ageRange?: string;
  fileName: string;
  fileSize: number;
  notes?: string;
  contact: string;
  contactType: "email" | "instagram";
  status: "pending" | "approved" | "rejected" | "done";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function BucharenaAdminSubmissions() {
  const router = useRouter();
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "done">("all");
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    try {
      const url = filter === "all" ? "/api/bucharena/submissions/admin" : `/api/bucharena/submissions/admin?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { if (account?.role === "SUPERADMIN") loadSubmissions(); }, [account, loadSubmissions]);

  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/bucharena/submissions/admin/${id}/download`);
      if (!res.ok) throw new Error("Download fehlgeschlagen");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { alert("Download fehlgeschlagen"); }
  };

  const handleUpdate = async () => {
    if (!editingSubmission) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bucharena/submissions/admin/${editingSubmission._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: editingSubmission.bookTitle, author: editingSubmission.author,
          genre: editingSubmission.genre, ageRange: editingSubmission.ageRange,
          notes: editingSubmission.notes, contact: editingSubmission.contact,
          contactType: editingSubmission.contactType, status: editingSubmission.status,
          reviewNotes: editingSubmission.reviewNotes,
        }),
      });
      const data = await res.json();
      if (data.success) { setEditingSubmission(null); loadSubmissions(); }
      else alert("Fehler: " + data.error);
    } catch { alert("Fehler beim Speichern"); }
    finally { setSaving(false); }
  };

  const handleDeleteSubmission = async (id: string) => {
    try {
      const res = await fetch(`/api/bucharena/submissions/admin/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { setShowDeleteConfirm(null); loadSubmissions(); }
      else alert("Fehler: " + data.error);
    } catch { alert("Fehler beim Löschen"); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; icon: typeof ClockIcon; label: string }> = {
      pending: { bg: "#fef9c3", color: "#854d0e", icon: ClockIcon, label: "Ausstehend" },
      approved: { bg: "#dcfce7", color: "#166534", icon: CheckIcon, label: "Genehmigt" },
      rejected: { bg: "#fee2e2", color: "#991b1b", icon: XMarkIcon, label: "Abgelehnt" },
      done: { bg: "#dbeafe", color: "#1e40af", icon: CheckIcon, label: "Erledigt" },
    };
    const m = map[status]; if (!m) return null;
    const Icon = m.icon;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.15rem 0.5rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 500, background: m.bg, color: m.color }}><Icon style={{ width: 12, height: 12 }} />{m.label}</span>;
  };

  if (account?.role !== "SUPERADMIN") return null;

  const filterBtn = (f: string) => {
    const active = filter === f;
    return `px-3 py-1 rounded-lg text-[0.82rem] font-medium cursor-pointer border-none ${active ? "bg-arena-link text-white" : "bg-[#f3f4f6] text-arena-text"}`;
  };

  return (
    <main className="top-centered-main">
      <section className="card" style={{ gap: "1rem" }}>
        <div><h1>BuchArena – Einreichungen</h1><p className="text-arena-muted mt-1">Verwaltung der eingesendeten PowerPoint-Präsentationen</p></div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <FunnelIcon className="w-4 h-4 text-[#888]" /><span className="font-medium text-[0.9rem]">Status:</span>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilter("all")} className={filterBtn("all")}>Alle</button>
            <button onClick={() => setFilter("pending")} className={filterBtn("pending")}>Ausstehend</button>
            <button onClick={() => setFilter("approved")} className={filterBtn("approved")}>Genehmigt</button>
            <button onClick={() => setFilter("rejected")} className={filterBtn("rejected")}>Abgelehnt</button>
            <button onClick={() => setFilter("done")} className={filterBtn("done")}>Erledigt</button>
          </div>
          <button onClick={loadSubmissions} className="btn btn-sm ml-auto flex items-center gap-1">
            <ArrowPathIcon className="w-3.5 h-3.5" />Aktualisieren
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center text-[#888] py-8">Lade Einreichungen...</p>
        ) : submissions.length === 0 ? (
          <div className="text-center py-8 text-[#888]"><DocumentTextIcon className="w-10 h-10 mx-auto mb-2 text-[#ccc]" /><p>Keine Einreichungen gefunden.</p></div>
        ) : (
          <div className="grid gap-3">
            {submissions.map(sub => (
              <div key={sub._id} className="border border-arena-border-light rounded-lg p-3">
                <div className="flex justify-between items-start gap-2 flex-wrap mb-2">
                  <div className="flex-1 min-w-0">
                    <strong className="text-[1.02rem]">{sub.bookTitle}</strong>
                    <p className="mt-0.5 text-arena-muted text-[0.9rem]">{sub.author}</p>
                  </div>
                  {statusBadge(sub.status)}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[0.82rem] mb-2">
                  <div><span className="text-[#888]">Genre:</span> {sub.genre || "-"}</div>
                  <div><span className="text-[#888]">Alter:</span> {sub.ageRange || "-"}</div>
                  <div className="col-span-full"><span className="text-[#888]">Datei:</span> {sub.fileName} ({fmtSize(sub.fileSize)})</div>
                  <div className="col-span-full flex items-center gap-1">
                    {sub.contactType === "email" ? <EnvelopeIcon className="w-3.5 h-3.5 text-[#888]" /> : <SvgIg />}
                    <span>{sub.contact}</span>
                  </div>
                  {sub.notes && <div className="col-span-full text-[#555]">Notiz: {sub.notes}</div>}
                  {sub.reviewNotes && <div className="col-span-full text-[#555]">Admin: {sub.reviewNotes}</div>}
                </div>
                <div className="flex justify-between items-center border-t border-[#e5e7eb] pt-2">
                  <span className="text-[0.75rem] text-[#888]">{fmtDate(sub.createdAt)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleDownload(sub._id, sub.fileName)} className="btn btn-sm text-arena-link" title="Herunterladen"><ArrowDownTrayIcon className="w-4 h-4" /></button>
                    <button onClick={() => setEditingSubmission(sub)} className="btn btn-sm text-[#d97706]" title="Bearbeiten"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => setShowDeleteConfirm(sub._id)} className="btn btn-sm btn-danger" title="Löschen"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div><Link href="/social-media" className="text-arena-link no-underline">← Zurück zur Übersicht</Link></div>
      </section>

      {/* Edit Modal */}
      {editingSubmission && (
        <div className="overlay-backdrop">
          <div className="bg-white rounded-xl p-5 grid gap-3.5 w-full" style={{ maxWidth: 560 }}>
            <h2 className="m-0">Einreichung bearbeiten</h2>
            <div className="grid gap-3">
              <label className="grid gap-1 text-[0.95rem]">Buchtitel<input className="input-base" value={editingSubmission.bookTitle} onChange={e => setEditingSubmission({ ...editingSubmission, bookTitle: e.target.value })} /></label>
              <label className="grid gap-1 text-[0.95rem]">Autor<input className="input-base" value={editingSubmission.author} onChange={e => setEditingSubmission({ ...editingSubmission, author: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-[0.95rem]">Genre
                  <select className="input-base" value={editingSubmission.genre || ""} onChange={e => setEditingSubmission({ ...editingSubmission, genre: e.target.value })}>
                    <option value="">Bitte wählen...</option>
                    {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-[0.95rem]">Altersempfehlung
                  <select className="input-base" value={editingSubmission.ageRange || ""} onChange={e => setEditingSubmission({ ...editingSubmission, ageRange: e.target.value })}>
                    <option value="">Bitte wählen...</option>
                    {AGE_RANGE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-[0.95rem]">Anmerkungen (vom Autor)<textarea className="input-base resize-y" rows={3} value={editingSubmission.notes || ""} onChange={e => setEditingSubmission({ ...editingSubmission, notes: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-[0.95rem]">Kontaktart
                  <select className="input-base" value={editingSubmission.contactType} onChange={e => setEditingSubmission({ ...editingSubmission, contactType: e.target.value as "email" | "instagram" })}>
                    <option value="email">E-Mail</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[0.95rem]">Kontakt<input className="input-base" value={editingSubmission.contact} onChange={e => setEditingSubmission({ ...editingSubmission, contact: e.target.value })} /></label>
              </div>
              <label className="grid gap-1 text-[0.95rem]">Status
                <select className="input-base" value={editingSubmission.status} onChange={e => setEditingSubmission({ ...editingSubmission, status: e.target.value as Submission["status"] })}>
                  <option value="pending">Ausstehend</option>
                  <option value="approved">Genehmigt</option>
                  <option value="rejected">Abgelehnt</option>
                  <option value="done">Erledigt</option>
                </select>
              </label>
              <label className="grid gap-1 text-[0.95rem]">Admin-Notizen<textarea className="input-base resize-y" rows={3} placeholder="Interne Notizen..." value={editingSubmission.reviewNotes || ""} onChange={e => setEditingSubmission({ ...editingSubmission, reviewNotes: e.target.value })} /></label>
              <div className="text-[0.82rem] text-[#888]">
                <p className="my-0.5"><strong>Datei:</strong> {editingSubmission.fileName} ({fmtSize(editingSubmission.fileSize)})</p>
                <p className="my-0.5"><strong>Eingereicht am:</strong> {fmtDate(editingSubmission.createdAt)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditingSubmission(null)} className="btn">Abbrechen</button>
              <button onClick={handleUpdate} disabled={saving} className="btn btn-primary font-semibold">
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="overlay-backdrop">
          <div className="bg-white rounded-xl p-5 grid gap-3.5 w-full" style={{ maxWidth: 440 }}>
            <h2 className="m-0">Einreichung löschen?</h2>
            <p className="text-arena-muted">Diese Aktion kann nicht rückgängig gemacht werden. Die Datei wird dauerhaft gelöscht.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn">Abbrechen</button>
              <button onClick={() => handleDeleteSubmission(showDeleteConfirm)} className="btn btn-danger font-semibold">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
