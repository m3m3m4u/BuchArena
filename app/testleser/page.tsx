"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseGenres } from "@/app/components/genre-picker";

type DiscoverTestleser = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  genres: string[];
  verfuegbar: boolean;
};

export default function TestleserPage() {
  const [testleser, setTestleser] = useState<DiscoverTestleser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterGenre, setFilterGenre] = useState("");

  useEffect(() => {
    async function loadTestleser() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/testleser/discover", { method: "GET" });
        const data = (await res.json()) as { testleser?: DiscoverTestleser[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Testleser konnten nicht geladen werden.");
        setTestleser(data.testleser ?? []);
      } catch {
        setMessage("Testleser konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadTestleser();
  }, []);

  const allGenres = Array.from(
    new Set(testleser.flatMap((t) => t.genres))
  ).sort((a, b) => a.localeCompare(b, "de"));

  const filtered = filterGenre
    ? testleser.filter((t) => t.genres.includes(filterGenre))
    : testleser;

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1>Testleser entdecken</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du Testleser und ihre bevorzugten Genres.
        </p>

        {allGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer border min-h-[44px] sm:min-h-0 ${!filterGenre ? "bg-arena-blue text-white border-arena-blue" : "bg-white text-arena-text border-arena-border"}`}
              onClick={() => setFilterGenre("")}
            >
              Alle
            </button>
            {allGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer border min-h-[44px] sm:min-h-0 ${filterGenre === genre ? "bg-arena-blue text-white border-arena-blue" : "bg-white text-arena-text border-arena-border"}`}
                onClick={() => setFilterGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Testleser ...</p>
        ) : filtered.length === 0 ? (
          <p>Noch keine Testleser vorhanden.</p>
        ) : (
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {filtered.map((tl) => (
              <Link
                key={tl.username}
                href={`/testleser/${encodeURIComponent(tl.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={tl.profileImageUrl ? {
                        backgroundImage: `url(${tl.profileImageUrl})`,
                        backgroundPosition: `${tl.profileImageCrop?.x ?? 50}% ${tl.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(tl.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!tl.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-[1.05rem]">
                        {tl.displayName}
                        {tl.verfuegbar && (
                          <span className="ml-2 inline-block rounded-full bg-green-100 text-green-700 text-[11px] font-medium px-2.5 py-0.5 align-middle">
                            Verfügbar
                          </span>
                        )}
                      </h2>
                      {tl.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tl.genres.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="inline-block rounded-full bg-arena-blue/10 text-arena-blue text-[11px] font-medium px-2.5 py-1"
                            >
                              {g}
                            </span>
                          ))}
                          {tl.genres.length > 4 && (
                            <span className="text-[11px] text-arena-muted">
                              +{tl.genres.length - 4}
                            </span>
                          )}
                        </div>
                      )}
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
