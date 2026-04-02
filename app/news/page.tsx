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

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news?all=true")
      .then((r) => r.json())
      .then((d: { posts?: NewsPost[] }) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="top-centered-main">
      <section className="card gap-[1.5rem]">
        <h1>News</h1>

        {loading && <p className="text-arena-muted text-sm">Wird geladen …</p>}

        {!loading && posts.length === 0 && (
          <p className="text-arena-muted text-sm">Aktuell gibt es keine News.</p>
        )}

        {posts.map((post, i) => (
          <article key={post._id} className={`grid gap-3 ${i > 0 ? "pt-[1.5rem] border-t border-arena-border" : ""}`}>
            <div>
              <h2 className="text-[1.1rem] font-bold text-arena-blue">{post.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(post.createdAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

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
          </article>
        ))}
      </section>
    </main>
  );
}
