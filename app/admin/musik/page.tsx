"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";

type Track = {
  id: string;
  title: string;
  style: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  soundcloudUrl: string | null;
  createdAt: string;
};

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMusikPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [msg, setMsg] = useState("");

  // SoundCloud-Formular
  const [scTitle, setScTitle] = useState("");
  const [scStyle, setScStyle] = useState("");
  const [scDescription, setScDescription] = useState("");
  const [scUrl, setScUrl] = useState("");
  const [scSaving, setScSaving] = useState(false);
  const [scMsg, setScMsg] = useState("");

  useEffect(() => {
    const acc = getStoredAccount();
    setIsAdmin(acc?.role === "ADMIN" || acc?.role === "SUPERADMIN");
  }, []);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/musik");
      const data = (await res.json()) as { tracks?: Track[] };
      setTracks(data.tracks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTracks(); }, [loadTracks]);

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !style.trim() || !description.trim()) {
      setMsg("Bitte alle Felder ausfüllen und eine MP3-Datei wählen.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setMsg("");

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("style", style.trim());
    fd.append("description", description.trim());
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/musik/upload");

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      setUploadProgress(0);
      try {
        const data = JSON.parse(xhr.responseText) as { message?: string };
        if (xhr.status >= 200 && xhr.status < 300) {
          setMsg("✓ " + (data.message ?? "Hochgeladen."));
          setTitle(""); setStyle(""); setDescription(""); setFile(null);
          void loadTracks();
        } else {
          setMsg(data.message ?? "Fehler beim Hochladen.");
        }
      } catch {
        setMsg("Ungültige Serverantwort.");
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setUploadProgress(0);
      setMsg("Netzwerkfehler – bitte erneut versuchen.");
    });

    xhr.addEventListener("timeout", () => {
      setUploading(false);
      setUploadProgress(0);
      setMsg("Timeout – Verbindung zu langsam. Bitte erneut versuchen.");
    });

    xhr.timeout = 10 * 60 * 1000; // 10 Minuten
    xhr.send(fd);
  }

  async function handleSoundcloud(e: React.FormEvent) {
    e.preventDefault();
    if (!scTitle.trim() || !scStyle.trim() || !scDescription.trim() || !scUrl.trim()) {
      setScMsg("Bitte alle Felder ausfüllen.");
      return;
    }
    setScSaving(true);
    setScMsg("");
    try {
      const res = await fetch("/api/musik/soundcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: scTitle.trim(), style: scStyle.trim(), description: scDescription.trim(), soundcloudUrl: scUrl.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        setScMsg("✓ " + (data.message ?? "Gespeichert."));
        setScTitle(""); setScStyle(""); setScDescription(""); setScUrl("");
        await loadTracks();
      } else {
        setScMsg(data.message ?? "Fehler.");
      }
    } catch {
      setScMsg("Netzwerkfehler.");
    } finally {
      setScSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Track wirklich löschen?")) return;
    const res = await fetch(`/api/musik?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json()) as { message?: string };
    if (res.ok) {
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } else {
      alert(data.message ?? "Fehler beim Löschen.");
    }
  }

  if (isAdmin === null) return <div className="p-8 text-gray-500">Lade…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-semibold">Kein Zugriff.</div>;

  return (
    <main className="top-centered-main">
      <div className="w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🎵 Musik für Social Media</h1>

      {/* Upload-Formular */}
      <div className="mb-8 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Neuen Track hochladen</h2>
        <form onSubmit={handleUpload} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Epic Adventure"
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stil / Genre *</label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="z. B. Orchestral, Cinematic, Chill"
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wofür eignet sich der Track? Welche Stimmung vermittelt er?"
              rows={3}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MP3-Datei * (max. 50 MB)</label>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? `Hochladen… ${uploadProgress}%` : "Hochladen"}
            </button>
            {msg && (
              <p className={`text-sm ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</p>
            )}
          </div>
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </form>
      </div>

      {/* SoundCloud-Formular */}
      <div className="mb-8 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Track via SoundCloud hinzufügen</h2>
        <p className="text-sm text-gray-500 mb-4">Direkt eine SoundCloud-Track-URL eintragen – kein Datei-Upload nötig.</p>
        <form onSubmit={handleSoundcloud} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input type="text" value={scTitle} onChange={(e) => setScTitle(e.target.value)} placeholder="z. B. Lyric Breeze" maxLength={200} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stil / Genre *</label>
              <input type="text" value={scStyle} onChange={(e) => setScStyle(e.target.value)} placeholder="z. B. Ambient, Pop" maxLength={100} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
            <textarea value={scDescription} onChange={(e) => setScDescription(e.target.value)} placeholder="Wofür eignet sich der Track?" rows={2} maxLength={500} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SoundCloud-URL *</label>
            <input type="url" value={scUrl} onChange={(e) => setScUrl(e.target.value)} placeholder="https://soundcloud.com/lyberamusic/track-name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={scSaving} className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {scSaving ? "Wird gespeichert…" : "SoundCloud-Track hinzufügen"}
            </button>
            {scMsg && <p className={`text-sm ${scMsg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{scMsg}</p>}
          </div>
        </form>
      </div>

      {/* Track-Liste */}
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Vorhandene Tracks ({tracks.length})
      </h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Lade…</p>
      ) : tracks.length === 0 ? (
        <p className="text-gray-400 text-sm">Noch keine Tracks hochgeladen.</p>
      ) : (
        <div className="grid gap-3">
          {tracks.map((track) => (
            <div key={track.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 truncate">{track.title}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">{track.style}</span>
                  {track.fileSize && <span className="text-xs text-gray-400 shrink-0">{formatBytes(track.fileSize)}</span>}
                </div>
                <p className="text-sm text-gray-500 mb-2">{track.description}</p>
                {track.soundcloudUrl ? (
                  <iframe
                    width="100%"
                    height="80"
                    scrolling="no"
                    frameBorder="no"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.soundcloudUrl)}&auto_play=false&show_artwork=false&show_comments=false&buying=false&liking=false&download=false&sharing=false`}
                    className="rounded"
                  />
                ) : (
                  <audio controls className="w-full max-w-md h-9" src={track.fileUrl} />
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(track.id)}
                className="text-red-500 hover:text-red-700 text-sm shrink-0 transition-colors mt-0.5"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
