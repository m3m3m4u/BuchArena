"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface Mp3File {
  fileName: string;
  path: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface SprecherText {
  _id: string;
  pdfFileName: string;
  pdfPath: string;
  pdfUrl: string;
  title: string;
  sprecherName?: string;
  bookedAt?: string;
  mp3Files: Mp3File[];
  status: "offen" | "gebucht" | "erledigt";
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SprecherTextePage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const isAdmin = account?.role === "SUPERADMIN";

  const [texte, setTexte] = useState<SprecherText[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"alle" | "offen" | "gebucht" | "erledigt">("alle");

  // Admin: PDF Upload
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  // User: Name eintragen / MP3 Upload
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mp3UploadId, setMp3UploadId] = useState<string | null>(null);
  const [mp3Files, setMp3Files] = useState<FileList | null>(null);
  const [mp3UploaderName, setMp3UploaderName] = useState("");
  const [mp3Uploading, setMp3Uploading] = useState(false);

  useEffect(() => {
    const s = () => setAccount(getStoredAccount());
    s();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, s);
    window.addEventListener("storage", s);
    return () => { window.removeEventListener(ACCOUNT_CHANGED_EVENT, s); window.removeEventListener("storage", s); };
  }, []);

  const loadTexte = useCallback(async () => {
    try {
      const params = filter !== "alle" ? `?status=${filter}` : "";
      const res = await fetch(`/api/bucharena/sprecher${params}`);
      const data = await res.json();
      if (data.success) setTexte(data.texte);
      else setError(data.error || "Fehler beim Laden");
    } catch { setError("Netzwerkfehler"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadTexte(); }, [loadTexte]);

  // Admin: PDF hochladen
  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    let successCount = 0, failCount = 0;
    for (let i = 0; i < uploadFiles.length; i++) {
      const fd = new FormData();
      fd.append("file", uploadFiles[i]);
      try {
        const res = await fetch("/api/bucharena/sprecher", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) successCount++;
        else failCount++;
      } catch { failCount++; }
    }
    setShowUploadForm(false);
    setUploadFiles(null);
    loadTexte();
    setUploading(false);
    if (failCount > 0) alert(`${successCount} von ${uploadFiles.length} Dateien erfolgreich. ${failCount} fehlgeschlagen.`);
  };

  // User: Namen eintragen
  const handleSaveName = async (textId: string) => {
    try {
      const res = await fetch(`/api/bucharena/sprecher/${textId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sprecherName: editName.trim() }) });
      const data = await res.json();
      if (data.success) { setEditingId(null); setEditName(""); loadTexte(); }
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
  };

  // User: MP3 hochladen
  const handleMp3Upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mp3Files || !mp3UploadId || mp3Files.length === 0) return;
    setMp3Uploading(true);
    let successCount = 0, failCount = 0;
    for (let i = 0; i < mp3Files.length; i++) {
      const fd = new FormData();
      fd.append("file", mp3Files[i]);
      if (mp3UploaderName.trim()) fd.append("uploaderName", mp3UploaderName.trim());
      try {
        const res = await fetch(`/api/bucharena/sprecher/${mp3UploadId}/mp3`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) successCount++;
        else failCount++;
      } catch { failCount++; }
    }
    setMp3UploadId(null); setMp3Files(null); setMp3UploaderName("");
    loadTexte();
    setMp3Uploading(false);
    if (failCount > 0) alert(`${successCount} von ${mp3Files.length} MP3s erfolgreich. ${failCount} fehlgeschlagen.`);
  };

  // Admin: Status ändern
  const handleStatusChange = async (textId: string, status: string) => {
    try {
      const res = await fetch(`/api/bucharena/sprecher/${textId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (data.success) loadTexte();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
  };

  // Admin: Text löschen
  const handleDelete = async (textId: string) => {
    if (!confirm("Diesen Text wirklich löschen? Alle zugehörigen Dateien werden ebenfalls gelöscht.")) return;
    try {
      const res = await fetch(`/api/bucharena/sprecher?id=${textId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) loadTexte();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
  };

  // Admin: MP3 löschen
  const handleDeleteMp3 = async (textId: string, mp3Index: number) => {
    if (!confirm("Diese MP3 wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/bucharena/sprecher/${textId}/mp3?mp3Index=${mp3Index}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) loadTexte();
      else alert(data.error || "Fehler");
    } catch { alert("Netzwerkfehler"); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { classes: string; icon: typeof ClockIcon; label: string }> = {
      offen: { classes: "bg-green-50 text-green-800", icon: ClockIcon, label: "Offen" },
      gebucht: { classes: "bg-amber-50 text-amber-800", icon: UserIcon, label: "Gebucht" },
      erledigt: { classes: "bg-blue-50 text-blue-800", icon: CheckCircleIcon, label: "Erledigt" },
    };
    const m = map[status];
    if (!m) return null;
    const Icon = m.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.classes}`}>
        <Icon className="w-3 h-3" />{m.label}
      </span>
    );
  };

  if (loading) return <main className="top-centered-main"><section className="card"><p>Lade Sprecher-Texte...</p></section></main>;

  return (
    <main className="top-centered-main">
      <section className="card gap-4">
        <div className="text-center">
          <h1>Sprecher-Texte</h1>
          <p className="text-arena-muted mt-1">Wähle einen Text aus, trage deinen Namen ein und lade deine Aufnahme hoch.</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(["alle", "offen", "gebucht", "erledigt"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[0.85rem] font-medium cursor-pointer border-none ${filter === f ? "bg-arena-blue text-white" : "bg-gray-100 text-arena-text"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Admin: PDF Upload Button */}
        {isAdmin && (
          <div className="flex justify-center">
            <button onClick={() => setShowUploadForm(!showUploadForm)} className="btn btn-primary flex items-center gap-1.5">
              <PlusIcon className="w-4 h-4" />Neuen Text hochladen
            </button>
          </div>
        )}

        {/* Admin: Upload Form */}
        {isAdmin && showUploadForm && (
          <form onSubmit={handlePdfUpload} className="p-4 bg-amber-50 border border-amber-400 rounded-lg grid gap-2.5">
            <h3 className="m-0">Sprecher-Texte hochladen</h3>
            <p className="m-0 text-[0.85rem] text-gray-400">Der Titel wird automatisch aus dem Dateinamen übernommen (ohne .pdf)</p>
            <label className="grid gap-1 text-[0.9rem]">
              PDF-Dateien (mehrere möglich)
              <input type="file" accept=".pdf" multiple onChange={e => setUploadFiles(e.target.files)} className="input-base" required />
              {uploadFiles && uploadFiles.length > 0 && <span className="text-xs text-gray-400">{uploadFiles.length} Datei(en) ausgewählt</span>}
            </label>
            <div className="flex gap-1.5">
              <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? "Lädt hoch..." : "Hochladen"}</button>
              <button type="button" onClick={() => setShowUploadForm(false)} className="btn">Abbrechen</button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && <p className="text-red-700 bg-red-50 px-3 py-2.5 rounded-lg">{error}</p>}

        {/* List */}
        {texte.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Keine Texte gefunden.</p>
        ) : (
          <div className="grid gap-2.5">
            {texte.map(text => (
              <div key={text._id} className={`p-3 rounded-lg border ${text.status === "erledigt" ? "border-blue-200 bg-blue-50" : text.status === "gebucht" ? "border-amber-400 bg-amber-50" : "border-arena-border-light bg-white"}`}>
                {/* Header */}
                <div className="flex gap-2.5 flex-wrap items-start">
                  <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                    <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <strong>{text.title}</strong>
                      {statusBadge(text.status)}
                    </div>
                    <p className="text-[0.82rem] text-gray-400">{text.pdfFileName}</p>

                    {text.sprecherName && <p className="mt-1 text-[0.9rem]"><strong>Sprecher:</strong> {text.sprecherName}</p>}

                    {/* MP3s */}
                    {text.mp3Files.length > 0 && (
                      <div className="mt-2.5 grid gap-1">
                        <p className="text-[0.85rem] font-medium">Hochgeladene MP3s:</p>
                        {text.mp3Files.map((mp3, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[0.82rem] bg-gray-100 px-2.5 py-1.5 rounded-md">
                            <MusicalNoteIcon className="w-3.5 h-3.5 text-green-600" />
                            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{mp3.fileName}</span>
                            {mp3.uploadedBy && <span className="text-gray-400">von {mp3.uploadedBy}</span>}
                            <a href={mp3.url} download={mp3.fileName} className="text-indigo-600" title="Herunterladen"><ArrowDownTrayIcon className="w-3.5 h-3.5" /></a>
                            {isAdmin && <button onClick={() => handleDeleteMp3(text._id, idx)} className="text-red-600 bg-transparent border-none cursor-pointer" title="Löschen"><TrashIcon className="w-3.5 h-3.5" /></button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1 shrink-0">
                    <a href={text.pdfUrl} download={text.pdfFileName} className="btn btn-sm flex items-center gap-1" title="PDF herunterladen">
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />PDF
                    </a>
                    {text.status !== "erledigt" && (
                      <button onClick={() => { setMp3UploadId(text._id); setMp3Files(null); setMp3UploaderName(text.sprecherName || ""); }} className="btn btn-sm flex items-center gap-1 bg-green-50 text-green-800">
                        <CloudArrowUpIcon className="w-3.5 h-3.5" />MP3
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <select value={text.status} onChange={e => handleStatusChange(text._id, e.target.value)} className="input-base w-auto text-xs px-1.5 py-1">
                          <option value="offen">Offen</option>
                          <option value="gebucht">Gebucht</option>
                          <option value="erledigt">Erledigt</option>
                        </select>
                        <button onClick={() => handleDelete(text._id)} className="btn btn-sm btn-danger" title="Löschen"><TrashIcon className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Name eintragen */}
                {text.status !== "erledigt" && editingId !== text._id && !text.sprecherName && (
                  <div className="mt-2.5 pt-2.5 border-t border-arena-border-light">
                    <button onClick={() => { setEditingId(text._id); setEditName(""); }} className="text-[0.85rem] text-indigo-600 bg-transparent border-none cursor-pointer flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" />Meinen Namen eintragen
                    </button>
                  </div>
                )}

                {editingId === text._id && (
                  <div className="mt-2.5 pt-2.5 border-t border-arena-border-light flex gap-1.5 flex-wrap">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Dein Name" className="input-base flex-1" />
                    <button onClick={() => handleSaveName(text._id)} className="btn btn-primary text-[0.85rem]" disabled={!editName.trim()}>Speichern</button>
                    <button onClick={() => setEditingId(null)} className="btn text-[0.85rem]">Abbrechen</button>
                  </div>
                )}

                {/* MP3 Upload Form */}
                {mp3UploadId === text._id && (
                  <form onSubmit={handleMp3Upload} className="mt-2.5 pt-2.5 border-t border-arena-border-light grid gap-1.5">
                    <h4 className="m-0 text-[0.9rem]">MP3(s) hochladen</h4>
                    <div className="flex gap-1.5 flex-wrap">
                      <input type="text" value={mp3UploaderName} onChange={e => setMp3UploaderName(e.target.value)} placeholder="Dein Name (optional)" className="input-base flex-1" />
                      <input type="file" accept=".mp3" multiple onChange={e => setMp3Files(e.target.files)} className="input-base flex-1" required />
                    </div>
                    {mp3Files && mp3Files.length > 0 && <span className="text-xs text-gray-400">{mp3Files.length} Datei(en) ausgewählt</span>}
                    <div className="flex gap-1.5">
                      <button type="submit" className="btn btn-primary text-[0.85rem]" disabled={!mp3Files || mp3Files.length === 0 || mp3Uploading}>{mp3Uploading ? "Lädt hoch..." : "Hochladen"}</button>
                      <button type="button" onClick={() => setMp3UploadId(null)} className="btn text-[0.85rem]">Abbrechen</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        <div><Link href="/social-media" className="text-arena-link no-underline">← Zurück zur Autoren-Übersicht</Link></div>
      </section>
    </main>
  );
}
