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
      <main className="centered-main">
        <div className="card" style={{ textAlign: "center" }}>
          <h1>Zugriff verweigert</h1>
          <p>Diese Seite ist nur für Administratoren.</p>
          <Link href="/" className="btn btn-primary">
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const maxCount =
    data?.visitorsPerDay.reduce((max, d) => Math.max(max, d.count), 0) ?? 0;

  return (
    <main className="centered-main">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.3rem" }}>📊 Analyse-Dashboard</h1>
          <Link href="/admin" className="btn btn-sm">
            ← Admin
          </Link>
        </div>

        {/* Zeitraum-Auswahl */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn btn-sm${d === days ? " btn-primary" : ""}`}
              onClick={() => setDays(d)}
            >
              {d} Tage
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color: "var(--color-arena-muted)" }}>Lade Daten…</p>
        ) : data ? (
          <>
            {/* Übersichtskarten */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.5rem",
              }}
            >
              {[
                { value: data.todayViews, label: "Aufrufe heute", bg: "var(--color-arena-blue)", color: "#fff" },
                { value: data.todayUniqueVisitors, label: "Nutzer heute", bg: "var(--color-arena-yellow)", color: "#333" },
                { value: data.todayLoggedInUsers, label: "Eingeloggt", bg: "var(--color-arena-blue-light)", color: "#fff" },
                { value: data.todayAnonymousUsers, label: "Anonym", bg: "var(--color-arena-blue-mid)", color: "#fff" },
                { value: data.totalViews, label: `Gesamt (${data.days}d)`, bg: "var(--color-arena-blue)", color: "#fff" },
                { value: data.visitorsPerDay.length, label: "Aktive Tage", bg: "var(--color-arena-blue-mid)", color: "#fff" },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: card.bg,
                    color: card.color,
                    borderRadius: 8,
                    padding: "0.6rem 0.4rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              {[
                { key: "chart" as const, label: "📈 Verlauf" },
                { key: "pages" as const, label: "📄 Top-Seiten" },
                { key: "referrer" as const, label: "🔗 Herkunft" },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`btn btn-sm${tab === t.key ? " btn-primary" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Verlauf */}
            {tab === "chart" && (
              <>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem", color: "var(--color-arena-muted)", flexWrap: "wrap" }}>
                <span>Aufrufe · <span style={{ color: "var(--color-arena-blue)", fontWeight: 600 }}>Eingeloggt</span> / <span style={{ opacity: 0.6 }}>Anonym</span></span>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "3px",
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {data.visitorsPerDay.map((d) => (
                  <div
                    key={d.date}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 55px",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.78rem",
                    }}
                  >
                    <span style={{ color: "var(--color-arena-muted)" }}>
                      {formatDate(d.date)}
                    </span>
                    <div
                      style={{
                        background: "#e0e0e0",
                        borderRadius: 4,
                        height: 16,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: maxCount
                            ? `${(d.count / maxCount) * 100}%`
                            : "0%",
                          background: "var(--color-arena-yellow)",
                          height: "100%",
                          borderRadius: 4,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                      {d.count} · <span title="Eingeloggt" style={{ color: "var(--color-arena-blue)" }}>{d.loggedIn}</span>/<span title="Anonym" style={{ opacity: 0.6 }}>{d.anonymous}</span>
                    </span>
                  </div>
                ))}
                {data.visitorsPerDay.length === 0 && (
                  <p style={{ color: "var(--color-arena-muted)" }}>
                    Keine Daten im gewählten Zeitraum.
                  </p>
                )}
              </div>
              </>
            )}

            {/* Tab: Top-Seiten */}
            {tab === "pages" && (
              <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid var(--color-arena-border)",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "0.4rem 0.5rem" }}>Seite</th>
                    <th
                      style={{
                        padding: "0.4rem 0.5rem",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Aufrufe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((p) => (
                    <tr
                      key={p.page}
                      style={{
                        borderBottom: "1px solid var(--color-arena-border-light)",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.35rem 0.5rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {p.page}
                      </td>
                      <td
                        style={{
                          padding: "0.35rem 0.5rem",
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {p.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </>
            )}

            {/* Tab: Referrer */}
            {tab === "referrer" && (
              <>
            {data.topReferrers.length === 0 ? (
              <p style={{ color: "var(--color-arena-muted)", fontSize: "0.9rem" }}>
                Keine externen Referrer im gewählten Zeitraum.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid var(--color-arena-border)",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "0.4rem 0.5rem" }}>Quelle</th>
                      <th
                        style={{
                          padding: "0.4rem 0.5rem",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Aufrufe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferrers.map((r) => (
                      <tr
                        key={r.referrer}
                        style={{
                          borderBottom:
                            "1px solid var(--color-arena-border-light)",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.35rem 0.5rem",
                            wordBreak: "break-all",
                          }}
                        >
                          {tryExtractHost(r.referrer)}
                        </td>
                        <td
                          style={{
                            padding: "0.35rem 0.5rem",
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          {r.count}
                        </td>
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
          <p style={{ color: "var(--color-arena-danger)" }}>
            Daten konnten nicht geladen werden.
          </p>
        )}
      </div>
    </main>
  );
}
