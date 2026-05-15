"use client";

import Link from "next/link";
import { GENRE_TOPICS } from "@/lib/discussions";

export default function GenreTreffpunktPage() {
  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl">Genre-Treffpunkt</h1>
          <Link href="/diskussionen" className="btn text-sm sm:text-base">← Treffpunkt</Link>
        </div>

        <p className="text-sm text-arena-muted -mt-1">
          Wähle ein Genre und diskutiere mit anderen Mitgliedern über Bücher, Autoren und Neuerscheinungen in diesem Bereich.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GENRE_TOPICS.map((genre) => (
            <Link
              key={genre}
              href={`/diskussionen/genre/${encodeURIComponent(genre)}`}
              className="rounded-xl border border-arena-border hover:border-arena-blue hover:bg-arena-blue/5 transition-colors p-4 flex flex-col gap-1 no-underline text-inherit group"
            >
              <span className="font-semibold text-sm sm:text-base group-hover:text-arena-blue transition-colors">{genre}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
