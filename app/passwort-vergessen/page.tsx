"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data.message ?? "Fehler bei der Anfrage.");
      } else {
        setSent(true);
        setMessage(data.message);
      }
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
        <h1>Passwort vergessen</h1>
        <p className="mt-2 mb-4">
          Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
        </p>

        {sent ? (
          <div className="grid gap-3">
            <p className="text-green-700">{message}</p>
            <Link href="/auth" className="btn text-center">
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3">
            <label className="grid gap-1 text-[0.95rem]">
              E-Mail-Adresse
              <input
                className="input-base"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? "Bitte warten ..." : "Link senden"}
            </button>
          </form>
        )}

        <p className={`mt-3.5 min-h-[1.3rem] ${isError ? "text-red-700" : ""}`}>
          {!sent && message}
        </p>

        <Link href="/auth" className="text-arena-link hover:underline text-sm mt-2 inline-block">
          Zurück zum Login
        </Link>
      </section>
    </main>
  );
}
