"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";

type SupportPostItem = {
  id: string;
  authorUsername: string;
  title: string;
  body: string;
  createdAt: string;
};

function formatBody(text: string) {
  // Simple formatting: **bold**, *italic*, [link](url), newlines
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const formatted = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    )
    .replace(
      /(^|[^"(])(https?:\/\/[^\s<]+)/g,
      '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>'
    )
    .replace(/\n/g, "<br />");

  return formatted;
}

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

export default function SupportPage() {
  const [posts, setPosts] = useState<SupportPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/support/list", { method: "GET" });
      const data = (await response.json()) as {
        posts?: SupportPostItem[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Laden.");
      }

      setPosts(data.posts ?? []);
    } catch {
      setMessage("Beiträge konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function handleCreate() {
    if (!title.trim() || !body.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = editingId ? "/api/support/update" : "/api/support/create";
      const payload = editingId
        ? { id: editingId, authorUsername: username, title: title.trim(), body: body.trim() }
        : { authorUsername: username, title: title.trim(), body: body.trim() };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Speichern.");
      }

      setTitle("");
      setBody("");
      setEditingId(null);
      setShowOverlay(false);
      await loadPosts();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Beitrag konnte nicht gespeichert werden."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setShowOverlay(true);
  }

  function openEdit(post: SupportPostItem) {
    setEditingId(post.id);
    setTitle(post.title);
    setBody(post.body);
    setShowOverlay(true);
  }

  async function handleDelete(postId: string) {
    try {
      const response = await fetch("/api/support/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, authorUsername: username }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Löschen.");
      }

      await loadPosts();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Beitrag konnte nicht gelöscht werden."
      );
    }
  }

  return (
    <main className="top-centered-main">
      <section className="profile-card">
        <div className="support-header-row">
          <h1>Support</h1>
          {username && (
            <button className="footer-button" onClick={openNew}>
              Neuer Beitrag
            </button>
          )}
        </div>

        {message && <p className="message error">{message}</p>}

        {isLoading ? (
          <p>Lade Beiträge ...</p>
        ) : posts.length === 0 ? (
          <p>Noch keine Support-Beiträge vorhanden.</p>
        ) : (
          <div className="support-list">
            {posts.map((post) => (
              <article key={post.id} className="support-post">
                <div className="support-post-header">
                  <strong>{post.authorUsername}</strong>
                  <span className="support-post-time">{timeAgo(post.createdAt)}</span>
                </div>
                <h3>{post.title}</h3>
                <div
                  className="support-post-body"
                  dangerouslySetInnerHTML={{ __html: formatBody(post.body) }}
                />
                {post.authorUsername === username && (
                  <div className="support-post-actions">
                    <button className="footer-button small" onClick={() => openEdit(post)}>
                      Bearbeiten
                    </button>
                    <button className="footer-button small danger" onClick={() => handleDelete(post.id)}>
                      Löschen
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowOverlay(false)}>
          <div className="support-overlay" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Beitrag bearbeiten" : "Neuer Support-Beitrag"}</h2>

            <label>
              Titel
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Worum geht es?"
              />
            </label>

            <label>
              Text
              <p className="support-hint">
                Formatierung: **fett**, *kursiv*, [Linktext](URL) und direkte URLs werden erkannt.
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={8}
                placeholder="Beschreibe dein Anliegen ... &#10;&#10;**fett**, *kursiv*, [Linktext](https://...) erlaubt"
              />
            </label>

            <div className="support-overlay-actions">
              <button
                className="footer-button"
                onClick={handleCreate}
                disabled={isSaving || !title.trim() || !body.trim()}
              >
                {isSaving ? "Wird gespeichert ..." : editingId ? "Speichern" : "Absenden"}
              </button>
              <button className="footer-button" onClick={() => setShowOverlay(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
