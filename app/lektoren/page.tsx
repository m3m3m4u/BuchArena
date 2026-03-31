"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type DiscoverLektor = {
  username: string;
  displayName: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  kapazitaeten: number[];
};

export default function LektorenPage() {
  const [lektoren, setLektoren] = useState<DiscoverLektor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLektoren() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/lektoren/discover", { method: "GET" });
        const data = (await res.json()) as { lektoren?: DiscoverLektor[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Lektoren konnten nicht geladen werden.");
        setLektoren(data.lektoren ?? []);
      } catch {
        setMessage("Lektoren konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadLektoren();
  }, []);

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1>Lektoren entdecken</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du Lektoren und ihre Verfügbarkeit.
        </p>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Lektoren ...</p>
        ) : lektoren.length === 0 ? (
          <p>Noch keine Lektoren vorhanden.</p>
        ) : (
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            {lektoren.map((lk) => (
              <Link
                key={lk.username}
                href={`/lektoren/${encodeURIComponent(lk.username)}`}
                className="block rounded-lg no-underline text-inherit transition-shadow hover:shadow-md h-full"
              >
                <article className="grid gap-2.5 rounded-lg border border-arena-border p-3 hover:border-gray-500 h-full">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={lk.profileImageUrl ? {
                        backgroundImage: `url(${lk.profileImageUrl})`,
                        backgroundPosition: `${lk.profileImageCrop?.x ?? 50}% ${lk.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(lk.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!lk.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-[1.05rem]">{lk.displayName}</h2>
                      {lk.kapazitaeten.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lk.kapazitaeten.map((m) => (
                            <span
                              key={m}
                              className="inline-block rounded-full bg-green-100 text-green-700 text-[11px] font-medium px-2 py-0.5"
                            >
                              {monthLabels[m - 1]}
                            </span>
                          ))}
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
