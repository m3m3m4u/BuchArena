"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

export default function VideoPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setVideoUrl(params.get("url") ?? "");
    setTitle(params.get("title") ?? "Vorstellungsvideo");
  }, []);

  const embedUrl = useMemo(() => toYouTubeEmbedUrl(videoUrl), [videoUrl]);

  return (
    <main className="centered-main">
      <section className="card">
        <h1>{title || "Vorstellungsvideo"}</h1>
        {!embedUrl ? (
          <p>Kein gültiger YouTube-Link vorhanden.</p>
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
