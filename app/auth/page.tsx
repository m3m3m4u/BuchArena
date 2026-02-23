"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getStoredAccount, setStoredAccount } from "@/lib/client-account";

type Mode = "login" | "register";

type ApiResponse = {
  message: string;
  user?: {
    username: string;
    email: string;
    role: "USER" | "SUPERADMIN";
  };
};

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState(() => getStoredAccount());
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { identifier: username, password }
        : { username, email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Fehler bei der Anfrage.");
        return;
      }

      if (data.user) {
        setStoredAccount(data.user);
        setAccount(data.user);
      }

      setMessage(
        data.user
          ? `${data.message} Rolle: ${data.user.role}`
          : data.message
      );

      if (mode === "register") {
        setMode("login");
      }
      setPassword("");
    } catch {
      setIsError(true);
      setMessage("Server nicht erreichbar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-centered-main">
      <section className="auth-card">
        <h1>BuchArena</h1>
        <p className="subtitle">
          {account ? "Du bist bereits eingeloggt." : "Registrieren oder einloggen"}
        </p>

        {account ? (
          <div className="hint">
            <p>
              Eingeloggt als <strong>{account.username}</strong> ({account.role})
            </p>
            <Link href="/profil" className="footer-button">
              Zum Profil
            </Link>
          </div>
        ) : (
          <>
            <div className="mode-switch">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Einloggen
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Registrieren
              </button>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              <label>
                E-Mail oder Benutzername
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </label>

              {mode === "register" && (
                <label>
                  E-Mail
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
              )}

              <label>
                Passwort
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>

              <button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Bitte warten ..."
                  : mode === "login"
                    ? "Einloggen"
                    : "Registrieren"}
              </button>
            </form>
          </>
        )}

        <p className={isError ? "message error" : "message"}>{message}</p>
      </section>
    </main>
  );
}
