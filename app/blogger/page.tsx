"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseGenres } from "@/app/components/genre-picker";

type DiscoverBlogger = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  genres: string[];
  lieblingsbuch: string;
  beschreibung: string;
};

export default function BloggerPage() {
  const [bloggers, setBloggers] = useState<DiscoverBlogger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterGenre, setFilterGenre] = useState("");

  useEffect(() => {
    async function loadBloggers() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/bloggers/discover", { method: "GET" });
        const data = (await res.json()) as { bloggers?: DiscoverBlogger[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Blogger konnten nicht geladen werden.");
        setBloggers(data.bloggers ?? []);
      } catch {
        setMessage("Blogger konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadBloggers();
  }, []);

  // Alle Genres aus den Bloggern sammeln
  const allGenres = Array.from(
    new Set(bloggers.flatMap((b) => b.genres))
  ).sort((a, b) => a.localeCompare(b, "de"));

  const filtered = filterGenre
    ? bloggers.filter((b) => b.genres.includes(filterGenre))
    : bloggers;

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1>Buchblogger entdecken</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du Buchblogger und ihre Lieblingsgenres.
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
          <p>Lade Blogger ...</p>
        ) : filtered.length === 0 ? (
          <p>Noch keine Blogger vorhanden.</p>
        ) : (
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {filtered.map((blogger) => (
              <Link
                key={blogger.username}
                href={`/blogger/${encodeURIComponent(blogger.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={blogger.profileImageUrl ? {
                        backgroundImage: `url(${blogger.profileImageUrl})`,
                        backgroundPosition: `${blogger.profileImageCrop?.x ?? 50}% ${blogger.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(blogger.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!blogger.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-[1.05rem]">{blogger.displayName}</h2>
                      {blogger.motto && (
                        <p className="mt-0.5 text-sm italic">„{blogger.motto}"</p>
                      )}
                      {blogger.lieblingsbuch && (
                        <p className="mt-0.5 text-xs text-arena-muted">
                          ❤️ {blogger.lieblingsbuch}
                        </p>
                      )}
                      {blogger.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {blogger.genres.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="inline-block rounded-full bg-arena-blue/10 text-arena-blue text-[11px] font-medium px-2.5 py-1"
                            >
                              {g}
                            </span>
                          ))}
                          {blogger.genres.length > 4 && (
                            <span className="text-[11px] text-arena-muted">
                              +{blogger.genres.length - 4}
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
