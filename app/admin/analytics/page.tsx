"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";

type DayData = { date: string; count: number; unique: number; loggedIn: number; anonymous: number };
type PageData = { page: string; count: number };
type ReferrerData = { referrer: string; count: number };

type AnalyticsData = {
  visitorsPerDay: DayData[];
  topPages: PageData[];
  topReferrers: ReferrerData[];
  totalViews: number;
  todayViews: number;
  todayUniqueVisitors: number;
  todayLoggedInUsers: number;
  todayAnonymousUsers: number;
  days: number;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function tryExtractHost(url: string): string {
  try {
    const u = new URL(url);
    // Doppelte Hostnamen im Pfad erkennen und bereinigen
    const decodedPath = decodeURIComponent(u.pathname);
    const pathWithoutSlash = decodedPath.replace(/^\//, "");
    if (pathWithoutSlash.startsWith(u.hostname)) {
      const realPath = pathWithoutSlash.slice(u.hostname.length);
      return u.hostname + (realPath.startsWith("/") ? realPath : "/" + realPath);
    }
    return u.hostname;
  } catch {
    return url;
  }
}

export default function AnalyticsPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"chart" | "pages" | "referrer">("chart");

  useEffect(() => {
    function syncAccount() {
      setAccount(getStoredAccount());
    }
    syncAccount();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
    window.addEventListener("storage", syncAccount);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
      window.removeEventListener("storage", syncAccount);
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (account && (account.role === "ADMIN" || account.role === "SUPERADMIN")) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [account, loadData]);

  if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) {
    return (
      <main className="centered-main font-sans">
        <div className="card font-sans max-w-md p-8 text-center bg-white">
          <h1 className="font-sans text-2xl font-bold text-arena-danger mb-3">Zugriff verweigert</h1>
          <p className="font-sans text-sm text-arena-muted mb-6">Diese Seite ist nur für Administratoren.</p>
          <Link href="/" className="btn btn-primary font-sans w-full">
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const maxCount =
    data?.visitorsPerDay.reduce((max, d) => Math.max(max, d.count), 0) ?? 0;

  return (
    <main className="centered-main font-sans">
      <div className="card font-sans">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 font-sans">
          <h1 className="font-sans text-2xl font-bold text-arena-blue tracking-tight m-0">📊 Analyse-Dashboard</h1>
          <Link href="/admin" className="btn btn-sm font-sans">
            ← Admin
          </Link>
        </div>

        {/* Zeitraum-Auswahl */}
        <div className="segmented-control font-sans max-w-sm mb-4">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              className={`segmented-control-btn font-sans ${d === days ? "active" : ""}`}
              onClick={() => setDays(d)}
            >
              {d} Tage
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="font-sans text-sm text-arena-muted">Lade Daten…</p>
        ) : data ? (
          <>
            {/* Übersichtskarten */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-sans mb-4">
              {[
                { value: data.todayViews, label: "Aufrufe heute" },
                { value: data.todayUniqueVisitors, label: "Nutzer heute" },
                { value: data.todayLoggedInUsers, label: "Eingeloggt" },
                { value: data.todayAnonymousUsers, label: "Anonym" },
                { value: data.totalViews, label: `Gesamt (${data.days}d)` },
                { value: data.visitorsPerDay.length, label: "Aktive Tage" },
              ].map((card) => (
                <div key={card.label} className="p-4 rounded-xl border border-arena-border-light text-center bg-white shadow-sm font-sans transition-all hover:shadow-md">
                  <div className="font-sans text-2xl font-bold text-arena-blue">{card.value}</div>
                  <div className="font-sans text-xs text-arena-muted font-bold mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="segmented-control font-sans w-full max-w-md mb-4">
              {[
                { key: "chart" as const, label: "📈 Verlauf" },
                { key: "pages" as const, label: "📄 Top-Seiten" },
                { key: "referrer" as const, label: "🔗 Herkunft" },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`segmented-control-btn font-sans ${tab === t.key ? "active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Verlauf */}
            {tab === "chart" && (
              <div className="font-sans">
                <div className="flex gap-4 text-xs text-arena-muted flex-wrap font-sans font-bold mb-3">
                  <span>Aufrufe · <span className="text-arena-blue">Eingeloggt</span> / <span className="opacity-70">Anonym</span></span>
                </div>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1 font-sans">
                  {data.visitorsPerDay.map((d) => (
                    <div key={d.date} className="grid grid-cols-[85px_1fr_auto] items-center gap-4 text-sm font-sans py-1.5 border-b border-arena-border-light">
                      <span className="text-arena-muted font-medium">{formatDate(d.date)}</span>
                      <div className="bg-arena-border-light rounded-full h-2.5 overflow-hidden w-full font-sans">
                        <div
                          style={{ width: maxCount ? `${(d.count / maxCount) * 100}%` : "0%" }}
                          className="bg-arena-yellow h-full rounded-full transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-right white-space-nowrap text-xs font-sans">
                        {d.count} · <span className="text-arena-blue">{d.loggedIn}</span>/<span className="opacity-60">{d.anonymous}</span>
                      </span>
                    </div>
                  ))}
                  {data.visitorsPerDay.length === 0 && (
                    <p className="font-sans text-sm text-arena-muted">Keine Daten im gewählten Zeitraum.</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Top-Seiten */}
            {tab === "pages" && (
              <div className="overflow-x-auto border border-arena-border-light rounded-lg font-sans">
                <table className="w-full text-left border-collapse font-sans text-sm">
                  <thead>
                    <tr className="border-b border-arena-border-light bg-arena-bg font-bold text-arena-blue font-sans">
                      <th className="py-2.5 px-4 font-sans">Seite</th>
                      <th className="py-2.5 px-4 text-right font-sans">Aufrufe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((p) => (
                      <tr key={p.page} className="border-b border-arena-border-light hover:bg-arena-bg-light transition-colors font-sans">
                        <td className="py-2.5 px-4 font-mono text-xs text-arena-blue break-all">{p.page}</td>
                        <td className="py-2.5 px-4 text-right font-bold font-sans">{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Referrer */}
            {tab === "referrer" && (
              <>
                {data.topReferrers.length === 0 ? (
                  <p className="font-sans text-sm text-arena-muted font-sans">Keine externen Referrer im gewählten Zeitraum.</p>
                ) : (
                  <div className="overflow-x-auto border border-arena-border-light rounded-lg font-sans">
                    <table className="w-full text-left border-collapse font-sans text-sm">
                      <thead>
                        <tr className="border-b border-arena-border-light bg-arena-bg font-bold text-arena-blue font-sans">
                          <th className="py-2.5 px-4 font-sans">Quelle</th>
                          <th className="py-2.5 px-4 text-right font-sans">Aufrufe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topReferrers.map((r) => (
                          <tr key={r.referrer} className="border-b border-arena-border-light hover:bg-arena-bg-light transition-colors font-sans">
                            <td className="py-2.5 px-4 font-medium text-arena-text break-all font-sans">{tryExtractHost(r.referrer)}</td>
                            <td className="py-2.5 px-4 text-right font-bold font-sans">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="font-sans text-sm text-arena-danger">Daten konnten nicht geladen werden.</p>
        )}
      </div>
    </main>
  );
}
