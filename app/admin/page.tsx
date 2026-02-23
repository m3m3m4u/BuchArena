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
};

export default function AdminPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);

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

  if (!account) {
    return (
      <main className="centered-main">
        <section className="profile-card">
          <h1>User-Übersicht</h1>
          <p>Bitte zuerst anmelden.</p>
          <Link href="/auth" className="footer-button">
            Zur Anmeldung
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="centered-main">
      <section className="profile-card">
        <h1>User-Übersicht</h1>

        {isLoading ? (
          <p>Lade Benutzer ...</p>
        ) : account.role !== "SUPERADMIN" ? (
          <p className="message error">Nur der SuperAdmin darf diese Seite sehen.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isDeactivated = user.status === "deactivated";
                  const isSuperAdmin = user.role === "SUPERADMIN";
                  const isBusy = busyUser === user.username;

                  return (
                    <tr key={user.username} className={isDeactivated ? "row-deactivated" : ""}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        {isSuperAdmin
                          ? "Admin"
                          : isDeactivated
                          ? "Deaktiviert"
                          : "Aktiv"}
                      </td>
                      <td className="admin-actions">
                        <Link
                          href={`/profil?user=${encodeURIComponent(user.username)}`}
                          className="footer-button small"
                        >
                          Profil
                        </Link>
                        {!isSuperAdmin && (
                          <>
                            {isDeactivated ? (
                              <button
                                type="button"
                                className="footer-button small"
                                disabled={isBusy}
                                onClick={() => changeUserStatus(user.username, "activate")}
                              >
                                Aktivieren
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="footer-button small danger"
                                disabled={isBusy}
                                onClick={() => changeUserStatus(user.username, "deactivate")}
                              >
                                Deaktivieren
                              </button>
                            )}
                            <button
                              type="button"
                              className="footer-button small danger"
                              disabled={isBusy}
                              onClick={() => changeUserStatus(user.username, "delete")}
                            >
                              Löschen
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {message && <p className="message error">{message}</p>}
      </section>
    </main>
  );
}
