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
                  <article key={folge._id} className="flex flex-col gap-3">
                    <Link
                      href={`/podcast/${folge._id}`}
                      className="text-[1.05rem] font-bold text-arena-blue hover:underline"
                    >
                      {folge.title}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {formatDate(folge.createdAt)} · {folge.views} Aufruf{folge.views !== 1 ? "e" : ""}
                    </p>
                    {folge.text && (
                      <p className="text-[0.88rem] text-gray-600 leading-relaxed line-clamp-3">{folge.text}</p>
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded border border-arena-border text-sm disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  Zuruck
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`px-3 py-1 rounded border text-sm transition ${
                      i === page
                        ? "bg-arena-blue text-white border-arena-blue"
                        : "border-arena-border hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="px-3 py-1 rounded border border-arena-border text-sm disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  Weiter
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
