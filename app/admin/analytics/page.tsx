"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";

type DayData = { date: string; count: number };
type PageData = { page: string; count: number };
type ReferrerData = { referrer: string; count: number };

type AnalyticsData = {
  visitorsPerDay: DayData[];
  topPages: PageData[];
  topReferrers: ReferrerData[];
  totalViews: number;
  todayViews: number;
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
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function AnalyticsPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

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
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  background: "var(--color-arena-blue)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                  {data.todayViews}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                  Aufrufe heute
                </div>
              </div>
              <div
                style={{
                  background: "var(--color-arena-blue-light)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                  {data.totalViews}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                  Aufrufe gesamt ({data.days} Tage)
                </div>
              </div>
              <div
                style={{
                  background: "var(--color-arena-blue-mid)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                  {data.visitorsPerDay.length}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                  Aktive Tage
                </div>
              </div>
            </div>

            {/* Besucher pro Tag – Balkendiagramm */}
            <h2 style={{ fontSize: "1.1rem", marginBottom: 0 }}>
              Seitenaufrufe pro Tag
            </h2>
            <div
              style={{
                display: "grid",
                gap: "3px",
                maxHeight: 350,
                overflowY: "auto",
              }}
            >
              {data.visitorsPerDay.map((d) => (
                <div
                  key={d.date}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr 40px",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.82rem",
                  }}
                >
                  <span style={{ color: "var(--color-arena-muted)" }}>
                    {formatDate(d.date)}
                  </span>
                  <div
                    style={{
                      background: "#e0e0e0",
                      borderRadius: 4,
                      height: 18,
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
                  <span style={{ fontWeight: 600, textAlign: "right" }}>
                    {d.count}
                  </span>
                </div>
              ))}
              {data.visitorsPerDay.length === 0 && (
                <p style={{ color: "var(--color-arena-muted)" }}>
                  Keine Daten im gewählten Zeitraum.
                </p>
              )}
            </div>

            {/* Top-Seiten */}
            <h2 style={{ fontSize: "1.1rem", marginBottom: 0 }}>
              Beliebteste Seiten
            </h2>
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

            {/* Referrer */}
            <h2 style={{ fontSize: "1.1rem", marginBottom: 0 }}>
              Herkunft (Referrer)
            </h2>
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
        ) : (
          <p style={{ color: "var(--color-arena-danger)" }}>
            Daten konnten nicht geladen werden.
          </p>
        )}
      </div>
    </main>
  );
}
