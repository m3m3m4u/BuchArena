"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStoredConsent } from "@/lib/client-state";

function toYouTubeEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      const parts = url.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return `https://www.youtube.com/embed/${parts[shortsIndex + 1]}`;
    }
  } catch { return ""; }
  return "";
}

function toYouTubeThumbnail(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    let videoId = "";
    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.replace(/^\//, "");
    } else if (url.hostname.includes("youtube.com")) {
      videoId = url.searchParams.get("v") ?? "";
      if (!videoId) {
        const parts = url.pathname.split("/").filter(Boolean);
        const si = parts.indexOf("shorts");
        if (si >= 0 && parts[si + 1]) videoId = parts[si + 1];
      }
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  } catch { return ""; }
}

export default function VideoPage() {
  return <Suspense fallback={<main className="centered-main">Video wird geladen …</main>}><VideoContent /></Suspense>;
}

function VideoContent() {
  const params = useSearchParams();
  const videoUrl = params.get("url") ?? "";
  const title = params.get("title") ?? "Vorstellungsvideo";
  const consentGiven = useStoredConsent() === "all";
  const [userAccepted, setUserAccepted] = useState(false);

  const embedUrl = useMemo(() => toYouTubeEmbedUrl(videoUrl), [videoUrl]);
  const thumbnail = useMemo(() => toYouTubeThumbnail(videoUrl), [videoUrl]);
  const showVideo = consentGiven || userAccepted;

  return (
    <main className="centered-main">
      <section className="card">
        <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight m-0">{title || "Vorstellungsvideo"}</h1>
        {!embedUrl ? (
          <p className="font-sans text-arena-muted text-sm mt-4">Kein gültiger YouTube-Link vorhanden.</p>
        ) : !showVideo ? (
          <div
            className="relative grid w-full max-w-[900px] overflow-hidden rounded-xl border border-arena-border-light bg-gray-900 mt-4 sm:aspect-video"
          >
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            )}
            <div className="relative flex flex-col items-center justify-center gap-3 text-white text-center px-6 py-6">
              <svg className="w-16 h-16 shrink-0 opacity-80" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <p className="font-sans text-sm max-w-[400px] leading-snug">
                Mit dem Abspielen wird eine Verbindung zu YouTube (Google LLC) hergestellt.
                Es gelten die{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline font-sans">Datenschutzbestimmungen von Google</a>.
              </p>
              <button type="button" className="btn bg-white text-gray-900 hover:bg-gray-100 text-sm font-sans" onClick={() => setUserAccepted(true)}>Video laden</button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[900px] overflow-hidden rounded-xl border border-arena-border-light bg-black mt-4" style={{ aspectRatio: "16/9" }}>
            <iframe
              className="h-full w-full border-0"
              src={embedUrl}
              title={title || "Vorstellungsvideo"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}
        <Link href="/meine-buecher" className="btn font-sans mt-4">Zurück zu Meine Bücher</Link>
      </section>
    </main>
  );
}
