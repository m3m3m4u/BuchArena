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

const PAGE_SIZE = 3;

export default function PodcastPage() {
  const [htmlContent, setHtmlContent] = useState("");
  const [folgen, setFolgen] = useState<Folge[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

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

  const totalPages = Math.ceil(folgen.length / PAGE_SIZE);
  const pageFolgen = folgen.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pageFolgen.map((folge) => {
                const ytId = extractYoutubeId(folge.youtubeUrl);
                return (
                  <article key={folge._id} className="flex flex-col gap-3 rounded-xl border border-arena-border-light bg-white p-4 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200">
                    <Link
                      href={`/podcast/${folge._id}`}
                      className="text-base font-bold text-arena-blue hover:text-arena-blue-light no-underline"
                    >
                      {folge.title}
                    </Link>
                    <p className="text-xs text-arena-muted m-0">
                      {formatDate(folge.createdAt)} · {folge.views} Aufruf{folge.views !== 1 ? "e" : ""}
                    </p>
                    {folge.text && (
                      <p className="text-sm text-arena-text leading-relaxed line-clamp-3 m-0">{folge.text}</p>
                    )}
                    {ytId && (
                      <div className="relative w-full mt-auto rounded-lg overflow-hidden border border-arena-border-light" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          className="absolute inset-0 w-full h-full"
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn btn-sm text-sm"
                >
                  ← Zurück
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`btn btn-sm text-sm ${i === page ? "btn-primary" : ""}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="btn btn-sm text-sm"
                >
                  Weiter →
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && folgen.length === 0 && (
          <p className="text-arena-muted text-sm">Noch keine Folgen veröffentlicht.</p>
        )}
      </section>
    </main>
  );
}
