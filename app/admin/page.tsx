"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";

type UserListEntry = {
  username: string;
  email: string;
  role: string;
  status?: string;
  hasProfile?: boolean;
  hasSpeakerProfile?: boolean;
  hasBloggerProfile?: boolean;
  hasTestleserProfile?: boolean;
  hasLektorenProfile?: boolean;
  bookCount?: number;
  createdAt?: string | null;
  lastOnline?: string | null;
  newsletterOptIn?: boolean;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

/* ── Analytics-Typen ── */
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

function tryExtractHost(url: string): string {
  try {
    const u = new URL(url);
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

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);

  /* ── Haupt-Reiter ── */
  const [mainTab, setMainTab] = useState<"bdw" | "analytics" | "users" | "newsletter">("bdw");

  /* ── User-Suche & Paginierung ── */
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 25;

  /* ── Benutzername ändern ── */
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");

  /* ── Passwort zurücksetzen ── */
  const [pwResetTarget, setPwResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  /* ── E-Mail ändern ── */
  const [emailChangeTarget, setEmailChangeTarget] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");

  /* ── Buch der Woche ── */
  const [bdwTitle, setBdwTitle] = useState("");
  const [bdwAuthor, setBdwAuthor] = useState("");
  const [bdwSpeaker, setBdwSpeaker] = useState("");
  const [bdwYoutube, setBdwYoutube] = useState("");
  const [bdwBuyUrl, setBdwBuyUrl] = useState("");
  const [bdwActive, setBdwActive] = useState(true);
  const [bdwMsg, setBdwMsg] = useState("");
  const [bdwLoading, setBdwLoading] = useState(false);
  const [bdwLoaded, setBdwLoaded] = useState(false);
  const [bdwBookId, setBdwBookId] = useState("");
  const [bdwAuthorUsername, setBdwAuthorUsername] = useState("");
  const [bdwSpeakerUsername, setBdwSpeakerUsername] = useState("");

  /* ── Buch-Suche (BdW) ── */
  type BookOption = { id: string; title: string; author: string; ownerUsername: string; buyLinks: string[] };
  const [bdwBooks, setBdwBooks] = useState<BookOption[]>([]);
  const [bdwBookQuery, setBdwBookQuery] = useState("");
  const [bdwBookOpen, setBdwBookOpen] = useState(false);

  /* ── Sprecher-Suche (BdW) ── */
  type SpeakerOption = { username: string; displayName: string };
  const [bdwSpeakers, setBdwSpeakers] = useState<SpeakerOption[]>([]);
  const [bdwSpeakerQuery, setBdwSpeakerQuery] = useState("");
  const [bdwSpeakerOpen, setBdwSpeakerOpen] = useState(false);

  /* ── Analytics ── */
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsTab, setAnalyticsTab] = useState<"chart" | "pages" | "referrer">("chart");
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

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

  useEffect(() => {
    async function loadUsers() {
      if (!account) {
        setIsLoading(false);
        setUsers([]);
        return;
      }

      if (account.role !== "SUPERADMIN" && account.role !== "ADMIN") {
        setIsLoading(false);
        setUsers([]);
        setMessage("Nur Admins dürfen diese Seite sehen.");
        return;
      }

      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requesterUsername: account.username }),
        });

        const data = (await response.json()) as { users?: UserListEntry[]; message?: string };
        if (!response.ok) {
          throw new Error(data.message ?? "Fehler beim Laden.");
        }

        setUsers(data.users ?? []);
      } catch {
        setMessage("User-Übersicht konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, [account]);

  // Buch der Woche laden
  useEffect(() => {
    if (mainTab !== "bdw" || bdwLoaded) return;
    setBdwLoaded(true);
    fetch("/api/buch-der-woche?admin=1").then(r => r.json()).then(d => {
      if (d.buchDerWoche) {
        setBdwTitle(d.buchDerWoche.title ?? "");
        setBdwAuthor(d.buchDerWoche.author ?? "");
        setBdwSpeaker(d.buchDerWoche.speaker ?? "");
        setBdwYoutube(d.buchDerWoche.youtubeUrl ?? "");
        setBdwBuyUrl(d.buchDerWoche.buyUrl ?? "");
        setBdwActive(d.buchDerWoche.active ?? true);
        setBdwBookId(d.buchDerWoche.bookId ?? "");
        setBdwAuthorUsername(d.buchDerWoche.authorUsername ?? "");
        setBdwSpeakerUsername(d.buchDerWoche.speakerUsername ?? "");
      }
    }).catch(() => {});
    // Bücher und Sprecher laden
    fetch("/api/books/discover").then(r => r.json()).then(d => {
      const books = (d.books ?? []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        title: b.title as string,
        author: (b.authorDisplayName ?? b.ownerUsername) as string,
        ownerUsername: b.ownerUsername as string,
        buyLinks: (b.buyLinks ?? []) as string[],
      }));
      setBdwBooks(books);
    }).catch(() => {});
    fetch("/api/speakers/discover").then(r => r.json()).then(d => {
      setBdwSpeakers((d.speakers ?? []).map((s: Record<string, unknown>) => ({
        username: s.username as string,
        displayName: s.displayName as string,
      })));
    }).catch(() => {});
  }, [mainTab, bdwLoaded]);

  // Analytics laden
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/analytics/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: analyticsDays }),
      });
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    if (mainTab !== "analytics") return;
    if (!account || (account.role !== "ADMIN" && account.role !== "SUPERADMIN")) return;
    loadAnalytics();
    setAnalyticsLoaded(true);
  }, [mainTab, account, loadAnalytics]);

  async function saveBuchDerWoche() {
    setBdwLoading(true);
    setBdwMsg("");
    try {
      const res = await fetch("/api/buch-der-woche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: bdwTitle, author: bdwAuthor, speaker: bdwSpeaker, youtubeUrl: bdwYoutube, buyUrl: bdwBuyUrl, active: bdwActive, bookId: bdwBookId, authorUsername: bdwAuthorUsername, speakerUsername: bdwSpeakerUsername }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Fehler"); }
      setBdwMsg("✅ Gespeichert!");
    } catch (err) {
      setBdwMsg(err instanceof Error ? err.message : "Fehler beim Speichern.");
    } finally {
      setBdwLoading(false);
    }
  }

  async function changeUserStatus(
    targetUsername: string,
    action: "activate" | "deactivate" | "delete"
  ) {
    if (!account) return;

    const labels: Record<string, string> = {
      activate: "aktivieren",
      deactivate: "deaktivieren",
      delete: "endgültig löschen",
    };

    if (!confirm(`Benutzer \u201e${targetUsername}\u201c wirklich ${labels[action]}?`)) {
      return;
    }

    setBusyUser(targetUsername);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterUsername: account.username,
          targetUsername,
          action,
        }),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Aktion fehlgeschlagen.");
      }

      setMessage(data.message ?? "Erfolgreich.");

      if (action === "delete") {
        setUsers((prev) => prev.filter((u) => u.username !== targetUsername));
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.username === targetUsername
              ? { ...u, status: action === "deactivate" ? "deactivated" : "active" }
              : u
          )
        );
      }
    } catch {
      setMessage("Aktion fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  /* ── Benutzername ändern ── */
  async function handleRename() {
    if (!renameTarget || !newUsername.trim()) return;
    setBusyUser(renameTarget);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldUsername: renameTarget, newUsername: newUsername.trim() }),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Umbenennung fehlgeschlagen.");

      setMessage(data.message ?? "Erfolgreich.");
      setUsers((prev) =>
        prev.map((u) =>
          u.username === renameTarget ? { ...u, username: newUsername.trim() } : u,
        ),
      );
      setRenameTarget(null);
      setNewUsername("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Umbenennung fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  /* ── Passwort zurücksetzen ── */
  async function handleResetPassword() {
    if (!pwResetTarget || !newPassword.trim()) return;
    setBusyUser(pwResetTarget);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: pwResetTarget, newPassword: newPassword.trim() }),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Passwort-Reset fehlgeschlagen.");

      setMessage(data.message ?? "Erfolgreich.");
      setPwResetTarget(null);
      setNewPassword("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Passwort-Reset fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  /* ── E-Mail ändern ── */
  async function handleChangeEmail() {
    if (!emailChangeTarget || !newEmail.trim()) return;
    setBusyUser(emailChangeTarget);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: emailChangeTarget, newEmail: newEmail.trim() }),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "E-Mail-Änderung fehlgeschlagen.");

      setMessage(data.message ?? "Erfolgreich.");
      setUsers((prev) =>
        prev.map((u) =>
          u.username === emailChangeTarget ? { ...u, email: newEmail.trim().toLowerCase() } : u,
        ),
      );
      setEmailChangeTarget(null);
      setNewEmail("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "E-Mail-Änderung fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  /* ── Admin-Rolle umschalten (nur SUPERADMIN) ── */
  async function handleToggleRole(targetUsername: string, currentRole: string) {
    if (!account || account.role !== "SUPERADMIN") return;
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const label = newRole === "ADMIN" ? "zum Admin machen" : "Admin-Rechte entziehen";
    if (!confirm(`„${targetUsername}" wirklich ${label}?`)) return;

    setBusyUser(targetUsername);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername, newRole }),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Rollenzuweisung fehlgeschlagen.");

      setMessage(data.message ?? "Erfolgreich.");
      setUsers((prev) =>
        prev.map((u) =>
          u.username === targetUsername ? { ...u, role: newRole } : u,
        ),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Rollenzuweisung fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  /* ── Als Benutzer einloggen ── */
  async function handleImpersonate(targetUsername: string) {
    if (!account || account.role !== "SUPERADMIN") return;
    if (!confirm(`Als „${targetUsername}" einloggen? Du kannst danach über den Banner oben zurückkehren.`)) return;
    setBusyUser(targetUsername);
    try {
      const res = await fetch("/api/admin/users/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername }),
      });
      const data = (await res.json()) as { message?: string; user?: { username: string; email: string; role: string } };
      if (!res.ok) throw new Error(data.message ?? "Imitation fehlgeschlagen.");
      if (data.user) {
        const { setStoredAccount } = await import("@/lib/client-account");
        setStoredAccount(data.user as import("@/lib/client-account").LoggedInAccount);
      }
      window.location.href = "/profil";
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Imitation fehlgeschlagen.");
      setBusyUser(null);
    }
  }

  if (!account) {
    return (
      <main className="centered-main">
        <section className="card">
          <h1>Admin</h1>
          <p>Bitte zuerst anmelden.</p>
          <Link href="/auth" className="btn">
            Zur Anmeldung
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="centered-main">
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <h1>Admin</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-sm"
              onClick={async () => {
                setMessage("Lesezeichen werden neu berechnet …");
                try {
                  const r = await fetch("/api/lesezeichen/recalc", { method: "POST" });
                  const d = await r.json() as { message?: string };
                  setMessage(d.message ?? "Fertig.");
                } catch { setMessage("Fehler bei der Neuberechnung."); }
              }}
            >
              🔖 Lesezeichen neu berechnen
            </button>
            <Link href="/admin/einreichungen" className="btn btn-sm">
              📬 Einreichungen
            </Link>
          </div>
        </div>

        {/* ── Haupt-Reiter ── */}
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {([
            { key: "bdw" as const, label: "📖 Buch der Woche" },
            { key: "analytics" as const, label: "📊 Analyse" },
            { key: "users" as const, label: "👥 User-Übersicht" },
            { key: "newsletter" as const, label: "📬 Newsletter" },
          ]).map((t) => (
            <button
              key={t.key}
              className={`btn btn-sm${mainTab === t.key ? " btn-primary" : ""}`}
              onClick={() => setMainTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ Tab: Buch der Woche ══ */}
        {mainTab === "bdw" && (
          <div className="grid gap-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-semibold">Aktiv</span>
              <button
                type="button"
                role="switch"
                aria-checked={bdwActive}
                onClick={() => setBdwActive(!bdwActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${bdwActive ? "bg-arena-blue" : "bg-gray-300"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${bdwActive ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-xs text-arena-muted">{bdwActive ? "Wird angezeigt" : "Ausgeblendet"}</span>
            </label>

            {/* Buch-Suche */}
            <div className="block relative">
              <span className="text-sm font-semibold">Buch auswählen</span>
              <input
                className="input-base w-full mt-1"
                value={bdwBookQuery}
                onChange={e => { setBdwBookQuery(e.target.value); setBdwBookOpen(true); }}
                onFocus={() => setBdwBookOpen(true)}
                placeholder="Buchtitel suchen…"
              />
              {bdwBookOpen && bdwBookQuery.trim().length > 0 && (() => {
                const q = bdwBookQuery.toLowerCase();
                const filtered = bdwBooks.filter(b =>
                  b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
                ).slice(0, 10);
                return filtered.length > 0 ? (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(b => (
                      <li key={b.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          onClick={() => {
                            setBdwTitle(b.title);
                            setBdwAuthor(b.author);
                            setBdwBookId(b.id);
                            setBdwAuthorUsername(b.ownerUsername);
                            setBdwBookQuery("");
                            setBdwBookOpen(false);
                          }}
                        >
                          <strong>{b.title}</strong>{" "}
                          <span className="text-arena-muted">von {b.author}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null;
              })()}
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Buchtitel</span>
              <input className="input-base w-full mt-1" value={bdwTitle} onChange={e => setBdwTitle(e.target.value)} placeholder="z.B. Der Alchimist" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Autor</span>
              <input className="input-base w-full mt-1" value={bdwAuthor} onChange={e => setBdwAuthor(e.target.value)} placeholder="z.B. Paulo Coelho" />
            </label>

            {/* Sprecher-Suche */}
            <div className="block relative">
              <span className="text-sm font-semibold">Sprecher auswählen</span>
              <input
                className="input-base w-full mt-1"
                value={bdwSpeakerQuery}
                onChange={e => { setBdwSpeakerQuery(e.target.value); setBdwSpeakerOpen(true); }}
                onFocus={() => setBdwSpeakerOpen(true)}
                placeholder="Sprecher suchen…"
              />
              {bdwSpeakerOpen && bdwSpeakerQuery.trim().length > 0 && (() => {
                const q = bdwSpeakerQuery.toLowerCase();
                const filtered = bdwSpeakers.filter(s =>
                  s.displayName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)
                ).slice(0, 10);
                return filtered.length > 0 ? (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(s => (
                      <li key={s.username}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          onClick={() => {
                            setBdwSpeaker(s.displayName);
                            setBdwSpeakerUsername(s.username);
                            setBdwSpeakerQuery("");
                            setBdwSpeakerOpen(false);
                          }}
                        >
                          <strong>{s.displayName}</strong>{" "}
                          <span className="text-arena-muted">@{s.username}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null;
              })()}
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Sprecher</span>
              <input className="input-base w-full mt-1" value={bdwSpeaker} onChange={e => setBdwSpeaker(e.target.value)} placeholder="z.B. Max Mustermann" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">YouTube-Link</span>
              <input className="input-base w-full mt-1" value={bdwYoutube} onChange={e => setBdwYoutube(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Kauf-Link</span>
              <input className="input-base w-full mt-1" value={bdwBuyUrl} onChange={e => setBdwBuyUrl(e.target.value)} placeholder="https://..." />
            </label>
            <div className="flex items-center gap-3 mt-1">
              <button className="btn btn-primary btn-sm" disabled={bdwLoading || !bdwTitle.trim() || !bdwAuthor.trim()} onClick={() => void saveBuchDerWoche()}>
                {bdwLoading ? "Speichern …" : "Speichern"}
              </button>
              {bdwMsg && <span className="text-sm">{bdwMsg}</span>}
            </div>
          </div>
        )}

        {/* ══ Tab: Analytics ══ */}
        {mainTab === "analytics" && (
          <div className="grid gap-3">
            {/* Zeitraum-Auswahl */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  className={`btn btn-sm${d === analyticsDays ? " btn-primary" : ""}`}
                  onClick={() => setAnalyticsDays(d)}
                >
                  {d} Tage
                </button>
              ))}
            </div>

            {analyticsLoading ? (
              <p style={{ color: "var(--color-arena-muted)" }}>Lade Daten…</p>
            ) : analyticsData ? (
              <>
                {/* Übersichtskarten */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                  {[
                    { value: analyticsData.todayViews, label: "Aufrufe heute", bg: "var(--color-arena-blue)", color: "#fff" },
                    { value: analyticsData.todayUniqueVisitors, label: "Nutzer heute", bg: "var(--color-arena-yellow)", color: "#333" },
                    { value: analyticsData.todayLoggedInUsers, label: "Eingeloggt", bg: "var(--color-arena-blue-light)", color: "#fff" },
                    { value: analyticsData.todayAnonymousUsers, label: "Anonym", bg: "var(--color-arena-blue-mid)", color: "#fff" },
                    { value: analyticsData.totalViews, label: `Gesamt (${analyticsData.days}d)`, bg: "var(--color-arena-blue)", color: "#fff" },
                    { value: analyticsData.visitorsPerDay.length, label: "Aktive Tage", bg: "var(--color-arena-blue-mid)", color: "#fff" },
                  ].map((card) => (
                    <div key={card.label} style={{ background: card.bg, color: card.color, borderRadius: 8, padding: "0.6rem 0.4rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</div>
                      <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Sub-Tabs */}
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {([
                    { key: "chart" as const, label: "📈 Verlauf" },
                    { key: "pages" as const, label: "📄 Top-Seiten" },
                    { key: "referrer" as const, label: "🔗 Herkunft" },
                  ]).map((t) => (
                    <button key={t.key} className={`btn btn-sm${analyticsTab === t.key ? " btn-primary" : ""}`} onClick={() => setAnalyticsTab(t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Sub-Tab: Verlauf */}
                {analyticsTab === "chart" && (() => {
                  const maxCount = analyticsData.visitorsPerDay.reduce((max, d) => Math.max(max, d.count), 0);
                  return (
                    <>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem", color: "var(--color-arena-muted)", flexWrap: "wrap" }}>
                        <span>Aufrufe · <span style={{ color: "var(--color-arena-blue)", fontWeight: 600 }}>Eingeloggt</span> / <span style={{ opacity: 0.6 }}>Anonym</span></span>
                      </div>
                      <div style={{ display: "grid", gap: "3px", maxHeight: 400, overflowY: "auto", overflowX: "hidden" }}>
                        {analyticsData.visitorsPerDay.map((d) => (
                          <div key={d.date} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                            <span style={{ color: "var(--color-arena-muted)" }}>{formatDateShort(d.date)}</span>
                            <div style={{ background: "#e0e0e0", borderRadius: 4, height: 16, overflow: "hidden" }}>
                              <div style={{ width: maxCount ? `${(d.count / maxCount) * 100}%` : "0%", background: "var(--color-arena-yellow)", height: "100%", borderRadius: 4, transition: "width 0.3s" }} />
                            </div>
                            <span style={{ fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                              {d.count} · <span title="Eingeloggt" style={{ color: "var(--color-arena-blue)" }}>{d.loggedIn}</span>/<span title="Anonym" style={{ opacity: 0.6 }}>{d.anonymous}</span>
                            </span>
                          </div>
                        ))}
                        {analyticsData.visitorsPerDay.length === 0 && (
                          <p style={{ color: "var(--color-arena-muted)" }}>Keine Daten im gewählten Zeitraum.</p>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Sub-Tab: Top-Seiten */}
                {analyticsTab === "pages" && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--color-arena-border)", textAlign: "left" }}>
                          <th style={{ padding: "0.4rem 0.5rem" }}>Seite</th>
                          <th style={{ padding: "0.4rem 0.5rem", textAlign: "right", whiteSpace: "nowrap" }}>Aufrufe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.topPages.map((p) => (
                          <tr key={p.page} style={{ borderBottom: "1px solid var(--color-arena-border-light)" }}>
                            <td style={{ padding: "0.35rem 0.5rem", wordBreak: "break-all" }}>{p.page}</td>
                            <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontWeight: 600 }}>{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-Tab: Referrer */}
                {analyticsTab === "referrer" && (
                  <>
                    {analyticsData.topReferrers.length === 0 ? (
                      <p style={{ color: "var(--color-arena-muted)", fontSize: "0.9rem" }}>Keine externen Referrer im gewählten Zeitraum.</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid var(--color-arena-border)", textAlign: "left" }}>
                              <th style={{ padding: "0.4rem 0.5rem" }}>Quelle</th>
                              <th style={{ padding: "0.4rem 0.5rem", textAlign: "right", whiteSpace: "nowrap" }}>Aufrufe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsData.topReferrers.map((r) => (
                              <tr key={r.referrer} style={{ borderBottom: "1px solid var(--color-arena-border-light)" }}>
                                <td style={{ padding: "0.35rem 0.5rem", wordBreak: "break-all" }}>{tryExtractHost(r.referrer)}</td>
                                <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontWeight: 600 }}>{r.count}</td>
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
              <p style={{ color: "var(--color-arena-danger)" }}>Daten konnten nicht geladen werden.</p>
            )}
          </div>
        )}

        {/* ══ Tab: User-Übersicht ══ */}
        {mainTab === "users" && (
          <>
        {isLoading ? (
          <p>Lade Benutzer ...</p>
        ) : (account.role !== "SUPERADMIN" && account.role !== "ADMIN") ? (
          <p className="text-red-700">Nur Admins dürfen diese Seite sehen.</p>
        ) : (() => {
          const searchLower = userSearch.toLowerCase();
          const filteredUsers = searchLower
            ? users.filter((u) => u.username.toLowerCase().includes(searchLower) || u.email.toLowerCase().includes(searchLower))
            : users;
          const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
          const clampedPage = Math.min(userPage, totalPages);
          const pagedUsers = filteredUsers.slice((clampedPage - 1) * usersPerPage, clampedPage * usersPerPage);

          return (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            {/* Suchfeld */}
            <div className="mb-3 flex gap-2 items-center flex-wrap">
              <input
                type="text"
                className="input-base flex-1"
                placeholder="Benutzer suchen (Name oder E-Mail) …"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                style={{ minWidth: 200, maxWidth: 400 }}
              />
              <span className="text-xs text-arena-muted">{filteredUsers.length} von {users.length} Benutzern</span>
            </div>

            {/* Desktop-Tabelle */}
            <table className="hidden sm:table w-full border-collapse text-[0.85rem]" style={{ minWidth: "900px" }}>
              <thead>
                <tr>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.8rem] uppercase tracking-wider text-arena-muted whitespace-nowrap">Name / E-Mail</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.8rem] uppercase tracking-wider text-arena-muted whitespace-nowrap">Status</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.8rem] uppercase tracking-wider text-arena-muted whitespace-nowrap">Registriert</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.8rem] uppercase tracking-wider text-arena-muted whitespace-nowrap">Zuletzt online</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.8rem] uppercase tracking-wider text-arena-muted whitespace-nowrap">Profile / Bücher</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.8rem] uppercase tracking-wider text-arena-muted whitespace-nowrap">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((user) => {
                  const isDeactivated = user.status === "deactivated";
                  const isSuperAdmin = user.role === "SUPERADMIN";
                  const isAdmin = user.role === "ADMIN";
                  const isBusy = busyUser === user.username;

                  return (
                    <tr key={user.username} className={`hover:bg-[#f5f5f5] ${isDeactivated ? "opacity-50" : ""}`}>
                      <td className="p-2 border-b border-arena-border-light">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-arena-muted break-all">{user.email}</div>
                      </td>
                      <td className="p-2 border-b border-arena-border-light whitespace-nowrap">
                        {isSuperAdmin
                          ? "SuperAdmin"
                          : isAdmin
                          ? "Admin"
                          : isDeactivated
                          ? "Deaktiviert"
                          : "Aktiv"}
                      </td>
                      <td className="p-2 border-b border-arena-border-light whitespace-nowrap text-xs text-arena-muted">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-2 border-b border-arena-border-light whitespace-nowrap text-xs text-arena-muted">
                        {formatDateTime(user.lastOnline)}
                      </td>
                      <td className="p-2 border-b border-arena-border-light">
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}`}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                              user.hasProfile
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={user.hasProfile ? "Autorenprofil ausgefüllt" : "Autorenprofil leer"}
                          >
                            ✍️ Autor {user.hasProfile ? "✓" : "✗"}
                          </Link>
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}&tab=sprecher`}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                              user.hasSpeakerProfile
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={user.hasSpeakerProfile ? "Sprecherprofil ausgefüllt" : "Sprecherprofil leer"}
                          >
                            🎙️ Sprecher {user.hasSpeakerProfile ? "✓" : "✗"}
                          </Link>
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}&tab=blogger`}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                              user.hasBloggerProfile
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={user.hasBloggerProfile ? "Bloggerprofil ausgefüllt" : "Bloggerprofil leer"}
                          >
                            📝 Blogger {user.hasBloggerProfile ? "✓" : "✗"}
                          </Link>
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}&tab=testleser`}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                              user.hasTestleserProfile
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={user.hasTestleserProfile ? "Testleserprofil ausgefüllt" : "Testleserprofil leer"}
                          >
                            📖 Testleser {user.hasTestleserProfile ? "✓" : "✗"}
                          </Link>
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}&tab=lektoren`}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                              user.hasLektorenProfile
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={user.hasLektorenProfile ? "Lektorenprofil ausgefüllt" : "Lektorenprofil leer"}
                          >
                            🔍 Lektor {user.hasLektorenProfile ? "✓" : "✗"}
                          </Link>
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}&tab=buecher`}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                              (user.bookCount ?? 0) > 0
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={`${user.bookCount ?? 0} Bücher`}
                          >
                            📚 {user.bookCount ?? 0} Bücher
                          </Link>
                        </div>
                      </td>
                      <td className="p-2 border-b border-arena-border-light">
                        <div className="flex gap-1 flex-wrap">
                          {/* SuperAdmin: Als Benutzer einloggen */}
                          {!isSuperAdmin && account.role === "SUPERADMIN" && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              disabled={isBusy}
                              title={`Als ${user.username} einloggen`}
                              onClick={() => handleImpersonate(user.username)}
                            >
                              👤 Als User
                            </button>
                          )}
                          {/* SuperAdmin: Rolle umschalten */}
                          {!isSuperAdmin && account.role === "SUPERADMIN" && (
                            <button
                              type="button"
                              className={`btn btn-sm ${isAdmin ? "btn-danger" : ""}`}
                              disabled={isBusy}
                              onClick={() => handleToggleRole(user.username, user.role)}
                            >
                              {isAdmin ? "Admin ✕" : "→ Admin"}
                            </button>
                          )}
                          {!isSuperAdmin && !(isAdmin && account.role !== "SUPERADMIN") && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={isBusy}
                                onClick={() => { setRenameTarget(user.username); setNewUsername(user.username); }}
                              >
                                Umbenennen
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={isBusy}
                                onClick={() => { setPwResetTarget(user.username); setNewPassword(""); }}
                              >
                                Passwort
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={isBusy}
                                onClick={() => { setEmailChangeTarget(user.username); setNewEmail(user.email); }}
                              >
                                E-Mail
                              </button>
                              {isDeactivated ? (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={isBusy}
                                  onClick={() => changeUserStatus(user.username, "activate")}
                                >
                                  Aktivieren
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  disabled={isBusy}
                                  onClick={() => changeUserStatus(user.username, "deactivate")}
                                >
                                  Deaktivieren
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                disabled={isBusy}
                                onClick={() => changeUserStatus(user.username, "delete")}
                              >
                                Löschen
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card-Liste */}
            <div className="sm:hidden grid gap-2.5">
              {pagedUsers.map((user) => {
                const isDeactivated = user.status === "deactivated";
                const isSuperAdmin = user.role === "SUPERADMIN";
                const isAdmin = user.role === "ADMIN";
                const isBusy = busyUser === user.username;

                return (
                  <div key={user.username} className={`rounded-lg border border-arena-border p-3 ${isDeactivated ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <strong className="text-[0.95rem]">{user.username}</strong>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isSuperAdmin ? "bg-purple-100 text-purple-800"
                        : isAdmin ? "bg-blue-100 text-blue-800"
                        : isDeactivated ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-800"
                      }`}>
                        {isSuperAdmin ? "SuperAdmin" : isAdmin ? "Admin" : isDeactivated ? "Deaktiviert" : "Aktiv"}
                      </span>
                    </div>
                    <p className="text-sm text-arena-muted mb-1 break-all">{user.email}</p>
                    <div className="flex gap-3 text-xs text-arena-muted mb-2">
                      <span>📅 Reg. {formatDate(user.createdAt)}</span>
                      <span>🕐 Online {formatDateTime(user.lastOnline)}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center mb-2">
                      <Link
                        href={`/profil?user=${encodeURIComponent(user.username)}`}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                          user.hasProfile
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        ✍️ Autor {user.hasProfile ? "✓" : "✗"}
                      </Link>
                      <Link
                        href={`/profil?user=${encodeURIComponent(user.username)}&tab=sprecher`}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                          user.hasSpeakerProfile
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        🎙️ Sprecher {user.hasSpeakerProfile ? "✓" : "✗"}
                      </Link>
                      <Link
                        href={`/profil?user=${encodeURIComponent(user.username)}&tab=blogger`}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                          user.hasBloggerProfile
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        📝 Blogger {user.hasBloggerProfile ? "✓" : "✗"}
                      </Link>
                      <Link
                        href={`/profil?user=${encodeURIComponent(user.username)}&tab=testleser`}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                          user.hasTestleserProfile
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        📖 Testleser {user.hasTestleserProfile ? "✓" : "✗"}
                      </Link>
                      <Link
                        href={`/profil?user=${encodeURIComponent(user.username)}&tab=lektoren`}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                          user.hasLektorenProfile
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        🔍 Lektor {user.hasLektorenProfile ? "✓" : "✗"}
                      </Link>
                      <Link
                        href={`/profil?user=${encodeURIComponent(user.username)}&tab=buecher`}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium no-underline ${
                          (user.bookCount ?? 0) > 0
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        📚 {user.bookCount ?? 0} Bücher
                      </Link>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {/* SuperAdmin: Als Benutzer einloggen */}
                      {!isSuperAdmin && account.role === "SUPERADMIN" && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={isBusy}
                          title={`Als ${user.username} einloggen`}
                          onClick={() => handleImpersonate(user.username)}
                        >
                          👤 Als User
                        </button>
                      )}
                      {/* SuperAdmin: Rolle umschalten */}
                      {!isSuperAdmin && account.role === "SUPERADMIN" && (
                        <button
                          type="button"
                          className={`btn btn-sm ${isAdmin ? "btn-danger" : ""}`}
                          disabled={isBusy}
                          onClick={() => handleToggleRole(user.username, user.role)}
                        >
                          {isAdmin ? "Admin ✕" : "→ Admin"}
                        </button>
                      )}
                      {!isSuperAdmin && !(isAdmin && account.role !== "SUPERADMIN") && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={isBusy}
                            onClick={() => { setRenameTarget(user.username); setNewUsername(user.username); }}
                          >
                            Umbenennen
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={isBusy}
                            onClick={() => { setPwResetTarget(user.username); setNewPassword(""); }}
                          >
                            Passwort
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={isBusy}
                            onClick={() => { setEmailChangeTarget(user.username); setNewEmail(user.email); }}
                          >
                            E-Mail
                          </button>
                          {isDeactivated ? (
                            <button
                              type="button"
                              className="btn btn-sm"
                              disabled={isBusy}
                              onClick={() => changeUserStatus(user.username, "activate")}
                            >
                              Aktivieren
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={isBusy}
                              onClick={() => changeUserStatus(user.username, "deactivate")}
                            >
                              Deaktivieren
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={isBusy}
                            onClick={() => changeUserStatus(user.username, "delete")}
                          >
                            Löschen
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginierung */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button type="button" className="btn btn-sm" disabled={clampedPage <= 1} onClick={() => setUserPage(clampedPage - 1)}>← Zurück</button>
                <span className="text-sm text-arena-muted">Seite {clampedPage} / {totalPages}</span>
                <button type="button" className="btn btn-sm" disabled={clampedPage >= totalPages} onClick={() => setUserPage(clampedPage + 1)}>Weiter →</button>
              </div>
            )}
          </div>
          );
        })()}
          </>
        )}

        {/* ══ Tab: Newsletter ══ */}
        {mainTab === "newsletter" && (() => {
          const subscribers = users.filter((u) => u.newsletterOptIn);
          return (
            <div className="grid gap-3">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                <div style={{ background: "var(--color-arena-blue)", color: "#fff", borderRadius: 8, padding: "0.6rem 0.4rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>{subscribers.length}</div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>Angemeldet</div>
                </div>
                <div style={{ background: "var(--color-arena-blue-mid)", color: "#fff", borderRadius: 8, padding: "0.6rem 0.4rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>{users.length}</div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>User gesamt</div>
                </div>
              </div>

              {subscribers.length === 0 ? (
                <p style={{ color: "var(--color-arena-muted)", fontSize: "0.9rem" }}>Noch keine Newsletter-Anmeldungen.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--color-arena-border)", textAlign: "left" }}>
                        <th style={{ padding: "0.4rem 0.5rem" }}>#</th>
                        <th style={{ padding: "0.4rem 0.5rem" }}>Benutzername</th>
                        <th style={{ padding: "0.4rem 0.5rem" }}>E-Mail</th>
                        <th style={{ padding: "0.4rem 0.5rem" }}>Registriert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((u, i) => (
                        <tr key={u.username} style={{ borderBottom: "1px solid var(--color-arena-border-light)" }}>
                          <td style={{ padding: "0.35rem 0.5rem", color: "var(--color-arena-muted)" }}>{i + 1}</td>
                          <td style={{ padding: "0.35rem 0.5rem", fontWeight: 600 }}>{u.username}</td>
                          <td style={{ padding: "0.35rem 0.5rem", wordBreak: "break-all" }}>{u.email}</td>
                          <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap", color: "var(--color-arena-muted)" }}>{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {message && <p className="text-red-700">{message}</p>}

        {/* ══ Overlay: Benutzername ändern ══ */}
        {renameTarget && (
          <div className="overlay-backdrop" onClick={() => setRenameTarget(null)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg m-0 mb-3">Benutzername ändern</h2>
              <p className="text-sm text-arena-muted mb-2">
                Aktuell: <strong>{renameTarget}</strong>
              </p>
              <label className="block">
                <span className="text-sm font-semibold">Neuer Benutzername</span>
                <input
                  className="input-base w-full mt-1"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Neuer Benutzername"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); }}
                />
              </label>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-primary flex-1" disabled={!newUsername.trim() || busyUser === renameTarget} onClick={() => void handleRename()}>
                  Umbenennen
                </button>
                <button type="button" className="btn flex-1" onClick={() => setRenameTarget(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Overlay: E-Mail ändern ══ */}
        {emailChangeTarget && (
          <div className="overlay-backdrop" onClick={() => setEmailChangeTarget(null)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg m-0 mb-3">E-Mail ändern</h2>
              <p className="text-sm text-arena-muted mb-2">
                Benutzer: <strong>{emailChangeTarget}</strong>
              </p>
              <label className="block">
                <span className="text-sm font-semibold">Neue E-Mail-Adresse</span>
                <input
                  type="email"
                  className="input-base w-full mt-1"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="neue@email.de"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void handleChangeEmail(); }}
                />
              </label>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-primary flex-1" disabled={!newEmail.trim() || busyUser === emailChangeTarget} onClick={() => void handleChangeEmail()}>
                  Ändern
                </button>
                <button type="button" className="btn flex-1" onClick={() => setEmailChangeTarget(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Overlay: Passwort zurücksetzen ══ */}
        {pwResetTarget && (
          <div className="overlay-backdrop" onClick={() => setPwResetTarget(null)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg m-0 mb-3">Passwort zurücksetzen</h2>
              <p className="text-sm text-arena-muted mb-2">
                Benutzer: <strong>{pwResetTarget}</strong>
              </p>
              <label className="block">
                <span className="text-sm font-semibold">Neues Passwort</span>
                <input
                  type="password"
                  className="input-base w-full mt-1"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 Zeichen"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void handleResetPassword(); }}
                />
              </label>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-primary flex-1" disabled={newPassword.trim().length < 6 || busyUser === pwResetTarget} onClick={() => void handleResetPassword()}>
                  Zurücksetzen
                </button>
                <button type="button" className="btn flex-1" onClick={() => setPwResetTarget(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
