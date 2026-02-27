"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpTrayIcon,
  PlayIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";

type ReviewVideo = {
  fileName: string;
  size: number;
  uploadedAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReviewVideosPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [videos, setVideos] = useState<ReviewVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function sync() {
      setAccount(getStoredAccount());
      setAccountLoaded(true);
    }
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bucharena/videos");
      const data = (await res.json()) as { videos?: ReviewVideo[] };
      setVideos(data.videos ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "SUPERADMIN") void loadVideos();
    else setLoading(false);
  }, [account, loadVideos]);

  async function uploadSingleFile(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/bucharena/videos/upload");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(null);
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.message || `${file.name}: Upload fehlgeschlagen.`);
          } catch {
            resolve(`${file.name}: Upload fehlgeschlagen.`);
          }
        }
      };
      xhr.onerror = () => resolve(`${file.name}: Netzwerkfehler.`);
      xhr.send(formData);
    });
  }

  async function handleUpload(files: FileList) {
    const videoFiles = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videoFiles.length === 0) {
      setMessage("Nur Videodateien sind erlaubt.");
      setIsError(true);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadCurrent(0);
    setUploadTotal(videoFiles.length);
    setMessage("");
    setIsError(false);

    const errors: string[] = [];

    for (let i = 0; i < videoFiles.length; i++) {
      setUploadCurrent(i + 1);
      setUploadProgress(0);
      const err = await uploadSingleFile(videoFiles[i]);
      if (err) errors.push(err);
    }

    if (errors.length > 0) {
      setMessage(`${videoFiles.length - errors.length} von ${videoFiles.length} hochgeladen. Fehler: ${errors.join("; ")}`);
      setIsError(true);
    } else {
      setMessage(`${videoFiles.length} Video${videoFiles.length > 1 ? "s" : ""} erfolgreich hochgeladen.`);
      setIsError(false);
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadCurrent(0);
    setUploadTotal(0);
    if (inputRef.current) inputRef.current.value = "";
    void loadVideos();
  }

  async function handleDelete(fileName: string) {
    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch("/api/bucharena/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Löschen fehlgeschlagen.");

      setMessage(data.message ?? "Video gelöscht.");
      setIsError(false);
      setDeleteTarget(null);
      if (activeVideo === fileName) setActiveVideo(null);
      setVideos((prev) => prev.filter((v) => v.fileName !== fileName));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
      setIsError(true);
    } finally {
      setDeleting(false);
    }
  }

  if (!accountLoaded) {
    return (
      <main className="centered-main">
        <section className="card"><p>Lade …</p></section>
      </main>
    );
  }

  if (account?.role !== "SUPERADMIN") {
    return (
      <main className="centered-main">
        <section className="card">
          <h1>Videokontrolle</h1>
          <p className="text-red-700">Nur der Admin kann diese Seite sehen.</p>
          <Link href="/social-media" className="btn">Zurück</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1>Videokontrolle</h1>
          <Link href="/social-media" className="btn btn-sm">← Zurück</Link>
        </div>

        {/* Upload-Bereich */}
        <div className="mt-4 p-4 border border-dashed border-arena-border rounded-xl text-center">
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const fl = e.target.files;
              if (fl && fl.length > 0) void handleUpload(fl);
            }}
          />
          {uploading ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">
                Video {uploadCurrent} / {uploadTotal} … {uploadProgress}%
              </p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-arena-blue transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              Video hochladen
            </button>
          )}
          <p className="text-xs text-arena-muted mt-2">Max. 500 MB · MP4, WebM, MOV etc.</p>
        </div>

        {/* Status-Nachricht */}
        {message && (
          <p className={`mt-3 text-sm ${isError ? "text-red-700" : "text-green-700"}`}>
            {message}
          </p>
        )}

        {/* Video-Player Overlay */}
        {activeVideo && (
          <div className="overlay-backdrop" onClick={() => setActiveVideo(null)}>
            <div
              className="bg-black rounded-xl overflow-hidden w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-2 bg-arena-blue text-white">
                <span className="text-sm truncate">{activeVideo}</span>
                <button
                  type="button"
                  className="text-white bg-transparent border-none cursor-pointer p-1"
                  onClick={() => setActiveVideo(null)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <video
                className="w-full"
                controls
                autoPlay
                controlsList="nodownload"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                style={{ maxHeight: "80vh" }}
              >
                <source
                  src={`/api/bucharena/videos/stream?file=${encodeURIComponent(activeVideo)}`}
                  type="video/mp4"
                />
                Dein Browser unterstützt dieses Videoformat nicht.
              </video>
            </div>
          </div>
        )}

        {/* Löschen-Bestätigung */}
        {deleteTarget && (
          <div className="overlay-backdrop" onClick={() => setDeleteTarget(null)}>
            <div
              className="bg-white rounded-xl p-5 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg m-0 mb-3">Video löschen?</h2>
              <p className="text-sm text-arena-muted mb-4 break-all">{deleteTarget}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-danger flex-1"
                  disabled={deleting}
                  onClick={() => void handleDelete(deleteTarget)}
                >
                  {deleting ? "Lösche …" : "Ja, löschen"}
                </button>
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => setDeleteTarget(null)}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video-Liste */}
        <div className="mt-5">
          {loading ? (
            <p className="text-sm text-arena-muted">Lade Videos …</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-arena-muted">Noch keine Videos hochgeladen.</p>
          ) : (
            <div className="grid gap-2">
              {videos.map((v) => (
                <div
                  key={v.fileName}
                  className="flex items-center gap-3 p-3 rounded-lg border border-arena-border hover:border-gray-400 transition-colors"
                >
                  <PlayIcon className="w-6 h-6 text-arena-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.fileName}</p>
                    <p className="text-xs text-arena-muted">
                      {formatSize(v.size)} · {formatDate(v.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="btn btn-sm inline-flex items-center gap-1"
                      onClick={() => setActiveVideo(v.fileName)}
                    >
                      <PlayIcon className="w-3.5 h-3.5" />
                      Ansehen
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger inline-flex items-center gap-1"
                      onClick={() => setDeleteTarget(v.fileName)}
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
