"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { getStoredAccount } from "@/lib/client-account";

/* ── Typen ── */
type ConversationItem = {
  id: string;
  partner: string;
  displayName: string;
  profileImage: string;
  subject: string;
  body: string;
  unreadCount: number;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  senderUsername: string;
  recipientUsername: string;
  subject: string;
  body: string;
  read: boolean;
  readAt: string | null;
  threadId: string | null;
  createdAt: string;
};

/* ── Hilfsfunktionen ── */
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

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(dateString: string): string {
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Heute";
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ── Hauptseite ── */
export default function NachrichtenPage() {
  const [username, setUsername] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Aktiver Chat
  const [activePartner, setActivePartner] = useState<string | null>(null);
  const [activePartnerDisplayName, setActivePartnerDisplayName] = useState<string>("");
  const [activePartnerImage, setActivePartnerImage] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Eingabe
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Neue Nachricht
  const [showNewChat, setShowNewChat] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [newSubject, setNewSubject] = useState("");

  // Benutzer-Suche (Autocomplete)
  const [userSuggestions, setUserSuggestions] = useState<
    { username: string; displayName: string; profileImage: string }[]
  >([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile: Chat-Ansicht anzeigen
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const account = getStoredAccount();
    if (account) setUsername(account.username);
  }, []);

  /* ── Konversationen laden ── */
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/messages/list", { method: "GET" });
      const data = (await res.json()) as { conversations?: ConversationItem[] };
      setConversations(data.conversations ?? []);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) void loadConversations();
  }, [username, loadConversations]);

  /* ── Chat mit Partner laden ── */
  const openChat = useCallback(
    async (partner: string, displayName?: string, profileImage?: string) => {
      setActivePartner(partner);
      setActivePartnerDisplayName(displayName ?? "");
      setActivePartnerImage(profileImage ?? "");
      setMobileShowChat(true);
      setChatLoading(true);
      setInputText("");
      try {
        const res = await fetch(`/api/messages/list?partner=${encodeURIComponent(partner)}`);
        const data = (await res.json()) as { messages?: ChatMessage[] };
        const msgs = data.messages ?? [];
        setChatMessages(msgs);

        // Ungelesene als gelesen markieren
        const unread = msgs.filter((m) => !m.read && m.recipientUsername === username);
        for (const m of unread) {
          fetch("/api/messages/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: m.id }),
          }).catch(() => {});
        }
        if (unread.length > 0) {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.recipientUsername === username && !m.read
                ? { ...m, read: true, readAt: new Date().toISOString() }
                : m,
            ),
          );
          setConversations((prev) =>
            prev.map((c) => (c.partner === partner ? { ...c, unreadCount: 0 } : c)),
          );
        }
      } catch {
        setChatMessages([]);
      } finally {
        setChatLoading(false);
      }
    },
    [username],
  );

  /* Scroll zum Ende wenn neue Nachrichten */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── Nachricht senden ── */
  async function handleSend() {
    if (!inputText.trim() || !activePartner) return;
    setIsSending(true);
    try {
      // Betreff: letzten Betreff wiederverwenden oder "Nachricht"
      const lastMsg = chatMessages[chatMessages.length - 1];
      const subject = lastMsg?.subject ?? (newSubject || "Nachricht");

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: activePartner,
          subject,
          body: inputText,
          threadId: lastMsg?.threadId ?? undefined,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setInputText("");
      // Chat neu laden
      await openChat(activePartner);
      void loadConversations();
    } catch {
      /* ignore */
    } finally {
      setIsSending(false);
    }
  }

  /* ── Benutzer suchen (Autocomplete) ── */
  function handleRecipientChange(value: string) {
    setNewRecipient(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 1) {
      setUserSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/messages/search-users?q=${encodeURIComponent(value.trim())}`,
        );
        const data = (await res.json()) as {
          users?: { username: string; displayName: string; profileImage: string }[];
        };
        setUserSuggestions(data.users ?? []);
      } catch {
        setUserSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);
  }

  function selectSuggestion(uname: string) {
    setNewRecipient(uname);
    setUserSuggestions([]);
  }

  /* ── Neuen Chat starten ── */
  async function handleStartNewChat() {
    if (!newRecipient.trim()) return;
    setShowNewChat(false);
    setUserSuggestions([]);
    // Prüfe ob schon eine Konversation existiert
    const existing = conversations.find(
      (c) => c.partner.toLowerCase() === newRecipient.trim().toLowerCase(),
    );
    if (existing) {
      await openChat(existing.partner, existing.displayName, existing.profileImage);
      return;
    }
    // Neuen Partner setzen (Chat ist leer, bis erste Nachricht gesendet wird)
    setActivePartner(newRecipient.trim());
    setChatMessages([]);
    setMobileShowChat(true);
    setNewSubject(newSubject || "Nachricht");
  }

  /* ── Nachricht löschen ── */
  async function handleDelete(id: string) {
    if (!confirm("Nachricht wirklich löschen?")) return;
    try {
      const res = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setChatMessages((prev) => prev.filter((m) => m.id !== id));
        void loadConversations();
      }
    } catch {
      /* ignore */
    }
  }

  /* ── Kein Login ── */
  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <p>
            Bitte <Link href="/auth">anmelden</Link>, um Nachrichten zu nutzen.
          </p>
        </section>
      </main>
    );
  }

  /* ── Datums-Trenner berechnen ── */
  function renderMessages() {
    let lastDate = "";
    return chatMessages.map((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      let separator: React.ReactNode = null;
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        separator = (
          <div key={`sep-${msg.id}`} className="flex justify-center my-3">
            <span className="text-[11px] text-arena-muted bg-gray-100 rounded-full px-3 py-0.5">
              {formatDateSeparator(msg.createdAt)}
            </span>
          </div>
        );
      }
      const isMine = msg.senderUsername === username;
      return (
        <div key={msg.id}>
          {separator}
          <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5 group`}>
            <div
              className={`relative max-w-[75%] rounded-2xl px-3.5 py-2 text-[0.95rem] ${
                isMine
                  ? "bg-arena-blue text-white rounded-br-md"
                  : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap m-0" style={{ lineHeight: 1.5 }}>
                {msg.body}
              </p>
              <div
                className={`flex items-center gap-1.5 mt-1 ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                <span
                  className={`text-[10px] ${
                    isMine ? "text-white/50" : "text-arena-muted"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </span>
                {isMine && (
                  <span className="text-[10px] text-white/50">
                    {msg.read ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
              {/* Löschen bei Hover */}
              <button
                className={`absolute top-1 ${isMine ? "-left-7" : "-right-7"} opacity-0 group-hover:opacity-100 transition-opacity text-[11px] border-none bg-transparent cursor-pointer text-arena-muted hover:text-arena-danger`}
                onClick={() => handleDelete(msg.id)}
                title="Löschen"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      );
    });
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden min-h-0">
      <section className="flex-1 !p-0 overflow-hidden w-full mx-auto min-h-0" style={{ maxWidth: 1100 }}>
        <div className="grid grid-cols-[300px_1fr] max-[700px]:grid-cols-1 h-full min-h-0">
          {/* ══ Linke Seite: Konversationsliste ══ */}
          <div
            className={`border-r border-arena-border flex flex-col ${
              mobileShowChat ? "max-[700px]:hidden" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border bg-gray-50">
              <h2 className="text-base m-0 font-semibold">Chats</h2>
              <button
                className="btn btn-primary btn-sm !py-1 !px-2.5 text-[0.85rem]"
                onClick={() => {
                  setShowNewChat(true);
                  setNewRecipient("");
                  setNewSubject("");
                }}
              >
                + Neu
              </button>
            </div>

            {/* Konversationsliste */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-arena-muted p-4">Lade …</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-arena-muted p-4">
                  Noch keine Unterhaltungen.
                </p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.partner}
                    className={`w-full text-left px-4 py-3 border-b border-arena-border-light cursor-pointer transition-colors flex items-center gap-3 ${
                      activePartner === conv.partner
                        ? "bg-blue-50"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => openChat(conv.partner, conv.displayName, conv.profileImage)}
                  >
                    {/* Avatar-Kreis */}
                    <div className="w-10 h-10 rounded-full bg-arena-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase overflow-hidden">
                      {conv.profileImage ? (
                        <img src={conv.profileImage} alt={conv.partner} className="w-full h-full object-cover" />
                      ) : (
                        conv.partner.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <span
                            className={`text-sm truncate ${
                              conv.unreadCount > 0 ? "font-bold" : ""
                            }`}
                          >
                            {conv.partner}
                          </span>
                          {conv.displayName && conv.displayName !== conv.partner && (
                            <span className="text-xs text-arena-muted ml-1.5">
                              ({conv.displayName})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-arena-muted flex-shrink-0 ml-2">
                          {timeAgo(conv.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.8rem] text-arena-muted truncate flex-1">
                          {conv.body.length > 40
                            ? conv.body.slice(0, 40) + "…"
                            : conv.body}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold px-1">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ══ Rechte Seite: Chat-Bereich ══ */}
          <div
            className={`flex flex-col min-h-0 ${
              !mobileShowChat ? "max-[700px]:hidden" : ""
            }`}
          >
            {activePartner ? (
              <>
                {/* Chat-Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-arena-border bg-gray-50">
                  <button
                    className="min-[701px]:hidden btn btn-sm !p-1"
                    onClick={() => setMobileShowChat(false)}
                  >
                    ←
                  </button>
                  <div className="w-9 h-9 rounded-full bg-arena-blue text-white flex items-center justify-center text-sm font-bold uppercase overflow-hidden">
                    {activePartnerImage ? (
                      <img src={activePartnerImage} alt={activePartner} className="w-full h-full object-cover" />
                    ) : (
                      activePartner.charAt(0)
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Link
                      href={`/autor/${activePartner}`}
                      className="font-semibold text-sm no-underline text-inherit hover:underline"
                    >
                      {activePartner}
                    </Link>
                    {activePartnerDisplayName && activePartnerDisplayName !== activePartner && (
                      <span className="text-xs text-arena-muted leading-tight">
                        {activePartnerDisplayName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nachrichten-Bereich */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {chatLoading ? (
                    <p className="text-sm text-arena-muted text-center mt-8">
                      Lade Nachrichten …
                    </p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-sm text-arena-muted text-center mt-8">
                      Noch keine Nachrichten. Schreibe die erste!
                    </p>
                  ) : (
                    renderMessages()
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Eingabefeld */}
                <div className="border-t border-arena-border px-4 py-3 bg-gray-50">
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      className="input-base flex-1 resize-none"
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Nachricht schreiben …"
                      maxLength={5000}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      style={{ minHeight: 40, maxHeight: 120 }}
                    />
                    <button
                      className="btn btn-primary btn-sm !py-2 !px-4"
                      disabled={isSending || !inputText.trim()}
                      onClick={() => void handleSend()}
                    >
                      {isSending ? "…" : "↑"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-arena-muted text-sm">
                Wähle eine Unterhaltung oder starte einen neuen Chat.
              </div>
            )}
          </div>
        </div>

        {/* ══ Neuer Chat Modal ══ */}
        {showNewChat && (
          <div className="overlay-backdrop" onClick={() => setShowNewChat(false)}>
            <div
              className="card"
              style={{ maxWidth: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg m-0 mb-3">Neuer Chat</h2>
              <label className="block">
                <span className="text-sm font-semibold">Empfänger (Benutzername)</span>
                <div className="relative">
                  <input
                    className="input-base w-full mt-1"
                    value={newRecipient}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                    placeholder="Benutzername eingeben"
                    autoFocus
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setUserSuggestions([]);
                        void handleStartNewChat();
                      }
                    }}
                  />
                  {/* Autocomplete Dropdown */}
                  {(userSuggestions.length > 0 || suggestionsLoading) && newRecipient.trim().length >= 1 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-arena-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {suggestionsLoading && userSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-arena-muted">Suche …</div>
                      ) : userSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-arena-muted">
                          Kein Benutzer gefunden.
                        </div>
                      ) : (
                        userSuggestions.map((u) => (
                          <button
                            key={u.username}
                            type="button"
                            className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent"
                            onClick={() => selectSuggestion(u.username)}
                          >
                            <div className="w-8 h-8 rounded-full bg-arena-blue text-white flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase overflow-hidden">
                              {u.profileImage ? (
                                <img
                                  src={u.profileImage}
                                  alt={u.username}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                u.username.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{u.username}</div>
                              {u.displayName !== u.username && (
                                <div className="text-xs text-arena-muted truncate">
                                  {u.displayName}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="block mt-2">
                <span className="text-sm font-semibold">Betreff (optional)</span>
                <input
                  className="input-base w-full mt-1"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="z. B. Frage zu deinem Buch"
                  maxLength={200}
                />
              </label>
              <div className="flex gap-2 mt-4">
                <button
                  className="btn btn-primary"
                  disabled={!newRecipient.trim()}
                  onClick={() => void handleStartNewChat()}
                >
                  Chat starten
                </button>
                <button className="btn" onClick={() => setShowNewChat(false)}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
