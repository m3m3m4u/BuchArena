"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type DiscoverVerlag = {
  username: string;
  displayName: string;
  profileSlug: string;
  profileImageUrl: string;
  profileImageCrop?: { x: number; y: number; zoom: number };
  motto: string;
  kapazitaeten: number[];
};

export default function VerlagePage() {
  const [verlage, setVerlage] = useState<DiscoverVerlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadVerlage() {
      setIsLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/verlage/discover", { method: "GET" });
        const data = (await res.json()) as { verlage?: DiscoverVerlag[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Verlage konnten nicht geladen werden.");
        setVerlage(data.verlage ?? []);
      } catch {
        setMessage("Verlage konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadVerlage();
  }, []);

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold m-0 text-arena-blue">Verlage entdecken</h1>
          <Link href="/wohnort-karte/verlage" className="btn">Suche nach Wohnort</Link>
        </div>
        <p className="text-arena-muted text-sm mt-1">
          Hier findest du Verlage und ihre Verfügbarkeit.
        </p>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Verlage ...</p>
        ) : verlage.length === 0 ? (
          <p>Noch keine Verlage vorhanden.</p>
        ) : (
          <div className="grid gap-3 min-[700px]:grid-cols-2 mt-4">
            {verlage.map((vl) => (
              <Link
                key={vl.username}
                href={`/verlage/${encodeURIComponent(vl.profileSlug || vl.username)}`}
                className="block no-underline text-inherit h-full"
              >
                <article className="member-card">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <div
                      className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border border-arena-border bg-arena-bg text-xs text-arena-muted"
                      style={vl.profileImageUrl ? {
                        backgroundImage: `url(${vl.profileImageUrl}${vl.profileImageUrl.includes('?') ? '&' : '?'}w=200)`,
                        backgroundPosition: `${vl.profileImageCrop?.x ?? 50}% ${vl.profileImageCrop?.y ?? 50}%`,
                        backgroundSize: `${(vl.profileImageCrop?.zoom ?? 1) * 100}%`,
                        backgroundRepeat: "no-repeat",
                      } : undefined}
                    >
                      {!vl.profileImageUrl && <span>Kein Bild</span>}
                    </div>
                    <div>
                      <h2 className="m-0 text-base font-bold text-arena-blue truncate">{vl.displayName}</h2>
                      {vl.motto && (
                        <p className="mt-1 text-sm italic text-arena-muted">„{vl.motto}“</p>
                      )}
                      {vl.kapazitaeten.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {vl.kapazitaeten.map((m) => (
                            <span
                              key={m}
                              className="inline-block rounded-full bg-green-50 text-green-700 text-[11px] font-medium px-2 py-0.5 border border-green-200"
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
