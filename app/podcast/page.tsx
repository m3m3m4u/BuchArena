"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { extractYoutubeId } from "@/lib/podcast-utils";

type Folge = {
  _id: string;
  title: string;
  text: string;
  youtubeUrl: string;
  views: number;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function PodcastPage() {
  const [htmlContent, setHtmlContent] = useState("");
  const [folgen, setFolgen] = useState<Folge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/podcast/startseite")
        .then((r) => r.json())
        .then((d: { htmlContent?: string }) => setHtmlContent(d.htmlContent ?? "")),
      fetch("/api/podcast/folgen")
        .then((r) => r.json())
        .then((d: { folgen?: Folge[] }) => setFolgen(d.folgen ?? [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="top-centered-main">
      <section className="card gap-6">
        <h1 className="text-2xl font-bold text-arena-blue">Podcast</h1>

        {loading && <p className="text-arena-muted text-sm">Wird geladen …</p>}

        {!loading && htmlContent && (
          <div
            className="ProseMirror text-[0.93rem] leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
          />
        )}

        {!loading && folgen.length > 0 && (
          <div className="flex flex-col gap-6 mt-2">
            <h2 className="text-xl font-semibold text-arena-blue">Alle Folgen</h2>
            {folgen.map((folge, i) => {
              const ytId = extractYoutubeId(folge.youtubeUrl);
              return (
                <article
                  key={folge._id}
                  className={`flex flex-col gap-3 ${i > 0 ? "pt-6 border-t border-arena-border" : ""}`}
                >
                  <Link
                    href={`/podcast/${folge._id}`}
                    className="text-[1.1rem] font-bold text-arena-blue hover:underline"
                  >
                    {folge.title}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {formatDate(folge.createdAt)} · {folge.views} Aufruf{folge.views !== 1 ? "e" : ""}
                  </p>
                  {folge.text && (
                    <p className="text-[0.93rem] text-gray-600 leading-relaxed">{folge.text}</p>
                  )}
                  {ytId && (
                    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                      <iframe
                        className="absolute inset-0 w-full h-full rounded-lg"
                        src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                        title={folge.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading && folgen.length === 0 && (
          <p className="text-arena-muted text-sm">Noch keine Folgen veröffentlicht.</p>
        )}
      </section>
    </main>
  );
}
