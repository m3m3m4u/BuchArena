"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getStoredAccount } from "@/lib/client-account";

type MessageItem = {
  id: string;
  senderUsername: string;
  recipientUsername: string;
  subject: string;
  body: string;
  read: boolean;
  readAt: string | null;
  threadId: string | null;
  unreadInThread?: number;
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NachrichtenPage() {
  const [username, setUsername] = useState("");
  const [threads, setThreads] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");

  // Thread-Ansicht
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageItem[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadSubject, setThreadSubject] = useState("");
  const [threadPartner, setThreadPartner] = useState("");

  // Antwort inline im Thread
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");

  // Compose state (neue Nachricht)
  const [showCompose, setShowCompose] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeMessage, setComposeMessage] = useState("");

  useEffect(() => {
    const account = getStoredAccount();
    if (account) setUsername(account.username);
  }, []);

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/list?folder=${folder}`, { method: "GET" });
      const data = (await res.json()) as { messages?: MessageItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Laden.");
      setThreads(data.messages ?? []);
    } catch {
      setError("Nachrichten konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    if (username) void loadThreads();
  }, [username, loadThreads]);

  async function openThread(msg: MessageItem) {
    const tid = msg.threadId ?? msg.id;
    setOpenThreadId(tid);
    setThreadSubject(msg.subject.replace(/^Re:\s*/i, ""));
    setThreadPartner(
      folder === "inbox" ? msg.senderUsername : msg.recipientUsername,
    );
    setReplyBody("");
    setSendMessage("");
    setThreadLoading(true);

    try {
      const res = await fetch(`/api/messages/list?threadId=${tid}`);
      const data = (await res.json()) as { messages?: MessageItem[] };
      const msgs = data.messages ?? [];
      setThreadMessages(msgs);

      // Ungelesene Nachrichten in diesem Thread als gelesen markieren
      const unread = msgs.filter((m) => !m.read && m.recipientUsername === username);
      for (const m of unread) {
        fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: m.id }),
        }).catch(() => {});
      }

      // Lokalen State aktualisieren
      if (unread.length > 0) {
        setThreadMessages((prev) =>
          prev.map((m) =>
            m.recipientUsername === username && !m.read
              ? { ...m, read: true, readAt: new Date().toISOString() }
              : m,
          ),
        );
        setThreads((prev) =>
          prev.map((t) =>
            (t.threadId ?? t.id) === tid ? { ...t, read: true, unreadInThread: 0 } : t,
          ),
        );
      }
    } catch {
      setThreadMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleSendReply() {
    if (!replyBody.trim() || !openThreadId) return;
    setIsSending(true);
    setSendMessage("");
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: threadPartner,
          subject: threadSubject.startsWith("Re: ") ? threadSubject : `Re: ${threadSubject}`,
          body: replyBody,
          threadId: openThreadId,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Senden fehlgeschlagen.");
      setReplyBody("");
      // Thread neu laden
      const res2 = await fetch(`/api/messages/list?threadId=${openThreadId}`);
      const data2 = (await res2.json()) as { messages?: MessageItem[] };
      setThreadMessages(data2.messages ?? []);
      void loadThreads();
    } catch (err) {
      setSendMessage(err instanceof Error ? err.message : "Fehler beim Senden.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleNewMessage() {
    setIsSending(true);
    setComposeMessage("");
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername, subject, body }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Senden fehlgeschlagen.");
      setComposeMessage("Nachricht gesendet!");
      setRecipientUsername("");
      setSubject("");
      setBody("");
      setTimeout(() => {
        setShowCompose(false);
        setComposeMessage("");
      }, 1200);
      void loadThreads();
    } catch (err) {
      setComposeMessage(err instanceof Error ? err.message : "Fehler beim Senden.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Nachricht wirklich löschen?")) return;
    try {
      const res = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Fehler beim Löschen.");
      }
      if (openThreadId) {
        setThreadMessages((prev) => prev.filter((m) => m.id !== id));
      }
      void loadThreads();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Löschen.");
    }
  }

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <p>Bitte <Link href="/auth">anmelden</Link>, um Nachrichten zu nutzen.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl">Nachrichten</h1>
          <button className="btn btn-primary" onClick={() => { setShowCompose(true); setComposeMessage(""); }}>
            Neue Nachricht
          </button>
        </div>

        {/* Folder tabs */}
        <div className="flex gap-2 mt-2">
          <button
            className={`btn btn-sm ${folder === "inbox" ? "btn-primary" : ""}`}
            onClick={() => { setFolder("inbox"); setOpenThreadId(null); }}
          >
            Posteingang
          </button>
          <button
            className={`btn btn-sm ${folder === "sent" ? "btn-primary" : ""}`}
            onClick={() => { setFolder("sent"); setOpenThreadId(null); }}
          >
            Gesendet
          </button>
        </div>

        {/* Thread-Ansicht */}
        {openThreadId && (
          <div className="overlay-backdrop" onClick={() => setOpenThreadId(null)}>
            <div className="card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg m-0">{threadSubject}</h2>
                  <p className="text-sm text-arena-muted m-0">
                    Konversation mit{" "}
                    <Link
                      href={`/autor/${threadPartner}`}
                      className="no-underline text-inherit hover:underline"
                    >
                      {threadPartner}
                    </Link>
                  </p>
                </div>
                <button className="btn btn-sm" onClick={() => setOpenThreadId(null)}>✕</button>
              </div>

              {threadLoading ? (
                <p className="text-arena-muted text-sm">Lade Konversation …</p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {threadMessages.map((msg) => {
                    const isMine = msg.senderUsername === username;
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 text-[0.95rem] ${
                          isMine
                            ? "bg-arena-blue text-white ml-6"
                            : "bg-gray-100 mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-xs font-semibold ${isMine ? "text-arena-yellow" : "text-arena-blue"}`}>
                            {isMine ? "Du" : msg.senderUsername}
                          </span>
                          <span className={`text-[10px] ${isMine ? "text-white/60" : "text-arena-muted"}`}>
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap m-0" style={{ lineHeight: 1.55 }}>
                          {msg.body}
                        </p>

                        {isMine && (
                          <div className="text-[10px] mt-1.5 text-right text-white/50">
                            {msg.read
                              ? `✓✓ Gelesen${msg.readAt ? ` · ${formatDate(msg.readAt)}` : ""}`
                              : "✓ Zugestellt"}
                          </div>
                        )}

                        <div className="flex justify-end mt-1">
                          <button
                            className={`text-[11px] border-none bg-transparent cursor-pointer ${
                              isMine ? "text-white/40 hover:text-white/80" : "text-arena-muted hover:text-arena-danger"
                            }`}
                            onClick={() => handleDelete(msg.id)}
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Antwortfeld */}
              <div className="border-t border-arena-border pt-3 mt-1">
                <textarea
                  className="input-base w-full"
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Antwort schreiben …"
                  maxLength={5000}
                />
                {sendMessage && (
                  <p className="text-sm text-red-700 mt-1">{sendMessage}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isSending || !replyBody.trim()}
                    onClick={handleSendReply}
                  >
                    {isSending ? "Sende …" : "Antworten"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Neue Nachricht Overlay */}
        {showCompose && (
          <div className="overlay-backdrop" onClick={() => setShowCompose(false)}>
            <div className="card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg m-0">Neue Nachricht</h2>
                <button className="btn btn-sm" onClick={() => setShowCompose(false)}>✕</button>
              </div>
              <label className="block mt-2">
                <span className="text-sm font-semibold">Empfänger (Benutzername)</span>
                <input
                  className="input-base w-full mt-1"
                  value={recipientUsername}
                  onChange={(e) => setRecipientUsername(e.target.value)}
                  placeholder="Benutzername eingeben"
                />
              </label>
              <label className="block mt-2">
                <span className="text-sm font-semibold">Betreff</span>
                <input
                  className="input-base w-full mt-1"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff eingeben"
                  maxLength={200}
                />
              </label>
              <label className="block mt-2">
                <span className="text-sm font-semibold">Nachricht</span>
                <textarea
                  className="input-base w-full mt-1"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Deine Nachricht ..."
                  maxLength={5000}
                />
              </label>
              {composeMessage && (
                <p className={`text-sm mt-1 ${composeMessage.includes("gesendet") ? "text-green-700" : "text-red-700"}`}>
                  {composeMessage}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button className="btn btn-primary" disabled={isSending} onClick={handleNewMessage}>
                  {isSending ? "Wird gesendet ..." : "Senden"}
                </button>
                <button className="btn" onClick={() => setShowCompose(false)}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {/* Thread-Liste */}
        {isLoading ? (
          <p>Lade Nachrichten ...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : threads.length === 0 ? (
          <p className="text-arena-muted">
            {folder === "inbox" ? "Dein Posteingang ist leer." : "Noch keine gesendeten Nachrichten."}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {threads.map((msg) => {
              const hasUnread = folder === "inbox" && (msg.unreadInThread ?? 0) > 0;
              return (
                <button
                  key={msg.id}
                  className="w-full text-left rounded-lg border border-arena-border-light px-4 py-3 bg-white hover:bg-[#fafafa] transition-colors cursor-pointer flex items-center gap-3"
                  style={{ fontWeight: hasUnread ? 700 : 400 }}
                  onClick={() => openThread(msg)}
                >
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-red-600 text-white text-[10px] font-bold px-1 leading-none flex-shrink-0">
                      {msg.unreadInThread}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm">
                      {folder === "inbox" ? msg.senderUsername : msg.recipientUsername}
                    </span>
                    <span className="block truncate">{msg.subject}</span>
                  </span>
                  <span className="text-xs text-arena-muted flex-shrink-0">{timeAgo(msg.createdAt)}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
