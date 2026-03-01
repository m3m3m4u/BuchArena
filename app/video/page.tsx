"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStoredConsent } from "@/lib/cookie-consent";

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
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [userAccepted, setUserAccepted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setVideoUrl(params.get("url") ?? "");
    setTitle(params.get("title") ?? "Vorstellungsvideo");
    setConsentGiven(getStoredConsent() === "all");
  }, []);

  const embedUrl = useMemo(() => toYouTubeEmbedUrl(videoUrl), [videoUrl]);
  const thumbnail = useMemo(() => toYouTubeThumbnail(videoUrl), [videoUrl]);
  const showVideo = consentGiven || userAccepted;

  return (
    <main className="centered-main">
      <section className="card">
        <h1>{title || "Vorstellungsvideo"}</h1>
        {!embedUrl ? (
          <p>Kein gültiger YouTube-Link vorhanden.</p>
        ) : !showVideo ? (
          <div
            className="relative w-full max-w-[900px] overflow-hidden rounded-xl border border-arena-border bg-gray-900 cursor-pointer group"
            style={{ aspectRatio: "16/9" }}
            onClick={() => setUserAccepted(true)}
          >
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white text-center px-6">
              <svg className="w-16 h-16 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <p className="text-sm max-w-[400px] leading-snug">
                Mit dem Abspielen wird eine Verbindung zu YouTube (Google LLC) hergestellt.
                Es gelten die{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Datenschutzbestimmungen von Google</a>.
              </p>
              <span className="btn bg-white text-gray-900 hover:bg-gray-100 text-sm">Video laden</span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[900px] overflow-hidden rounded-xl border border-arena-border bg-black" style={{ aspectRatio: "16/9" }}>
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
        <Link href="/meine-buecher" className="btn">Zurück zu Meine Bücher</Link>
      </section>
    </main>
  );
}
