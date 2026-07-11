"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  PlusIcon,
  GiftIcon 
} from "@heroicons/react/24/outline";

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
  const [pageAktiv, setPageAktiv] = useState(0);
  const [pageArchiv, setPageArchiv] = useState(0);
  const [account, setAccount] = useState<ReturnType<typeof getStoredAccount>>(null);

  const PAGE_SIZE = 8;

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
  const page = tab === "aktiv" ? pageAktiv : pageArchiv;
  const setPage = tab === "aktiv" ? setPageAktiv : setPageArchiv;
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems = displayed.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return (
    <main className="top-centered-main">
      <div className="w-full flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-arena-blue flex items-center gap-2">
            <GiftIcon className="h-6 w-6 text-arena-blue" />
            Gewinnspiele
          </h1>
          <p className="text-sm text-arena-muted mt-1">
            Bücher gewinnen – direkt von den Autoren der BuchArena-Community
          </p>
        </div>
        <Link
          href="/gewinnspiel/autor"
          className="btn btn-primary"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Buch verlosen (Autor)
        </Link>
      </div>

      {/* Hinweis-Banner */}
      <div className="mb-6 rounded-xl overflow-hidden border border-arena-border-light shadow-xs bg-white w-full max-w-[1100px]">
        <div className="px-4 py-3 text-sm flex items-center gap-2 font-semibold bg-linear-to-r from-[var(--color-arena-yellow)] to-[#ca9a09] text-[var(--color-arena-blue)]">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span><strong>Hinweis:</strong> Für die Durchführung der Gewinnspiele, Verlosungen und den Versand der Gewinne sind ausschließlich die jeweiligen Autoren verantwortlich. BuchArena übernimmt keine Haftung.</span>
        </div>
        <div className="px-4 py-3 text-sm bg-blue-50/50 text-blue-900 flex items-start gap-2 leading-relaxed border-t border-arena-border-light">
          <InformationCircleIcon className="h-5 w-5 flex-shrink-0 text-blue-700 mt-0.5" />
          <span><strong>Teilnahme:</strong> Um an einem Gewinnspiel teilzunehmen, benötigst du ein Profil auf BuchArena – z.&nbsp;B. als <Link href="/testleser" className="underline font-semibold hover:text-blue-700">Testleser</Link>, <Link href="/fuer-autoren" className="underline font-semibold hover:text-blue-700">Autor</Link>, <Link href="/sprecher" className="underline font-semibold hover:text-blue-700">Sprecher</Link>, <Link href="/blogger" className="underline font-semibold hover:text-blue-700">Blogger</Link>, <Link href="/lektoren" className="underline font-semibold hover:text-blue-700">Lektor</Link> oder <Link href="/verlage" className="underline font-semibold hover:text-blue-700">Verlag</Link>.</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 p-1 bg-arena-bg rounded-xl grid grid-cols-2 gap-1 border border-arena-border-light w-full max-w-[440px] self-start">
        <button
          onClick={() => setTab("aktiv")}
          className={`py-2 px-3 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${tab === "aktiv" ? "bg-white text-arena-blue font-bold shadow-xs border border-arena-border-light/40" : "text-arena-muted hover:text-arena-blue font-medium bg-transparent border border-transparent"}`}
        >
          Aktive Gewinnspiele
          {aktive.length > 0 && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded-full font-semibold">
              {aktive.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("archiv")}
          className={`py-2 px-3 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${tab === "archiv" ? "bg-white text-arena-blue font-bold shadow-xs border border-arena-border-light/40" : "text-arena-muted hover:text-arena-blue font-medium bg-transparent border border-transparent"}`}
        >
          Archiv
          {archiv.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded-full font-semibold">
              {archiv.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-arena-muted w-full text-left">Lade Gewinnspiele…</p>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-arena-muted w-full text-left">
          {tab === "aktiv" ? "Aktuell laufen keine Gewinnspiele." : "Noch keine archivierten Gewinnspiele."}
        </p>
      ) : (
        <div className="w-full max-w-[1100px] flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {pageItems.map((g) => (
              <Link
                key={g._id}
                href={`/gewinnspiel/${g._id}`}
                className="border border-arena-border-light rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 hover:border-arena-blue bg-white transition-all duration-200 flex flex-row group no-underline text-inherit"
              >
                {/* Cover – hochkant */}
                <div className="relative shrink-0 w-24 sm:w-32 bg-arena-bg flex items-center justify-center overflow-hidden border-r border-arena-border-light">
                  {g.coverImageUrl ? (
                    <img src={g.coverImageUrl} alt={g.buchTitel} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" style={{ aspectRatio: "2/3", objectPosition: "center" }} />
                  ) : (
                    <span className="text-4xl text-arena-muted">-</span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-base leading-snug line-clamp-2 text-arena-blue">{g.buchTitel}</h3>
                    <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                      g.status === "anmeldung" ? "bg-green-50 text-green-700 border-green-200" :
                      g.status === "verlost" ? "bg-yellow-50 text-yellow-800 border-yellow-200" :
                      "bg-slate-50 text-slate-700 border border-slate-200"
                    }`}>
                      {STATUS_LABEL[g.status]}
                    </span>
                  </div>
                  <p className="text-sm text-arena-muted mb-2">von {g.autorName}</p>

                  {g.beschreibung && (
                    <p className="text-sm text-arena-text mb-3 line-clamp-2 leading-relaxed">{g.beschreibung}</p>
                  )}

                  <div className="mt-auto text-xs text-arena-muted flex flex-wrap gap-x-4 gap-y-1">
                    <span>Format: <strong>{FORMAT_LABEL[g.format]}</strong></span>
                    {g.status === "anmeldung" && (
                      <span>Anmeldung bis: <strong>{fmtDate(g.anmeldungBis)}</strong></span>
                    )}
                    {g.status !== "anmeldung" && g.gewinnerName && (
                      <span className="text-green-700 font-semibold">Gewinner: {g.gewinnerName}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page === 0}
                onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="btn btn-sm text-sm"
              >
                ← Zurück
              </button>
              <span className="text-sm text-arena-muted">
                Seite {page + 1} von {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="btn btn-sm text-sm"
              >
                Weiter →
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
