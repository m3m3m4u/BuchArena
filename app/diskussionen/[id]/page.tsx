"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type ReplyItem = {
  id: string;
  authorUsername: string;
  body: string;
  createdAt: string;
};

type DiscussionDetail = {
  id: string;
  authorUsername: string;
  title: string;
  body: string;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  replies: ReplyItem[];
};

function formatBody(text: string) {
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

export default function DiskussionDetailPage() {
  const params = useParams();
  const discussionId = params.id as string;

  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [username, setUsername] = useState("");

  // Editing state for the discussion itself
  const [isEditingDiscussion, setIsEditingDiscussion] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const account = getStoredAccount();
    if (account) {
      setUsername(account.username);
    }
  }, []);

  const loadDiscussion = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/discussions/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: discussionId }),
      });

      const data = (await response.json()) as {
        discussion?: DiscussionDetail;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Laden.");
      }

      setDiscussion(data.discussion ?? null);
    } catch {
      setMessage("Diskussion konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [discussionId]);

  useEffect(() => {
    void loadDiscussion();
  }, [loadDiscussion]);

  async function handleReply() {
    if (!replyBody.trim()) return;

    setIsSending(true);

    try {
      const response = await fetch("/api/discussions/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussionId,
          authorUsername: username,
          body: replyBody.trim(),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Antworten.");
      }

      setReplyBody("");
      await loadDiscussion();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Antwort konnte nicht gesendet werden."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      const response = await fetch("/api/discussions/delete-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discussionId,
          replyId,
          authorUsername: username,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Löschen.");
      }

      await loadDiscussion();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Antwort konnte nicht gelöscht werden."
      );
    }
  }

  async function handleDeleteDiscussion() {
    try {
      const response = await fetch("/api/discussions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: discussionId,
          authorUsername: username,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Löschen.");
      }

      window.location.href = "/diskussionen";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Diskussion konnte nicht gelöscht werden."
      );
    }
  }

  function openEditDiscussion() {
    if (!discussion) return;
    setEditTitle(discussion.title);
    setEditBody(discussion.body);
    setIsEditingDiscussion(true);
  }

  async function handleUpdateDiscussion() {
    if (!editTitle.trim() || !editBody.trim()) return;
    setIsUpdating(true);

    try {
      const response = await fetch("/api/discussions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: discussionId,
          authorUsername: username,
          title: editTitle.trim(),
          body: editBody.trim(),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Aktualisieren.");
      }

      setIsEditingDiscussion(false);
      await loadDiscussion();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Diskussion konnte nicht aktualisiert werden."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="profile-card">
          <h1>Diskussion</h1>
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
        <Link href="/diskussionen" className="footer-button small" style={{ marginBottom: "1rem", display: "inline-block" }}>
          ← Zurück zur Übersicht
        </Link>

        {message && <p className="message error">{message}</p>}

        {isLoading ? (
          <p>Lade Diskussion ...</p>
        ) : !discussion ? (
          <p>Diskussion nicht gefunden.</p>
        ) : (
          <>
            {/* Discussion topic */}
            <article className="discussion-topic">
              <div className="discussion-topic-header">
                <h1>{discussion.title}</h1>
                <div className="discussion-card-info">
                  <span>
                    von <strong>{discussion.authorUsername}</strong>
                  </span>
                  <span className="discussion-meta">
                    {timeAgo(discussion.createdAt)}
                  </span>
                </div>
              </div>

              <div
                className="support-post-body"
                dangerouslySetInnerHTML={{
                  __html: formatBody(discussion.body),
                }}
              />

              {discussion.authorUsername === username && (
                <div className="support-post-actions">
                  <button
                    className="footer-button small"
                    onClick={openEditDiscussion}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="footer-button small danger"
                    onClick={handleDeleteDiscussion}
                  >
                    Löschen
                  </button>
                </div>
              )}
            </article>

            {/* Replies */}
            <div className="discussion-replies-section">
              <h2>
                {discussion.replies.length}{" "}
                {discussion.replies.length === 1 ? "Antwort" : "Antworten"}
              </h2>

              {discussion.replies.length === 0 ? (
                <p className="discussion-no-replies">
                  Noch keine Antworten. Sei der Erste!
                </p>
              ) : (
                <div className="discussion-replies">
                  {discussion.replies.map((reply) => (
                    <article key={reply.id} className="discussion-reply">
                      <div className="support-post-header">
                        <strong>{reply.authorUsername}</strong>
                        <span className="support-post-time">
                          {timeAgo(reply.createdAt)}
                        </span>
                      </div>
                      <div
                        className="support-post-body"
                        dangerouslySetInnerHTML={{
                          __html: formatBody(reply.body),
                        }}
                      />
                      {reply.authorUsername === username && (
                        <div className="support-post-actions">
                          <button
                            className="footer-button small danger"
                            onClick={() => handleDeleteReply(reply.id)}
                          >
                            Löschen
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <div className="discussion-reply-form">
                <h3>Antworten</h3>
                <p className="support-hint">
                  Formatierung: **fett**, *kursiv*, [Linktext](URL) und direkte
                  URLs werden erkannt.
                </p>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  maxLength={3000}
                  rows={5}
                  placeholder="Deine Antwort ..."
                />
                <button
                  className="footer-button"
                  onClick={handleReply}
                  disabled={isSending || !replyBody.trim()}
                >
                  {isSending ? "Wird gesendet ..." : "Antworten"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Edit discussion overlay */}
      {isEditingDiscussion && (
        <div
          className="overlay-backdrop"
          onClick={() => setIsEditingDiscussion(false)}
        >
          <div
            className="support-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Diskussion bearbeiten</h2>

            <label>
              Titel
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
              />
            </label>

            <label>
              Beschreibung
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={5000}
                rows={8}
              />
            </label>

            <div className="support-overlay-actions">
              <button
                className="footer-button"
                onClick={handleUpdateDiscussion}
                disabled={
                  isUpdating || !editTitle.trim() || !editBody.trim()
                }
              >
                {isUpdating ? "Wird gespeichert ..." : "Speichern"}
              </button>
              <button
                className="footer-button"
                onClick={() => setIsEditingDiscussion(false)}
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
