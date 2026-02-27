"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";

export default function KurzGefragtPage() {
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const acc = getStoredAccount();
    if (acc) {
      setUsername(acc.username);
      setIsAdmin(acc.role === "SUPERADMIN");
    }
  }, []);

  const loadSurvey = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bucharena/kurz-gefragt");
      const data = (await res.json()) as { questions?: string[]; answers?: Record<string, string> };
      if (data.questions) setQuestions(data.questions);
      if (data.answers) setAnswers(data.answers);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) void loadSurvey();
  }, [username, loadSurvey]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/bucharena/kurz-gefragt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as { message?: string; answers?: Record<string, string> };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Speichern.");
      if (data.answers) setAnswers(data.answers);
      setMessage("✓ Gespeichert!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <p>
            Bitte <Link href="/auth">anmelden</Link>, um an der Umfrage teilzunehmen.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold m-0">Kurz gefragt</h1>
            <p className="text-arena-muted text-sm mt-0.5 m-0">
              Beantworte die Fragen am besten mit einem Satz oder Halbsatz – wir machen daraus Social-Media-Beiträge. Du musst nicht alle Fragen beantworten.
            </p>
          </div>
          <Link href="/social-media" className="btn btn-sm">← Zurück</Link>
        </div>

        {isAdmin && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
            <span className="text-sm text-blue-900">Admin: Alle Antworten als Excel herunterladen</span>
            <a href="/api/bucharena/kurz-gefragt/export" className="btn btn-sm btn-primary" download>
              📥 XLSX Download
            </a>
          </div>
        )}

        {loading ? (
          <p className="text-arena-muted mt-3">Lade Umfrage …</p>
        ) : (
          <div className="flex flex-col gap-4 mt-4">
            {questions.map((q, i) => (
              <label key={i} className="block">
                <span className="text-sm font-semibold">
                  {i + 1}. {q}
                </span>
                <input
                  type="text"
                  className="input-base w-full mt-1"
                  placeholder="Deine Antwort …"
                  maxLength={500}
                  value={answers[q] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                  }
                />
              </label>
            ))}

            {message && (
              <p className={`text-sm ${message.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>
                {message}
              </p>
            )}

            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Speichere …" : "Antworten speichern"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
