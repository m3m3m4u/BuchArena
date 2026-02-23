"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type DiscussionItem = {
  id: string;
  authorUsername: string;
  title: string;
  body: string;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
};

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tag${days > 1 ? "en" : ""}`;

  const months = Math.floor(days / 30);
  return `vor ${months} Monat${months > 1 ? "en" : ""}`;
}

export default function DiskussionenPage() {
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const account = getStoredAccount();
    if (account) {
      setUsername(account.username);
    }
  }, []);

  const loadDiscussions = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/discussions/list", { method: "GET" });
      const data = (await response.json()) as {
        discussions?: DiscussionItem[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Laden.");
      }

      setDiscussions(data.discussions ?? []);
    } catch {
      setMessage("Diskussionen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiscussions();
  }, [loadDiscussions]);

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/discussions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorUsername: username,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Erstellen.");
      }

      setTitle("");
      setBody("");
      setShowOverlay(false);
      await loadDiscussions();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Diskussion konnte nicht erstellt werden."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="profile-card">
          <h1>Diskussionen</h1>
          <p>
            Bitte <Link href="/auth">melde dich an</Link>, um an Diskussionen
            teilzunehmen.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="profile-card">
        <div className="support-header-row">
          <h1>Diskussionen</h1>
          <button className="footer-button" onClick={() => setShowOverlay(true)}>
            Neues Thema
          </button>
        </div>

        {message && <p className="message error">{message}</p>}

        {isLoading ? (
          <p>Lade Diskussionen ...</p>
        ) : discussions.length === 0 ? (
          <p>Noch keine Diskussionen vorhanden. Starte das erste Thema!</p>
        ) : (
          <div className="discussion-list">
            {discussions.map((d) => (
              <Link
                key={d.id}
                href={`/diskussionen/${d.id}`}
                className="discussion-card"
              >
                <div className="discussion-card-header">
                  <strong>{d.title}</strong>
                  <span className="discussion-meta">
                    {d.replyCount} {d.replyCount === 1 ? "Antwort" : "Antworten"}
                  </span>
                </div>
                <div className="discussion-card-info">
                  <span>von {d.authorUsername}</span>
                  <span className="discussion-meta">
                    Letzte Aktivität: {timeAgo(d.lastActivityAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {showOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowOverlay(false)}>
          <div className="support-overlay" onClick={(e) => e.stopPropagation()}>
            <h2>Neues Diskussionsthema</h2>

            <label>
              Titel
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Worum soll diskutiert werden?"
              />
            </label>

            <label>
              Beschreibung
              <p className="support-hint">
                Formatierung: **fett**, *kursiv*, [Linktext](URL) und direkte URLs
                werden erkannt.
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={8}
                placeholder="Beschreibe das Thema genauer ..."
              />
            </label>

            <div className="support-overlay-actions">
              <button
                className="footer-button"
                onClick={handleCreate}
                disabled={isSaving || !title.trim() || !body.trim()}
              >
                {isSaving ? "Wird erstellt ..." : "Thema erstellen"}
              </button>
              <button
                className="footer-button"
                onClick={() => setShowOverlay(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
