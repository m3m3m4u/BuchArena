"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function PodcastFolgePage() {
  const params = useParams();
  const id = params?.id as string;
  const [folge, setFolge] = useState<Folge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/podcast/folgen/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d: { folge?: Folge } | null) => {
        if (d?.folge) setFolge(d.folge);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // View-Tracking beim ersten Laden
  useEffect(() => {
    if (!folge) return;
    fetch(`/api/podcast/folgen/${folge._id}/view`, { method: "POST" }).catch(() => {});
  }, [folge]);

  const ytId = folge ? extractYoutubeId(folge.youtubeUrl) : null;

  return (
    <main className="top-centered-main">
      <section className="card gap-5">
        <Link href="/podcast" className="text-sm text-arena-blue hover:underline">
          ← Zurück zur Übersicht
        </Link>

        {loading && <p className="text-arena-muted text-sm">Wird geladen …</p>}

        {notFound && (
          <p className="text-arena-muted text-sm">Diese Folge wurde nicht gefunden.</p>
        )}

        {folge && (
          <>
            <h1 className="text-2xl font-bold text-arena-blue">{folge.title}</h1>
            <p className="text-xs text-gray-400">
              {formatDate(folge.createdAt)} · {folge.views} Aufruf{folge.views !== 1 ? "e" : ""}
            </p>

            {folge.text && (
              <p className="text-[0.93rem] text-gray-700 leading-relaxed">{folge.text}</p>
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
          </>
        )}
      </section>
    </main>
  );
}
