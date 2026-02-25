"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getStoredAccount, setStoredAccount } from "@/lib/client-account";

type Mode = "login" | "register";
type ApiResponse = {
  message: string;
  user?: { username: string; email: string; role: "USER" | "SUPERADMIN" };
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

      setMessage(data.user ? `${data.message} Rolle: ${data.user.role}` : data.message);
      if (mode === "register") setMode("login");
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
      <section className="w-full max-w-[520px] rounded-xl bg-white p-5 box-border">
        <h1>BuchArena</h1>
        <p className="mt-2 mb-4">
          {account ? "Du bist bereits eingeloggt." : "Registrieren oder einloggen"}
        </p>

        {account ? (
          <div className="mt-4 grid gap-1 text-sm">
            <p>Eingeloggt als <strong>{account.username}</strong> ({account.role})</p>
            <Link href="/profil" className="btn">Zum Profil</Link>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`btn ${mode === "login" ? "font-bold" : ""}`}
                onClick={() => setMode("login")}
              >
                Einloggen
              </button>
              <button
                type="button"
                className={`btn ${mode === "register" ? "font-bold" : ""}`}
                onClick={() => setMode("register")}
              >
                Registrieren
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-3">
              <label className="grid gap-1 text-[0.95rem]">
                E-Mail oder Benutzername
                <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>

              {mode === "register" && (
                <label className="grid gap-1 text-[0.95rem]">
                  E-Mail
                  <input className="input-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
              )}

              <label className="grid gap-1 text-[0.95rem]">
                Passwort
                <input className="input-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>

              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? "Bitte warten ..." : mode === "login" ? "Einloggen" : "Registrieren"}
              </button>
            </form>
          </>
        )}

        <p className={`mt-3.5 min-h-[1.3rem] ${isError ? "text-red-700" : ""}`}>{message}</p>
      </section>
    </main>
  );
}
