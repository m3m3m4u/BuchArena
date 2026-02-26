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

export default function NachrichtenPage() {
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composeMessage, setComposeMessage] = useState("");

  useEffect(() => {
    const account = getStoredAccount();
    if (account) setUsername(account.username);
  }, []);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/list?folder=${folder}`, { method: "GET" });
      const data = (await res.json()) as { messages?: MessageItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Laden.");
      setMessages(data.messages ?? []);
    } catch {
      setError("Nachrichten konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    if (username) void loadMessages();
  }, [username, loadMessages]);

  async function handleSend() {
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
      void loadMessages();
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
      if (selectedMessage?.id === id) setSelectedMessage(null);
      void loadMessages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Löschen.");
    }
  }

  async function openMessage(msg: MessageItem) {
    setSelectedMessage(msg);
    if (!msg.read && folder === "inbox") {
      try {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: msg.id }),
        });
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      } catch { /* ignore */ }
    }
  }

  function handleReply(msg: MessageItem) {
    setRecipientUsername(msg.senderUsername);
    setSubject(msg.subject.startsWith("Re: ") ? msg.subject : `Re: ${msg.subject}`);
    setBody("");
    setSelectedMessage(null);
    setShowCompose(true);
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
            onClick={() => { setFolder("inbox"); setSelectedMessage(null); }}
          >
            Posteingang
          </button>
          <button
            className={`btn btn-sm ${folder === "sent" ? "btn-primary" : ""}`}
            onClick={() => { setFolder("sent"); setSelectedMessage(null); }}
          >
            Gesendet
          </button>
        </div>

        {/* Message detail overlay */}
        {selectedMessage && (
          <div className="overlay-backdrop" onClick={() => setSelectedMessage(null)}>
            <div className="card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg m-0">{selectedMessage.subject}</h2>
                <button className="btn btn-sm" onClick={() => setSelectedMessage(null)}>✕</button>
              </div>
              <p className="text-sm text-arena-muted m-0">
                {folder === "inbox" ? (
                  <>Von: <Link href={`/autor/${selectedMessage.senderUsername}`} className="no-underline text-inherit hover:underline">{selectedMessage.senderUsername}</Link></>
                ) : (
                  <>An: <Link href={`/autor/${selectedMessage.recipientUsername}`} className="no-underline text-inherit hover:underline">{selectedMessage.recipientUsername}</Link></>
                )}
                {" · "}
                {timeAgo(selectedMessage.createdAt)}
              </p>
              <p className="whitespace-pre-wrap mt-2" style={{ lineHeight: 1.6 }}>{selectedMessage.body}</p>
              <div className="flex gap-2 mt-2">
                {folder === "inbox" && (
                  <button className="btn btn-sm" onClick={() => handleReply(selectedMessage)}>
                    Antworten
                  </button>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(selectedMessage.id)}>
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compose overlay */}
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
                <button className="btn btn-primary" disabled={isSending} onClick={handleSend}>
                  {isSending ? "Wird gesendet ..." : "Senden"}
                </button>
                <button className="btn" onClick={() => setShowCompose(false)}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {/* Message list */}
        {isLoading ? (
          <p>Lade Nachrichten ...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-arena-muted">
            {folder === "inbox" ? "Dein Posteingang ist leer." : "Noch keine gesendeten Nachrichten."}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg) => (
              <button
                key={msg.id}
                className="w-full text-left rounded-lg border border-arena-border-light px-4 py-3 bg-white hover:bg-[#fafafa] transition-colors cursor-pointer flex items-center gap-3"
                style={{ fontWeight: !msg.read && folder === "inbox" ? 700 : 400 }}
                onClick={() => openMessage(msg)}
              >
                {!msg.read && folder === "inbox" && (
                  <span className="inline-block w-2 h-2 rounded-full bg-arena-link flex-shrink-0" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm">
                    {folder === "inbox" ? msg.senderUsername : msg.recipientUsername}
                  </span>
                  <span className="block truncate">{msg.subject}</span>
                </span>
                <span className="text-xs text-arena-muted flex-shrink-0">{timeAgo(msg.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
