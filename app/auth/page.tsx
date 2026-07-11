"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAccount, setStoredAccount } from "@/lib/client-account";
import { showLesezeichenToast } from "@/app/components/lesezeichen-toast";

type Mode = "login" | "register";
type ApiResponse = {
  message: string;
  lesezeichen?: number;
  user?: { username: string; email: string; role: "USER" | "SUPERADMIN" };
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState(() => getStoredAccount());
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { identifier: username, password }
        : { username, email, password, newsletterOptIn };

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
        if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);
        router.push("/");
        return;
      }

      setMessage(data.message);
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
      <section className="w-full max-w-[480px] rounded-2xl bg-white p-6 sm:p-8 box-border border border-arena-border-light shadow-sm flex flex-col items-center">
        <div className="flex flex-col items-center mb-6 text-center w-full">
          <img src="/logo.png" alt="BuchArena Logo" className="h-16 w-16 rounded-full mb-3 shadow-xs" />
          <h1 className="text-2xl font-bold text-arena-blue">BuchArena</h1>
          <p className="text-arena-muted text-sm mt-1">
            {account ? "Du bist bereits eingeloggt." : "Die Community für Autoren, Sprecher & Leser"}
          </p>
        </div>

        {account ? (
          <div className="mt-4 grid gap-3 text-sm w-full text-center">
            <p>Eingeloggt als <strong>{account.username}</strong> ({account.role})</p>
            <Link href="/profil" className="btn btn-primary w-full">Zum Profil</Link>
          </div>
        ) : (
          <>
            <div className="mb-6 p-1 bg-arena-bg rounded-xl grid grid-cols-2 gap-1 border border-arena-border-light w-full">
              <button
                type="button"
                className={`py-2 px-3 rounded-lg text-sm transition-all cursor-pointer ${mode === "login" ? "bg-white text-arena-blue font-bold shadow-xs border border-arena-border-light/40" : "text-arena-muted hover:text-arena-blue font-medium bg-transparent border border-transparent"}`}
                onClick={() => setMode("login")}
              >
                Einloggen
              </button>
              <button
                type="button"
                className={`py-2 px-3 rounded-lg text-sm transition-all cursor-pointer ${mode === "register" ? "bg-white text-arena-blue font-bold shadow-xs border border-arena-border-light/40" : "text-arena-muted hover:text-arena-blue font-medium bg-transparent border border-transparent"}`}
                onClick={() => setMode("register")}
              >
                Registrieren
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4 w-full">
              <label className="grid gap-1 text-[0.95rem] text-arena-text">
                E-Mail oder Benutzername
                <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>

              {mode === "register" && (
                <label className="grid gap-1 text-[0.95rem] text-arena-text">
                  E-Mail
                  <input className="input-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
              )}

              <label className="grid gap-1 text-[0.95rem] text-arena-text">
                Passwort
                <input className="input-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>

              {mode === "login" && (
                <Link href="/passwort-vergessen" className="text-arena-link hover:underline text-sm justify-self-end">
                  Passwort vergessen?
                </Link>
              )}

              {mode === "register" && (
                <div className="grid gap-2.5 my-1">
                  <label className="flex items-start gap-2.5 text-[0.85rem] leading-snug cursor-pointer text-arena-muted">
                    <input
                      type="checkbox"
                      checked={newsletterOptIn}
                      onChange={(e) => setNewsletterOptIn(e.target.checked)}
                      className="mt-0.5 accent-arena-blue"
                    />
                    <span>Ich möchte den Newsletter erhalten und über Neuigkeiten informiert werden.</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-[0.85rem] leading-snug cursor-pointer text-arena-muted">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-0.5 accent-arena-blue"
                      required
                    />
                    <span>
                      Ich habe die{" "}
                      <Link href="/impressum#datenschutz" target="_blank" className="text-arena-link hover:underline">
                        Datenschutzerklärung
                      </Link>{" "}
                      gelesen und stimme der Verarbeitung meiner Daten zu.
                    </span>
                  </label>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full mt-2" disabled={isLoading || (mode === "register" && !privacyAccepted)}>
                {isLoading ? "Bitte warten ..." : mode === "login" ? "Einloggen" : "Registrieren"}
              </button>
            </form>
          </>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm text-center w-full ${isError ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
            {message}
          </div>
        )}
      </section>
    </main>
  );
}
