"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BlogPost = {
  _id: string;
  title: string;
  excerpt: string;
  authorUsername: string;
  authorDisplayName: string;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/blog?page=${page}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("Beiträge konnten nicht geladen werden."); return r.json(); })
      .then((d: { posts?: BlogPost[]; total?: number }) => {
        if (controller.signal.aborted) return;
        setPosts(d.posts ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Die Beiträge konnten nicht geladen werden."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, retry]);

  return (
    <main className="top-centered-main">
      <section className="card gap-[1.5rem]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Blog</h1>
          <Link
            href="/blog/einreichen"
            className="btn btn-primary btn-sm"
          >
            Blog einreichen
          </Link>
        </div>

        {loading && <p className="text-arena-muted text-sm">Wird geladen …</p>}

        {error && <div role="alert" className="card-info"><p>{error}</p><button type="button" className="btn btn-sm" onClick={() => { setError(""); setLoading(true); setRetry((value) => value + 1); }}>Erneut versuchen</button></div>}

        {!loading && !error && posts.length === 0 && (
          <p className="text-arena-muted text-sm">Noch keine Beiträge vorhanden.</p>
        )}

        {posts.map((post, i) => (
          <article
            key={post._id}
            className={`grid gap-1.5 ${i > 0 ? "pt-[1.5rem] border-t border-arena-border" : ""}`}
          >
            <Link
              href={`/blog/${post._id}`}
              className="text-[1.1rem] font-bold text-arena-blue hover:underline"
            >
              {post.title}
            </Link>
            <p className="text-xs text-gray-400">
              von{" "}
              <Link href={`/profil?user=${encodeURIComponent(post.authorUsername)}`} className="hover:underline">
                {post.authorDisplayName}
              </Link>
              {" "}· {formatDate(post.createdAt)}
            </p>
            {post.excerpt && (
              <p className="text-[0.93rem] text-gray-600 leading-relaxed">{post.excerpt}</p>
            )}
            <Link
              href={`/blog/${post._id}`}
              className="text-sm text-arena-blue hover:underline mt-1 w-fit"
            >
              Weiterlesen →
            </Link>
          </article>
        ))}

        {total > 10 && (
          <div className="flex gap-2 mt-2 justify-center">
            <button
              className="btn btn-sm"
              disabled={loading || page <= 1}
              onClick={() => { setError(""); setLoading(true); setPage((p) => p - 1); }}
            >
              ← Zurück
            </button>
            <span className="text-sm text-gray-500 self-center">
              Seite {page} von {Math.ceil(total / 10)}
            </span>
            <button
              className="btn btn-sm"
              disabled={loading || page >= Math.ceil(total / 10)}
              onClick={() => { setError(""); setLoading(true); setPage((p) => p + 1); }}
            >
              Vor →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
