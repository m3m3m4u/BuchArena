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
          <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight mb-1">BuchArena</h1>
          <p className="font-sans text-arena-muted text-sm mt-1">
            {account ? "Du bist bereits eingeloggt." : "Die Community für Autoren, Sprecher & Leser"}
          </p>
        </div>

        {account ? (
          <div className="mt-4 grid gap-3 text-sm w-full text-center">
            <p className="font-sans">Eingeloggt als <strong className="font-sans">{account.username}</strong> ({account.role})</p>
            <Link href="/profil" className="btn btn-primary w-full font-sans">Zum Profil</Link>
          </div>
        ) : (
          <>
            <div className="segmented-control w-full mb-6">
              <button
                type="button"
                className={`segmented-control-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Einloggen
              </button>
              <button
                type="button"
                className={`segmented-control-btn ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                Registrieren
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4 w-full">
              <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-2">
                E-Mail oder Benutzername
                <input className="input-base font-normal" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>

              {mode === "register" && (
                <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-2">
                  E-Mail
                  <input className="input-base font-normal" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
              )}

              <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-2">
                Passwort
                <input className="input-base font-normal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>

              {mode === "login" && (
                <Link href="/passwort-vergessen" className="font-sans text-arena-link hover:underline text-sm justify-self-end mt-1.5">
                  Passwort vergessen?
                </Link>
              )}

              {mode === "register" && (
                <div className="grid gap-2.5 my-1">
                  <label className="font-sans flex items-start gap-2.5 text-[0.85rem] leading-snug cursor-pointer text-arena-muted">
                    <input
                      type="checkbox"
                      checked={newsletterOptIn}
                      onChange={(e) => setNewsletterOptIn(e.target.checked)}
                      className="mt-0.5 accent-arena-blue"
                    />
                    <span>Ich möchte den Newsletter erhalten und über Neuigkeiten informiert werden.</span>
                  </label>
                  <label className="font-sans flex items-start gap-2.5 text-[0.85rem] leading-snug cursor-pointer text-arena-muted">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-0.5 accent-arena-blue"
                      required
                    />
                    <span>
                      Ich habe die{" "}
                      <Link href="/impressum#datenschutz" target="_blank" className="text-arena-link hover:underline font-sans">
                        Datenschutzerklärung
                      </Link>{" "}
                      gelesen und stimme der Verarbeitung meiner Daten zu.
                    </span>
                  </label>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full mt-4 font-sans" disabled={isLoading || (mode === "register" && !privacyAccepted)}>
                {isLoading ? "Bitte warten ..." : mode === "login" ? "Einloggen" : "Registrieren"}
              </button>
            </form>
          </>
        )}

        {message && (
          <div className={`font-sans mt-4 p-3 rounded-lg text-sm text-center w-full ${isError ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
            {message}
          </div>
        )}
      </section>
    </main>
  );
}
