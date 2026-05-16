"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

type Gewinnspiel = {
  _id: string;
  buchTitel: string;
  autorName: string;
  autorUsername: string;
  coverImageUrl?: string;
  format: string;
  beschreibung?: string;
  anmeldungVon: string;
  anmeldungBis: string;
  ziehungAm: string;
  status: string;
  gewinnerName?: string;
  verlostAm?: string;
};

const STATUS_LABEL: Record<string, string> = {
  anmeldung: "Anmeldung läuft",
  verlost: "Gewinner gezogen",
  versendet: "Versendet",
  archiv: "Beendet",
};

const FORMAT_LABEL: Record<string, string> = {
  ebook: "E-Book",
  print: "Print",
  both: "E-Book & Print",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function GewinnspielUebersichtPage() {
  const [aktive, setAktive] = useState<Gewinnspiel[]>([]);
  const [archiv, setArchiv] = useState<Gewinnspiel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"aktiv" | "archiv">("aktiv");
  const [account, setAccount] = useState<ReturnType<typeof getStoredAccount>>(null);

  useEffect(() => {
    setAccount(getStoredAccount());
    const sync = () => setAccount(getStoredAccount());
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/gewinnspiele/list?status=aktiv").then((r) => r.json()),
      fetch("/api/gewinnspiele/list?status=archiv").then((r) => r.json()),
    ]).then(([a, b]) => {
      setAktive(a as Gewinnspiel[]);
      setArchiv(b as Gewinnspiel[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const displayed = tab === "aktiv" ? aktive : archiv;

  return (
    <main className="site-shell py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-arena-blue">
            Gewinnspiele
          </h1>
          <p className="text-sm opacity-70 mt-1">
            Bücher gewinnen – direkt von den Autoren der BuchArena-Community
          </p>
        </div>
        <Link
          href="/gewinnspiel/autor"
          className="px-5 py-2.5 rounded-lg font-semibold text-sm"
          style={{ background: "var(--color-arena-blue)", color: "white" }}
        >
          + Buch verlosen (Autor)
        </Link>
      </div>

      {/* Hinweis-Banner */}
      <div className="mb-6 rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-arena-border)" }}>
        <div className="px-4 py-3 text-sm" style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
          <strong>Hinweis:</strong> Für die Durchführung der Gewinnspiele, Verlosungen und den Versand der Gewinne sind ausschließlich die jeweiligen Autoren verantwortlich. BuchArena übernimmt keine Haftung.
        </div>
        <div className="px-4 py-3 text-sm bg-blue-50 text-blue-900">
          <strong>Teilnahme:</strong> Um an einem Gewinnspiel teilzunehmen, benötigst du ein Profil auf BuchArena – z.&nbsp;B. als <Link href="/testleser" className="underline font-medium">Testleser</Link>, <Link href="/fuer-autoren" className="underline font-medium">Autor</Link>, <Link href="/sprecher" className="underline font-medium">Sprecher</Link>, <Link href="/blogger" className="underline font-medium">Blogger</Link>, <Link href="/lektoren" className="underline font-medium">Lektor</Link> oder <Link href="/verlage" className="underline font-medium">Verlag</Link>.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "var(--color-arena-border)" }}>
        <button
          onClick={() => setTab("aktiv")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "aktiv" ? "border-[var(--color-arena-blue)] text-[var(--color-arena-blue)]" : "border-transparent opacity-60"}`}
        >
          Aktive Gewinnspiele {aktive.length > 0 && <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">{aktive.length}</span>}
        </button>
        <button
          onClick={() => setTab("archiv")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "archiv" ? "border-[var(--color-arena-blue)] text-[var(--color-arena-blue)]" : "border-transparent opacity-60"}`}
        >
          Archiv
        </button>
      </div>

      {loading ? (
        <p className="text-sm opacity-60">Lade Gewinnspiele…</p>
      ) : displayed.length === 0 ? (
        <p className="text-sm opacity-60">
          {tab === "aktiv" ? "Aktuell laufen keine Gewinnspiele." : "Noch keine archivierten Gewinnspiele."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {displayed.map((g) => (
            <Link
              key={g._id}
              href={`/gewinnspiel/${g._id}`}
              className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-row group"
              style={{ borderColor: "var(--color-arena-border)" }}
            >
              {/* Cover – hochkant */}
              <div className="relative shrink-0 w-24 sm:w-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                {g.coverImageUrl ? (
                  <img src={g.coverImageUrl} alt={g.buchTitel} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" style={{ aspectRatio: "2/3", objectPosition: "center" }} />
                ) : (
                  <span className="text-4xl">📚</span>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base leading-snug line-clamp-2">{g.buchTitel}</h3>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    g.status === "anmeldung" ? "bg-green-500 text-white" :
                    g.status === "verlost" ? "bg-yellow-400 text-[var(--color-arena-blue)]" :
                    "bg-gray-400 text-white"
                  }`}>
                    {STATUS_LABEL[g.status]}
                  </span>
                </div>
                <p className="text-sm opacity-60 mb-2">von {g.autorName}</p>

                {g.beschreibung && (
                  <p className="text-sm opacity-70 mb-3 line-clamp-2">{g.beschreibung}</p>
                )}

                <div className="mt-auto text-xs opacity-60 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Format: {FORMAT_LABEL[g.format]}</span>
                  {g.status === "anmeldung" && (
                    <span>Anmeldung bis: <strong>{fmtDate(g.anmeldungBis)}</strong></span>
                  )}
                  {g.status !== "anmeldung" && g.gewinnerName && (
                    <span className="text-green-700 font-medium">🏆 {g.gewinnerName}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
