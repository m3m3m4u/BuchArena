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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.95rem]">
              <thead>
                <tr>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.85rem] uppercase tracking-wider text-arena-muted">Name</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.85rem] uppercase tracking-wider text-arena-muted">E-Mail</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.85rem] uppercase tracking-wider text-arena-muted">Status</th>
                  <th className="bg-arena-bg text-left p-2 border-b border-arena-border font-semibold text-[0.85rem] uppercase tracking-wider text-arena-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isDeactivated = user.status === "deactivated";
                  const isSuperAdmin = user.role === "SUPERADMIN";
                  const isBusy = busyUser === user.username;

                  return (
                    <tr key={user.username} className={`hover:bg-[#f5f5f5] ${isDeactivated ? "opacity-50" : ""}`}>
                      <td className="p-2 border-b border-arena-border-light">{user.username}</td>
                      <td className="p-2 border-b border-arena-border-light">{user.email}</td>
                      <td className="p-2 border-b border-arena-border-light">
                        {isSuperAdmin
                          ? "Admin"
                          : isDeactivated
                          ? "Deaktiviert"
                          : "Aktiv"}
                      </td>
                      <td className="p-2 border-b border-arena-border-light">
                        <div className="flex gap-1 flex-wrap">
                          <Link
                            href={`/profil?user=${encodeURIComponent(user.username)}`}
                            className="btn btn-sm"
                          >
                            Profil
                          </Link>
                          {!isSuperAdmin && (
                            <>
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
          </div>
        )}

        {message && <p className="text-red-700">{message}</p>}
      </section>
    </main>
  );
}
