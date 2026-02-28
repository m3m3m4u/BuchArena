"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  bookCount?: number;
  createdAt?: string | null;
  lastOnline?: string | null;
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

export default function AdminPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);

  /* ── Benutzername ändern ── */
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");

  /* ── Passwort zurücksetzen ── */
  const [pwResetTarget, setPwResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

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

      if (account.role !== "SUPERADMIN") {
        setIsLoading(false);
        setUsers([]);
        setMessage("Nur der SuperAdmin darf diese Seite sehen.");
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

  if (!account) {
    return (
      <main className="centered-main">
        <section className="card">
          <h1>User-Übersicht</h1>
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
        <h1>User-Übersicht</h1>

        {isLoading ? (
          <p>Lade Benutzer ...</p>
        ) : account.role !== "SUPERADMIN" ? (
          <p className="text-red-700">Nur der SuperAdmin darf diese Seite sehen.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
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
                {users.map((user) => {
                  const isDeactivated = user.status === "deactivated";
                  const isSuperAdmin = user.role === "SUPERADMIN";
                  const isBusy = busyUser === user.username;

                  return (
                    <tr key={user.username} className={`hover:bg-[#f5f5f5] ${isDeactivated ? "opacity-50" : ""}`}>
                      <td className="p-2 border-b border-arena-border-light">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-arena-muted break-all">{user.email}</div>
                      </td>
                      <td className="p-2 border-b border-arena-border-light whitespace-nowrap">
                        {isSuperAdmin
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
                          {!isSuperAdmin && (
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
              {users.map((user) => {
                const isDeactivated = user.status === "deactivated";
                const isSuperAdmin = user.role === "SUPERADMIN";
                const isBusy = busyUser === user.username;

                return (
                  <div key={user.username} className={`rounded-lg border border-arena-border p-3 ${isDeactivated ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <strong className="text-[0.95rem]">{user.username}</strong>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isSuperAdmin ? "bg-blue-100 text-blue-800"
                        : isDeactivated ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-800"
                      }`}>
                        {isSuperAdmin ? "Admin" : isDeactivated ? "Deaktiviert" : "Aktiv"}
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
                      {!isSuperAdmin && (
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
          </div>
        )}

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
