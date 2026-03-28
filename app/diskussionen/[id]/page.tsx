"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type ReactionItem = {
  username: string;
  emoji: string;
};

type ReplyItem = {
  id: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  reactions: ReactionItem[];
  parentReplyId?: string | null;
  hasProfile?: boolean;
  hasSpeakerProfile?: boolean;
  hasBloggerProfile?: boolean;
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
  reactions: ReactionItem[];
  hasProfile?: boolean;
  hasSpeakerProfile?: boolean;
  hasBloggerProfile?: boolean;
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

function RoleBadges({ username, hasProfile, hasSpeakerProfile, hasBloggerProfile }: { username: string; hasProfile?: boolean; hasSpeakerProfile?: boolean; hasBloggerProfile?: boolean }) {
  const badges: { label: string; href: string }[] = [];
  if (hasProfile) badges.push({ label: "Autor", href: `/autor/${encodeURIComponent(username)}` });
  if (hasBloggerProfile) badges.push({ label: "Blogger", href: `/blogger/${encodeURIComponent(username)}` });
  if (hasSpeakerProfile) badges.push({ label: "Sprecher", href: `/sprecher/${encodeURIComponent(username)}` });
  if (badges.length === 0) return null;
  return (
    <span className="text-xs text-arena-muted">
      ({badges.map((b, i) => (
        <span key={b.label}>
          {i > 0 && ", "}
          <Link
            href={b.href}
            className="underline hover:text-arena-text"
          >
            {b.label}
          </Link>
        </span>
      ))})
    </span>
  );
}

function ReactionBar({
  reactions,
  emojis,
  username,
  onReact,
}: {
  reactions: ReactionItem[];
  emojis: string[];
  username: string;
  onReact: (emoji: string) => void;
}) {
  // Group reactions by emoji
  const grouped = new Map<string, string[]>();
  for (const r of reactions) {
    const list = grouped.get(r.emoji) ?? [];
    list.push(r.username);
    grouped.set(r.emoji, list);
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
      {/* Existing reactions */}
      {[...grouped.entries()].map(([emoji, users]) => {
        const active = users.includes(username);
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            title={users.join(", ")}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border cursor-pointer transition-colors ${
              active
                ? "bg-arena-blue/10 border-arena-blue text-arena-blue"
                : "bg-gray-50 border-arena-border-light text-arena-text hover:bg-gray-100"
            }`}
          >
            <span>{emoji}</span>
            <span className="text-xs font-medium">{users.length}</span>
          </button>
        );
      })}

      {/* Add reaction picker */}
      <EmojiPicker emojis={emojis} grouped={grouped} onReact={onReact} />
    </div>
  );
}

function EmojiPicker({
  emojis,
  grouped,
  onReact,
}: {
  emojis: string[];
  grouped: Map<string, string[]>;
  onReact: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-arena-border-light bg-transparent cursor-pointer text-arena-muted hover:bg-gray-100 hover:text-arena-text transition-colors"
        title="Reaktion hinzufügen"
      >
        +
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 flex gap-1 bg-white border border-arena-border-light rounded-lg p-1.5 shadow-lg z-10">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                setOpen(false);
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-md cursor-pointer border-none text-lg transition-colors ${
                grouped.has(emoji) ? "bg-arena-blue/10" : "bg-transparent hover:bg-gray-100"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);

  // Editing state for the discussion itself
  const [isEditingDiscussion, setIsEditingDiscussion] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👎"];

  async function handleReact(emoji: string, replyId?: string) {
    try {
      const payload: { discussionId: string; emoji: string; replyId?: string } = {
        discussionId,
        emoji,
      };
      if (replyId) payload.replyId = replyId;

      const response = await fetch("/api/discussions/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadDiscussion();
      }
    } catch { /* ignore */ }
  }

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
      const payload: { discussionId: string; authorUsername: string; body: string; parentReplyId?: string } = {
        discussionId,
        authorUsername: username,
        body: replyBody.trim(),
      };
      if (replyingTo) payload.parentReplyId = replyingTo.id;

      const response = await fetch("/api/discussions/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Antworten.");
      }

      setReplyBody("");
      setReplyingTo(null);
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
        <section className="card">
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
      <section className="card">
        <Link href="/diskussionen" className="btn btn-sm inline-block mb-4">
          ← Zurück zur Übersicht
        </Link>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Diskussion ...</p>
        ) : !discussion ? (
          <p>Diskussion nicht gefunden.</p>
        ) : (
          <>
            {/* Discussion topic */}
            <article className="grid gap-3">
              <div className="grid gap-1">
                <h1>{discussion.title}</h1>
                <div className="flex items-center justify-between gap-2 text-sm text-arena-muted">
                  <span>
                    von <strong>{discussion.authorUsername}</strong>{" "}
                    <RoleBadges username={discussion.authorUsername} hasProfile={discussion.hasProfile} hasSpeakerProfile={discussion.hasSpeakerProfile} hasBloggerProfile={discussion.hasBloggerProfile} />
                  </span>
                  <span className="text-xs text-arena-muted">
                    {timeAgo(discussion.createdAt)}
                  </span>
                </div>
              </div>

              <div
                className="mt-1 text-[0.95rem] leading-relaxed [overflow-wrap:break-word]" style={{ wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{
                  __html: formatBody(discussion.body),
                }}
              />

              {discussion.authorUsername === username && (
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn btn-sm"
                    onClick={openEditDiscussion}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={handleDeleteDiscussion}
                  >
                    Löschen
                  </button>
                </div>
              )}

              {/* Reactions on the discussion */}
              <ReactionBar
                reactions={discussion.reactions}
                emojis={EMOJIS}
                username={username}
                onReact={(emoji) => handleReact(emoji)}
              />
            </article>

            {/* Replies */}
            <div className="grid gap-3 mt-4">
              <h2>
                {discussion.replies.length}{" "}
                {discussion.replies.length === 1 ? "Antwort" : "Antworten"}
              </h2>

              {discussion.replies.length === 0 ? (
                <p className="text-arena-muted">
                  Noch keine Antworten. Sei der Erste!
                </p>
              ) : (
                <div className="grid gap-3">
                  {(() => {
                    // Build tree: top-level + children
                    const topLevel = discussion.replies.filter((r) => !r.parentReplyId);
                    const childrenMap = new Map<string, ReplyItem[]>();
                    for (const r of discussion.replies) {
                      if (r.parentReplyId) {
                        const list = childrenMap.get(r.parentReplyId) ?? [];
                        list.push(r);
                        childrenMap.set(r.parentReplyId, list);
                      }
                    }

                    function renderReply(reply: ReplyItem, depth: number) {
                      const children = childrenMap.get(reply.id) ?? [];
                      return (
                        <div key={reply.id} style={{ marginLeft: depth > 0 ? Math.min(depth * 20, 60) : 0 }}>
                          <article className="rounded-lg border border-arena-border-light p-3 ml-3 sm:ml-6">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span>
                                <strong>{reply.authorUsername}</strong>{" "}
                                <RoleBadges username={reply.authorUsername} hasProfile={reply.hasProfile} hasSpeakerProfile={reply.hasSpeakerProfile} hasBloggerProfile={reply.hasBloggerProfile} />
                              </span>
                              <span className="text-xs text-arena-muted">
                                {timeAgo(reply.createdAt)}
                              </span>
                            </div>
                            <div
                              className="mt-1 text-[0.95rem] leading-relaxed [overflow-wrap:break-word]" style={{ wordBreak: "break-word" }}
                              dangerouslySetInnerHTML={{
                                __html: formatBody(reply.body),
                              }}
                            />
                            <div className="flex gap-2 mt-3 items-center">
                              <button
                                className="btn btn-sm text-xs"
                                onClick={() => {
                                  setReplyingTo({ id: reply.id, author: reply.authorUsername });
                                  setTimeout(() => document.getElementById("reply-form")?.scrollIntoView({ behavior: "smooth" }), 100);
                                }}
                              >
                                Antworten
                              </button>
                              {reply.authorUsername === username && (
                                <button
                                  className="btn btn-sm btn-danger text-xs"
                                  onClick={() => handleDeleteReply(reply.id)}
                                >
                                  Löschen
                                </button>
                              )}
                            </div>

                            {/* Reactions on reply */}
                            <ReactionBar
                              reactions={reply.reactions}
                              emojis={EMOJIS}
                              username={username}
                              onReact={(emoji) => handleReact(emoji, reply.id)}
                            />
                          </article>
                          {children.length > 0 && (
                            <div className="grid gap-3 mt-3">
                              {children.map((child) => renderReply(child, depth + 1))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return topLevel.map((reply) => renderReply(reply, 0));
                  })()}
                </div>
              )}

              {/* Reply form */}
              <div id="reply-form" className="grid gap-2 mt-4">
                <h3>Antworten</h3>
                {replyingTo && (
                  <div className="flex items-center gap-2 text-sm text-arena-muted bg-gray-50 rounded-lg px-3 py-2">
                    <span>Antwort auf <strong>{replyingTo.author}</strong></span>
                    <button
                      className="btn btn-sm text-xs"
                      onClick={() => setReplyingTo(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <p className="text-xs text-arena-muted">
                  Formatierung: **fett**, *kursiv*, [Linktext](URL) und direkte
                  URLs werden erkannt.
                </p>
                <textarea
                  className="input-base"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  maxLength={3000}
                  rows={5}
                  placeholder="Deine Antwort ..."
                />
                <button
                  className="btn"
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
            className="w-[min(660px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Diskussion bearbeiten</h2>

            <label className="grid gap-1 text-[0.95rem]">
              Titel
              <input
                className="input-base"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
              />
            </label>

            <label className="grid gap-1 text-[0.95rem]">
              Beschreibung
              <textarea
                className="input-base"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={5000}
                rows={8}
              />
            </label>

            <div className="flex gap-2 justify-end">
              <button
                className="btn"
                onClick={handleUpdateDiscussion}
                disabled={
                  isUpdating || !editTitle.trim() || !editBody.trim()
                }
              >
                {isUpdating ? "Wird gespeichert ..." : "Speichern"}
              </button>
              <button
                className="btn"
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
