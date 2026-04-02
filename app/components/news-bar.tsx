"use client";

import { useEffect, useState } from "react";

type NewsLayout = "text-only" | "image-left" | "image-right";

type NewsPost = {
  _id: string;
  title: string;
  layout: NewsLayout;
  htmlContent: string;
  imageUrl: string | null;
  imageRatio: number;
  createdAt: string;
};

export default function NewsBar() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d: { posts?: NewsPost[] }) => {
        if (d.posts?.length) setPosts(d.posts);
      })
      .catch(() => {});
  }, []);

  if (!posts.length || dismissed) return null;

  const post = posts[currentIndex];

  function prev() {
    setCurrentIndex((i) => (i - 1 + posts.length) % posts.length);
    setExpanded(false);
  }
  function next() {
    setCurrentIndex((i) => (i + 1) % posts.length);
    setExpanded(false);
  }

  return (
    <div className="border-b border-[#c8dff7] text-sm" style={{ background: "#eaf3fc", color: "var(--color-arena-blue)" }}>
      {/* Kompakte Leiste */}
      <div className="site-shell flex items-center gap-2 py-1.5 min-h-0">
        <span className="text-base shrink-0">📰</span>

        <button
          type="button"
          className="flex-1 text-left font-medium truncate hover:underline text-[0.85rem] leading-snug"
          onClick={() => setExpanded((v) => !v)}
        >
          {post.title}
        </button>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {posts.length > 1 && (
            <>
              <button type="button" onClick={prev}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#c8dff7] text-arena-blue font-bold text-xs leading-none">
                ‹
              </button>
              <span className="text-xs text-gray-500 tabular-nums">{currentIndex + 1}/{posts.length}</span>
              <button type="button" onClick={next}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#c8dff7] text-arena-blue font-bold text-xs leading-none">
                ›
              </button>
            </>
          )}
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="ml-1 px-2 py-0.5 rounded border border-[#9ac4e8] text-xs hover:bg-[#c8dff7] transition-colors whitespace-nowrap">
            {expanded ? "Schließen" : "Lesen"}
          </button>
          <button type="button" onClick={() => setDismissed(true)}
            className="ml-1 w-5 h-5 flex items-center justify-center rounded hover:bg-[#c8dff7] text-gray-400 hover:text-gray-600 text-base leading-none font-bold">
            ×
          </button>
        </div>
      </div>

      {/* Ausgeklappter Vollinhalt */}
      {expanded && (
        <div className="border-t border-[#c8dff7] bg-white">
          <div className="site-shell py-5">
            <h2 className="text-lg font-bold mb-1 text-arena-blue">{post.title}</h2>
            <p className="text-xs text-gray-400 mb-4">
              {new Date(post.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </p>

            {post.layout === "text-only" && (
              <div
                className="ProseMirror text-[0.93rem] leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{ __html: post.htmlContent }}
              />
            )}

            {post.layout === "image-left" && (
              <div className="flex gap-5 items-start flex-wrap sm:flex-nowrap">
                <div style={{ flex: `0 0 ${post.imageRatio}%`, maxWidth: `${post.imageRatio}%` }} className="min-w-0">
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg object-cover" />
                  )}
                </div>
                <div
                  className="flex-1 min-w-0 ProseMirror text-[0.93rem] leading-relaxed text-gray-700"
                  dangerouslySetInnerHTML={{ __html: post.htmlContent }}
                />
              </div>
            )}

            {post.layout === "image-right" && (
              <div className="flex gap-5 items-start flex-wrap sm:flex-nowrap">
                <div
                  className="flex-1 min-w-0 ProseMirror text-[0.93rem] leading-relaxed text-gray-700"
                  dangerouslySetInnerHTML={{ __html: post.htmlContent }}
                />
                <div style={{ flex: `0 0 ${post.imageRatio}%`, maxWidth: `${post.imageRatio}%` }} className="min-w-0">
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg object-cover" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
