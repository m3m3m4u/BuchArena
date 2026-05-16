"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";
import { showLesezeichenToast } from "@/app/components/lesezeichen-toast";
import { GENRE_TOPICS, type GenreTopic } from "@/lib/discussions";
import { CommentToolbar } from "@/app/components/comment-toolbar";

type PollVoteItem = { username: string; optionIndex: number };
type PollReplyItem = { id: string; authorUsername: string; displayName?: string; body: string; createdAt: string };
type PollItem = {
  id: string;
  authorUsername: string;
  displayName?: string;
  question: string;
  options: string[];
  votes: PollVoteItem[];
  totalVotes: number;
  replies: PollReplyItem[];
  createdAt: string;
};

type DiscussionItem = {
  id: string;
  authorUsername: string;
  displayName?: string;
  title: string;
  body: string;
  topic?: string;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  hasProfile?: boolean;
  hasSpeakerProfile?: boolean;
  hasBloggerProfile?: boolean;
  isAdmin?: boolean;
  unread?: boolean;
};

function RoleBadges({ username, hasProfile, hasSpeakerProfile, hasBloggerProfile, isAdmin }: { username: string; hasProfile?: boolean; hasSpeakerProfile?: boolean; hasBloggerProfile?: boolean; isAdmin?: boolean }) {
  const badges: { label: string; href: string }[] = [];
  if (hasProfile) badges.push({ label: "Autor", href: `/autor/${encodeURIComponent(username)}` });
  if (hasBloggerProfile) badges.push({ label: "Blogger", href: `/blogger/${encodeURIComponent(username)}` });
  if (hasSpeakerProfile) badges.push({ label: "Sprecher", href: `/sprecher/${encodeURIComponent(username)}` });
  if (isAdmin) badges.push({ label: "Admin", href: `/nachrichten?to=${encodeURIComponent(username)}` });
  if (badges.length === 0) return null;
  return (
    <span className="text-xs text-arena-muted">
      ({badges.map((b, i) => (
        <span key={b.label}>
          {i > 0 && ", "}
          <Link href={b.href} className="underline hover:text-arena-text" onClick={(e) => e.stopPropagation()}>
            {b.label}
          </Link>
        </span>
      ))})
    </span>
  );
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

export default function GenreDiskussionenPage() {
  const router = useRouter();
  const params = useParams();
  const rawGenre = typeof params?.genre === "string" ? decodeURIComponent(params.genre) : "";
  const genre = (GENRE_TOPICS as readonly string[]).includes(rawGenre) ? (rawGenre as GenreTopic) : null;

  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "activity">("activity");
  const [showOverlay, setShowOverlay] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const newBodyRef = useRef<HTMLTextAreaElement>(null);

  // Poll state
  const [showPollOverlay, setShowPollOverlay] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isSavingPoll, setIsSavingPoll] = useState(false);
  const [votingPoll, setVotingPoll] = useState<string | null>(null);
  const [openPollId, setOpenPollId] = useState<string | null>(null);
  const [pollReplyBody, setPollReplyBody] = useState("");
  const [isSavingPollReply, setIsSavingPollReply] = useState(false);

  useEffect(() => {
    const account = getStoredAccount();
    if (account) {
      setUsername(account.username);
      setIsAdmin(account.role === "ADMIN" || account.role === "SUPERADMIN");
    }
  }, []);

  const loadDiscussions = useCallback(async () => {
    if (!genre) return;
    setIsLoading(true);
    setMessage("");
    try {
      const [discRes, pollRes] = await Promise.all([
        fetch("/api/discussions/list"),
        fetch(`/api/discussions/polls/list?genre=${encodeURIComponent(genre)}`),
      ]);
      const discData = (await discRes.json()) as { discussions?: DiscussionItem[]; message?: string };
      const pollData = (await pollRes.json()) as { polls?: PollItem[]; message?: string };
      if (!discRes.ok) throw new Error(discData.message ?? "Fehler beim Laden.");
      const filtered = (discData.discussions ?? []).filter((d) => d.topic === genre);
      setDiscussions(filtered);
      setPolls(pollData.polls ?? []);
    } catch {
      setMessage("Diskussionen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [genre]);

  useEffect(() => {
    void loadDiscussions();
  }, [loadDiscussions]);

  async function handleCreate() {
    if (!genre) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/discussions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorUsername: username,
          title: title.trim(),
          body: body.trim(),
          topic: genre,
        }),
      });
      const data = (await res.json()) as { message?: string; lesezeichen?: number };
      if (!res.ok) throw new Error(data.message ?? "Fehler beim Erstellen.");
      if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);
      setTitle("");
      setBody("");
      setShowOverlay(false);
      await loadDiscussions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Diskussion konnte nicht erstellt werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdminDelete(id: string) {
    if (!confirm("Diskussion wirklich löschen?")) return;
    try {
      const res = await fetch("/api/discussions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      await loadDiscussions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Diskussion konnte nicht gelöscht werden.");
    }
  }

  async function handleCreatePoll() {
    if (!genre) return;
    const q = pollQuestion.trim();
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    setIsSavingPoll(true);
    try {
      const res = await fetch("/api/discussions/polls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, options: opts, genre }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowPollOverlay(false);
      await loadDiscussions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Abstimmung konnte nicht erstellt werden.");
    } finally {
      setIsSavingPoll(false);
    }
  }

  async function handleVote(pollId: string, optionIndex: number) {
    setVotingPoll(pollId);
    try {
      const res = await fetch("/api/discussions/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionIndex }),
      });
      const data = (await res.json()) as { message?: string; lesezeichen?: number };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);
      await loadDiscussions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stimme konnte nicht abgegeben werden.");
    } finally {
      setVotingPoll(null);
    }
  }

  async function handlePollReply(pollId: string) {
    const text = pollReplyBody.trim();
    if (!text) return;
    setIsSavingPollReply(true);
    try {
      const res = await fetch("/api/discussions/polls/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, body: text }),
      });
      const data = (await res.json()) as { message?: string; lesezeichen?: number };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);
      setPollReplyBody("");
      await loadDiscussions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Antwort konnte nicht gespeichert werden.");
    } finally {
      setIsSavingPollReply(false);
    }
  }

  async function handleDeletePollReply(pollId: string, replyId: string) {
    try {
      const res = await fetch("/api/discussions/polls/reply", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, replyId }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      await loadDiscussions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Antwort konnte nicht gelöscht werden.");
    }
  }

  if (!genre) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1>Genre nicht gefunden</h1>
          <Link href="/diskussionen/genre" className="btn">← Genre-Treffpunkt</Link>
        </section>
      </main>
    );
  }

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1>Genre-Treffpunkt: {genre}</h1>
          <p>
            Bitte <Link href="/auth">melde dich an</Link>, um am Genre-Treffpunkt teilzunehmen.
          </p>
          <Link href="/diskussionen/genre" className="btn">← Genre-Übersicht</Link>
        </section>
      </main>
    );
  }

  const search = searchTerm.trim().toLowerCase();
  const filtered = discussions
    .filter((d) => {
      if (!search) return true;
      return (
        d.title.toLowerCase().includes(search) ||
        d.body.toLowerCase().includes(search) ||
        (d.displayName || d.authorUsername).toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return (
        new Date(b.lastActivityAt ?? b.createdAt).getTime() -
        new Date(a.lastActivityAt ?? a.createdAt).getTime()
      );
    });

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-arena-muted m-0">
              <Link href="/diskussionen/genre" className="hover:underline">Genre-Treffpunkt</Link>
            </p>
            <h1 className="text-xl sm:text-2xl m-0">{genre}</h1>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link href="/diskussionen/genre" className="btn text-sm sm:text-base">← Genres</Link>
            <button className="btn text-sm sm:text-base" onClick={() => setShowPollOverlay(true)}>
              Neue Abstimmung
            </button>
            <button className="btn text-sm sm:text-base" onClick={() => setShowOverlay(true)}>
              Neues Thema
            </button>
          </div>
        </div>

        {message && <p className="text-red-700">{message}</p>}

        {/* ═══ Such- und Sortierleiste ═══ */}
        <div className="grid gap-2">
          <input
            type="text"
            className="input-base text-sm"
            placeholder={`Diskussionen in „${genre}" durchsuchen …`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-arena-muted text-xs">Sortieren:</span>
            <div className="flex gap-1 border border-arena-border-light rounded-lg p-0.5">
              <button
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  sortBy === "activity" ? "bg-arena-blue text-white font-medium" : "text-arena-muted hover:text-arena-text"
                }`}
                onClick={() => setSortBy("activity")}
              >
                Neueste Aktivität
              </button>
              <button
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  sortBy === "newest" ? "bg-arena-blue text-white font-medium" : "text-arena-muted hover:text-arena-text"
                }`}
                onClick={() => setSortBy("newest")}
              >
                Neueste Themen
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p>Lade Diskussionen ...</p>
        ) : (() => {
          type ListItem = { type: "discussion"; data: DiscussionItem } | { type: "poll"; data: PollItem };

          const search = searchTerm.trim().toLowerCase();
          const filteredDiscussions = discussions.filter((d) => {
            if (!search) return true;
            return (
              d.title.toLowerCase().includes(search) ||
              d.body.toLowerCase().includes(search) ||
              (d.displayName || d.authorUsername).toLowerCase().includes(search)
            );
          });
          const filteredPolls = polls.filter((p) => {
            if (!search) return true;
            return p.question.toLowerCase().includes(search);
          });

          const items: ListItem[] = [
            ...filteredDiscussions.map((d) => ({ type: "discussion" as const, data: d })),
            ...filteredPolls.map((p) => ({ type: "poll" as const, data: p })),
          ].sort((a, b) => {
            if (sortBy === "newest") {
              return new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime();
            }
            const getActivity = (item: ListItem) =>
              item.type === "discussion"
                ? new Date(item.data.lastActivityAt ?? item.data.createdAt).getTime()
                : new Date(item.data.createdAt).getTime();
            return getActivity(b) - getActivity(a);
          });

          if (items.length === 0) {
            return (
              <div className="grid gap-3">
                <p className="text-arena-muted text-sm">
                  {search ? "Keine Ergebnisse für diese Suche." : `Noch keine Diskussionen im Genre „${genre}". Starte das erste Thema!`}
                </p>
              </div>
            );
          }

          return (
            <div className="grid gap-3">
              {items.map((item) => {
                if (item.type === "poll") {
                  const poll = item.data;
                  return (
                    <div
                      key={`poll-${poll.id}`}
                      onClick={() => setOpenPollId(poll.id)}
                      className="rounded-lg border border-arena-border p-3.5 cursor-pointer hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm sm:text-base font-semibold line-clamp-2 min-w-0">
                            {poll.question}
                          </span>
                          <p className="text-xs text-arena-muted mt-1 m-0">
                            {poll.options.length} Optionen
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-arena-muted whitespace-nowrap">
                            {poll.totalVotes} {poll.totalVotes === 1 ? "Stimme" : "Stimmen"}
                          </span>
                          <span className="text-xs text-arena-muted whitespace-nowrap">
                            {poll.replies.length} {poll.replies.length === 1 ? "Kommentar" : "Kommentare"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-arena-muted mt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">Abstimmung</span>
                          <span>von {poll.displayName || poll.authorUsername}</span>
                        </div>
                        <span className="text-xs text-arena-muted">{timeAgo(poll.createdAt)}</span>
                      </div>
                    </div>
                  );
                }

                const d = item.data;
                return (
                  <div
                    key={d.id}
                    onClick={() => router.push(`/diskussionen/${d.id}`)}
                    className={`rounded-lg border p-3 sm:p-3.5 cursor-pointer transition-colors ${
                      d.unread
                        ? "border-arena-yellow bg-arena-yellow/5 hover:bg-arena-yellow/10"
                        : "border-arena-border hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <span className={`text-sm sm:text-base line-clamp-2 min-w-0 flex-1 ${d.unread ? "font-bold" : "font-semibold"}`}>
                        {d.title}
                      </span>
                      <span className="text-xs text-arena-muted whitespace-nowrap flex-shrink-0">
                        {d.replyCount} {d.replyCount === 1 ? "Antwort" : "Antworten"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs sm:text-sm text-arena-muted mt-1">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {d.unread && (
                          <span className="inline-flex items-center gap-1 text-xs bg-arena-yellow text-arena-blue px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-arena-blue/60" />
                            Neu
                          </span>
                        )}
                        <span className="truncate">
                          von {d.displayName || d.authorUsername}{" "}
                          <RoleBadges username={d.authorUsername} hasProfile={d.hasProfile} hasSpeakerProfile={d.hasSpeakerProfile} hasBloggerProfile={d.hasBloggerProfile} isAdmin={d.isAdmin} />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-arena-muted">zuletzt aktiv {timeAgo(d.lastActivityAt)}</span>
                        {isAdmin && (
                          <button
                            className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); void handleAdminDelete(d.id); }}
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* ═══ Poll Detail Overlay ═══ */}
      {openPollId && (() => {
        const poll = polls.find((p) => p.id === openPollId);
        if (!poll) return null;
        const hasVoted = poll.votes.some((v) => v.username === username);
        const myVote = poll.votes.find((v) => v.username === username);
        const total = poll.totalVotes;

        return (
          <div className="overlay-backdrop" onClick={() => { setOpenPollId(null); setPollReplyBody(""); }}>
            <div className="w-[min(600px,100%)] bg-white rounded-xl p-4 sm:p-5 box-border grid gap-3 sm:gap-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div>
                <h2 className="m-0 mb-1 text-lg sm:text-xl">{poll.question}</h2>
                <p className="text-sm text-arena-muted m-0">
                  von {poll.displayName || poll.authorUsername} · {timeAgo(poll.createdAt)} · {total} {total === 1 ? "Stimme" : "Stimmen"}
                </p>
              </div>

              <div className="grid gap-2">
                {poll.options.map((opt, idx) => {
                  const count = poll.votes.filter((v) => v.optionIndex === idx).length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isMyVote = myVote?.optionIndex === idx;

                  if (hasVoted) {
                    return (
                      <div key={idx} className="relative">
                        <div
                          className="absolute inset-0 rounded-lg transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isMyVote ? "rgb(59 130 246 / 0.2)" : "rgb(229 231 235)",
                          }}
                        />
                        <div className={`relative flex items-center justify-between px-3 py-2.5 rounded-lg border ${isMyVote ? "border-blue-400 font-medium" : "border-transparent"}`}>
                          <span className="text-sm">
                            {isMyVote && <span className="mr-1">✓</span>}
                            {opt}
                          </span>
                          <span className="text-sm font-medium tabular-nums">{pct}%</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={votingPoll === poll.id}
                      onClick={() => handleVote(poll.id, idx)}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-arena-border hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm cursor-pointer disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {hasVoted && <p className="text-xs text-arena-muted m-0">Du hast bereits abgestimmt.</p>}

              {/* ── Antworten ── */}
              <div className="border-t border-arena-border-light pt-3 grid gap-3">
                <h3 className="text-sm font-semibold m-0">
                  Kommentare ({poll.replies.length})
                </h3>

                {poll.replies.length > 0 && (
                  <div className="grid gap-2">
                    {poll.replies.map((r) => (
                      <div key={r.id} className="rounded-lg border border-arena-border-light p-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-xs">{r.displayName || r.authorUsername}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-arena-muted">{timeAgo(r.createdAt)}</span>
                            {(isAdmin || r.authorUsername === username) && (
                              <button
                                className="text-xs text-red-500 hover:text-red-700"
                                onClick={() => void handleDeletePollReply(poll.id, r.id)}
                              >
                                Löschen
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="m-0 text-sm whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-2">
                  <textarea
                    className="input-base text-sm"
                    rows={3}
                    maxLength={3000}
                    placeholder="Kommentar schreiben …"
                    value={pollReplyBody}
                    onChange={(e) => setPollReplyBody(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn text-sm"
                      disabled={isSavingPollReply || !pollReplyBody.trim()}
                      onClick={() => void handlePollReply(poll.id)}
                    >
                      {isSavingPollReply ? "Wird gespeichert …" : "Kommentieren"}
                    </button>
                    <button className="btn text-sm" onClick={() => { setOpenPollId(null); setPollReplyBody(""); }}>
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showPollOverlay && (
        <div className="overlay-backdrop">
          <div className="w-[min(600px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0">Neue Abstimmung in „{genre}"</h2>
              <button className="text-arena-muted hover:text-arena-text text-xl leading-none" onClick={() => setShowPollOverlay(false)}>✕</button>
            </div>

            <label className="grid gap-1 text-[0.95rem]">
              Frage
              <input
                className="input-base"
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                maxLength={300}
                placeholder="Worüber soll abgestimmt werden?"
              />
            </label>

            <div className="grid gap-2">
              <span className="text-[0.95rem]">Optionen</span>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="input-base flex-1"
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    maxLength={100}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 text-sm px-1"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 10 && (
                <button
                  type="button"
                  className="btn btn-sm w-fit"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                >
                  + Option hinzufügen
                </button>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="btn"
                onClick={handleCreatePoll}
                disabled={isSavingPoll || !pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
              >
                {isSavingPoll ? "Wird erstellt ..." : "Abstimmung erstellen"}
              </button>
              <button className="btn" onClick={() => setShowPollOverlay(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverlay && (
        <div className="overlay-backdrop">
          <div className="w-[min(660px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0">Neues Thema in „{genre}"</h2>
              <button className="text-arena-muted hover:text-arena-text text-xl leading-none" onClick={() => setShowOverlay(false)}>✕</button>
            </div>

            <label className="grid gap-1 text-[0.95rem]">
              Titel
              <input
                className="input-base"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Worum soll diskutiert werden?"
              />
            </label>

            <div className="grid gap-1 text-[0.95rem]">
              <span>Beschreibung</span>
              <textarea
                ref={newBodyRef}
                className="input-base"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={8}
                placeholder="Beschreibe das Thema genauer ..."
              />
              <CommentToolbar textareaRef={newBodyRef} value={body} onChange={setBody} />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="btn"
                onClick={handleCreate}
                disabled={isSaving || !title.trim() || !body.trim()}
              >
                {isSaving ? "Wird erstellt ..." : "Thema erstellen"}
              </button>
              <button className="btn" onClick={() => setShowOverlay(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
