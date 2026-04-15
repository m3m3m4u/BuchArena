"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type BlogPost = {
  _id: string;
  title: string;
  htmlContent: string;
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

export default function BlogDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/blog/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d: { post?: BlogPost } | null) => {
        if (d?.post) setPost(d.post);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="top-centered-main">
      <section className="card gap-4">
        <Link href="/blog" className="text-sm text-arena-blue hover:underline">
          ← Zurück zur Übersicht
        </Link>

        {loading && <p className="text-arena-muted text-sm">Wird geladen …</p>}

        {notFound && (
          <p className="text-arena-muted text-sm">Dieser Beitrag wurde nicht gefunden.</p>
        )}

        {post && (
          <>
            <h1 className="text-2xl font-bold text-arena-blue">{post.title}</h1>
            <p className="text-xs text-gray-400">
              von{" "}
              <Link href={`/profil?user=${encodeURIComponent(post.authorUsername)}`} className="hover:underline">
                {post.authorDisplayName}
              </Link>
              {" "}· {formatDate(post.createdAt)}
            </p>
            <div
              className="ProseMirror text-[0.93rem] leading-relaxed text-gray-700 mt-2"
              dangerouslySetInnerHTML={{ __html: post.htmlContent }}
            />
          </>
        )}
      </section>
    </main>
  );
}
