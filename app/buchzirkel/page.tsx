"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";

type Zirkel = {
  _id: string;
  typ: "testleser" | "betaleser";
  titel: string;
  beschreibung: string;
  coverImageUrl?: string;
  genre: string;
  status: string;
  veranstalterUsername: string;
  bewerbungBis: string;
  maxTeilnehmer: number;
  createdAt: string;
  isBeworben?: boolean;
  isTeilnehmer?: boolean;
};

export default function BuchzirkelPage() {
  const [zirkel, setZirkel] = useState<Zirkel[]>([]);
  const [loading, setLoading] = useState(true);
  const [typFilter, setTypFilter] = useState<"" | "testleser" | "betaleser">("");
  const [account, setAccount] = useState<ReturnType<typeof getStoredAccount>>(null);

  useEffect(() => {
    setAccount(getStoredAccount());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ status: "aktiv" });
    if (typFilter) params.set("typ", typFilter);
    fetch(`/api/buchzirkel/list?${params}`)
      .then((r) => r.json())
      .then((d) => setZirkel(d.zirkel ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typFilter]);

  return (
    <main className="top-centered-main">
      {/* Header */}
      <section className="card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold m-0 flex items-center gap-2">📚 Buchzirkel</h1>
            <p className="text-arena-muted text-sm m-0 mt-1">
              Testleser- und Betaleser-Runden – direkt von Autoren und Verlagen
            </p>
          </div>
          {account && (
            <Link href="/buchzirkel/erstellen" className="btn btn-primary">
              + Buchzirkel erstellen
            </Link>
          )}
        </div>
      </section>

      {/* Filter */}
      <section className="card mt-3">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTypFilter("")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typFilter === "" ? "bg-arena-blue text-white border-arena-blue" : "border-arena-border text-arena-text hover:border-arena-blue"
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setTypFilter("testleser")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typFilter === "testleser" ? "bg-arena-blue text-white border-arena-blue" : "border-arena-border text-arena-text hover:border-arena-blue"
            }`}
          >
            📖 Testleser-Zirkel
          </button>
          <button
            type="button"
            onClick={() => setTypFilter("betaleser")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typFilter === "betaleser" ? "bg-arena-blue text-white border-arena-blue" : "border-arena-border text-arena-text hover:border-arena-blue"
            }`}
          >
            🔒 Betaleser-Zirkel
          </button>
        </div>
      </section>

      {/* Erklär-Karten */}
      <section className="w-full grid grid-cols-2 gap-3 mt-3 max-sm:grid-cols-1">
        <div className="rounded-xl border-2 border-arena-blue-light bg-blue-50 p-4">
          <p className="font-semibold m-0 text-arena-blue">📖 Testleser-Zirkel</p>
          <p className="text-sm text-arena-muted m-0 mt-1">
            Rezensionsexemplare für bereits veröffentlichte Bücher – Feedback und Bewertungen auf Amazon, Goodreads & Co.
          </p>
        </div>
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <p className="font-semibold m-0 text-red-800">🔒 Betaleser-Zirkel</p>
          <p className="text-sm text-red-700 m-0 mt-1">
            Unveröffentlichte Manuskripte – streng vertraulich. Alle Teilnehmer unterschreiben eine Verschwiegenheitserklärung.
          </p>
        </div>
      </section>

      {/* Liste */}
      {loading ? (
        <p className="text-arena-muted text-center py-8">Wird geladen…</p>
      ) : zirkel.length === 0 ? (
        <section className="card mt-3 text-center py-8">
          <p className="text-arena-muted m-0">Aktuell keine offenen Buchzirkel.</p>
          {account && (
            <p className="text-sm m-0 mt-2">
              <Link href="/buchzirkel/erstellen" className="text-arena-blue hover:underline">
                Erstelle den ersten →
              </Link>
            </p>
          )}
        </section>
      ) : (
        <section className="w-full grid grid-cols-2 gap-4 mt-3 max-sm:grid-cols-1">
          {zirkel.map((z) => (
            <ZirkelKarte key={z._id} zirkel={z} />
          ))}
        </section>
      )}
    </main>
  );
}

function ZirkelKarte({ zirkel }: { zirkel: Zirkel }) {
  const isBeta = zirkel.typ === "betaleser";
  const frist = new Date(zirkel.bewerbungBis);
  const expired = frist < new Date();

  return (
    <Link
      href={`/buchzirkel/${zirkel._id}`}
      className="no-underline text-inherit flex gap-4 rounded-xl border border-arena-border bg-white p-4 hover:border-arena-blue transition-colors"
    >
      {/* Cover */}
      <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-arena-border-light flex items-center justify-center">
        {zirkel.coverImageUrl ? (
          <img src={zirkel.coverImageUrl} alt={zirkel.titel} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">📚</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBeta ? "bg-red-100 text-red-700" : "bg-blue-100 text-arena-blue"}`}>
            {isBeta ? "🔒 Betaleser" : "📖 Testleser"}
          </span>
          {zirkel.genre && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-arena-muted">
              {zirkel.genre}
            </span>
          )}
          {zirkel.isTeilnehmer && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Teilnehmer</span>
          )}
          {!zirkel.isTeilnehmer && zirkel.isBeworben && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⏳ Beworben</span>
          )}
        </div>

        <h2 className="text-base font-bold m-0 mt-1 truncate">{zirkel.titel}</h2>
        <p className="text-xs text-arena-muted m-0">von {zirkel.veranstalterUsername}</p>
        <p className="text-sm text-arena-muted m-0 mt-1 line-clamp-2">{zirkel.beschreibung}</p>

        <div className="flex items-center gap-3 mt-2 text-xs text-arena-muted">
          <span>👥 max. {zirkel.maxTeilnehmer}</span>
          {expired ? (
            <span className="text-red-600 font-medium">Bewerbung beendet</span>
          ) : (
            <span>📅 Frist: {frist.toLocaleDateString("de-AT")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
