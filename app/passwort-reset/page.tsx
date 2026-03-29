"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data.message ?? "Fehler bei der Anfrage.");
      } else {
        setSuccess(true);
        setMessage(data.message);
      }
    } catch {
      setIsError(true);
      setMessage("Server nicht erreichbar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="grid gap-3">
        <p className="text-red-700">Kein gültiger Token vorhanden.</p>
        <Link href="/passwort-vergessen" className="btn text-center">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }

  return success ? (
    <div className="grid gap-3">
      <p className="text-green-700">{message}</p>
      <Link href="/auth" className="btn text-center">
        Zum Login
      </Link>
    </div>
  ) : (
    <>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-[0.95rem]">
          Neues Passwort
          <input
            className="input-base"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        <label className="grid gap-1 text-[0.95rem]">
          Passwort bestätigen
          <input
            className="input-base"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="btn" disabled={isLoading}>
          {isLoading ? "Bitte warten ..." : "Passwort speichern"}
        </button>
      </form>

      <p className={`mt-3.5 min-h-[1.3rem] ${isError ? "text-red-700" : ""}`}>
        {message}
      </p>
    </>
  );
}

export default function PasswortResetPage() {
  return (
    <main className="auth-centered-main">
      <section className="w-full max-w-[520px] rounded-xl bg-white p-5 box-border">
        <h1>Neues Passwort setzen</h1>
        <p className="mt-2 mb-4">Wähle ein neues Passwort für dein Konto.</p>

        <Suspense fallback={<p>Laden...</p>}>
          <ResetForm />
        </Suspense>
      </section>
    </main>
  );
}
