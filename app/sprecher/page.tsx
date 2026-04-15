"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedShuffle<T extends { lesezeichenTotal: number }>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const maxLz = Math.max(1, ...items.map((i) => i.lesezeichenTotal));
  const scored = items.map((i) => ({
    item: i,
    score: 0.5 * rng() + 0.5 * Math.log1p(i.lesezeichenTotal) / Math.log1p(maxLz),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

type DiscoverSpeaker = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  ort: string;
  motto: string;
  sprechprobenCount: number;
  lesezeichenTotal: number;
};

export default function SprecherPage() {
  const [speakers, setSpeakers] = useState<DiscoverSpeaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  useEffect(() => {
    async function loadSpeakers() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/speakers/discover", { method: "GET" });
        const data = (await res.json()) as { speakers?: DiscoverSpeaker[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Sprecher konnten nicht geladen werden.");
        setSpeakers(data.speakers ?? []);
      } catch {
        setMessage("Sprecher konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadSpeakers();
  }, []);

  const sortedSpeakers = useMemo(() => weightedShuffle(speakers, seed), [speakers, seed]);

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1>Hörbuchsprecher entdecken</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du Hörbuchsprecher und ihre Sprechproben.
        </p>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Sprecher ...</p>
        ) : speakers.length === 0 ? (
          <p>Noch keine Sprecher vorhanden.</p>
        ) : (
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {sortedSpeakers.map((speaker) => (
              <Link
                key={speaker.username}
                href={`/sprecher/${encodeURIComponent(speaker.profileSlug || speaker.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={speaker.profileImageUrl ? {
                        backgroundImage: `url(${speaker.profileImageUrl}${speaker.profileImageUrl.includes('?') ? '&' : '?'}w=200)`,
                        backgroundPosition: `${speaker.profileImageCrop?.x ?? 50}% ${speaker.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(speaker.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!speaker.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-[1.05rem]">{speaker.displayName}</h2>
                      {speaker.ort && (
                        <p className="mt-0.5 text-sm text-arena-muted">{speaker.ort}</p>
                      )}
                      {speaker.motto && (
                        <p className="mt-0.5 text-sm italic">„{speaker.motto}"</p>
                      )}
                      <p className="mt-1 text-xs text-arena-muted">
                        {speaker.sprechprobenCount}{" "}
                        {speaker.sprechprobenCount === 1 ? "Sprechprobe" : "Sprechproben"}
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Link href="/" className="text-arena-link text-sm no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
