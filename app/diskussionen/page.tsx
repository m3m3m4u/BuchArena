"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";
import { showLesezeichenToast } from "@/app/components/lesezeichen-toast";

type DiscussionItem = {
  id: string;
  authorUsername: string;
  displayName?: string;
  title: string;
  body: string;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  hasProfile?: boolean;
  hasSpeakerProfile?: boolean;
  hasBloggerProfile?: boolean;
};

type PollVoteItem = { username: string; optionIndex: number };

type PollItem = {
  id: string;
  authorUsername: string;
  displayName?: string;
  question: string;
  options: string[];
  votes: PollVoteItem[];
  totalVotes: number;
  createdAt: string;
};

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
            onClick={(e) => e.stopPropagation()}
          >
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

export default function DiskussionenPage() {
  const router = useRouter();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState("");

  /* ── Poll state ── */
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [showPollOverlay, setShowPollOverlay] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isSavingPoll, setIsSavingPoll] = useState(false);
  const [votingPoll, setVotingPoll] = useState<string | null>(null);
  const [openPollId, setOpenPollId] = useState<string | null>(null);

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

  const loadPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/discussions/polls/list");
      const data = (await res.json()) as { polls?: PollItem[] };
      setPolls(data.polls ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  async function handleCreatePoll() {
    const q = pollQuestion.trim();
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;

    setIsSavingPoll(true);
    try {
      const res = await fetch("/api/discussions/polls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, options: opts }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");

      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowPollOverlay(false);
      await loadPolls();
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
      await loadPolls();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stimme konnte nicht abgegeben werden.");
    } finally {
      setVotingPoll(null);
    }
  }

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

      const data = (await response.json()) as { message?: string; lesezeichen?: number };

      if (!response.ok) {
        throw new Error(data.message ?? "Fehler beim Erstellen.");
      }

      if (data.lesezeichen) showLesezeichenToast(data.lesezeichen);
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
        <section className="card">
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
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl">Diskussionen</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link href="/quiz" className="btn text-sm sm:text-base">Quiz</Link>
            <Link href="/tauschboerse" className="btn text-sm sm:text-base">Tauschbörse</Link>
            <button className="btn text-sm sm:text-base" onClick={() => setShowPollOverlay(true)}>
              Neue Abstimmung
            </button>
            <button className="btn text-sm sm:text-base" onClick={() => setShowOverlay(true)}>
              Neues Thema
            </button>
          </div>
        </div>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Diskussionen ...</p>
        ) : (() => {
          // Merge discussions & polls into one sorted list
          type ListItem = { type: "discussion"; data: DiscussionItem } | { type: "poll"; data: PollItem };
          const items: ListItem[] = [
            ...discussions.map((d) => ({ type: "discussion" as const, data: d })),
            ...polls.map((p) => ({ type: "poll" as const, data: p })),
          ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

          if (items.length === 0) return <p>Noch keine Diskussionen vorhanden. Starte das erste Thema!</p>;

          return (
            <div className="grid gap-3">
              {items.map((item) => {
                if (item.type === "discussion") {
                  const d = item.data;
                  return (
                    <div
                      key={`d-${d.id}`}
                      onClick={() => router.push(`/diskussionen/${d.id}`)}
                      className="rounded-lg border border-arena-border p-3 sm:p-3.5 cursor-pointer hover:border-gray-500 transition-colors no-underline text-inherit"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <strong className="text-sm sm:text-base line-clamp-2">{d.title}</strong>
                        <span className="text-xs text-arena-muted whitespace-nowrap flex-shrink-0">
                          {d.replyCount} {d.replyCount === 1 ? "Antwort" : "Antworten"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 text-xs sm:text-sm text-arena-muted mt-1">
                        <span className="truncate">
                          von {d.displayName || d.authorUsername}{" "}
                          <RoleBadges username={d.authorUsername} hasProfile={d.hasProfile} hasSpeakerProfile={d.hasSpeakerProfile} hasBloggerProfile={d.hasBloggerProfile} />
                        </span>
                        <span className="text-xs text-arena-muted flex-shrink-0">
                          {timeAgo(d.lastActivityAt)}
                        </span>
                      </div>
                    </div>
                  );
                }

                const poll = item.data;
                return (
                  <div
                    key={`p-${poll.id}`}
                    onClick={() => setOpenPollId(poll.id)}
                    className="rounded-lg border border-arena-border p-3.5 cursor-pointer hover:border-gray-500 transition-colors no-underline text-inherit"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="flex items-center gap-1.5">
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Abstimmung</span>
                        {poll.question}
                      </strong>
                      <span className="text-xs text-arena-muted whitespace-nowrap">
                        {poll.totalVotes} {poll.totalVotes === 1 ? "Stimme" : "Stimmen"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm text-arena-muted mt-1">
                      <span>von {poll.displayName || poll.authorUsername}</span>
                      <span className="text-xs text-arena-muted">{timeAgo(poll.createdAt)}</span>
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
          <div className="overlay-backdrop" onClick={() => setOpenPollId(null)}>
            <div className="w-[min(560px,100%)] bg-white rounded-xl p-4 sm:p-5 box-border grid gap-3 sm:gap-4" onClick={(e) => e.stopPropagation()}>
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

              <div className="flex justify-end">
                <button className="btn" onClick={() => setOpenPollId(null)}>Schließen</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowOverlay(false)}>
          <div className="w-[min(660px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5" onClick={(e) => e.stopPropagation()}>
            <h2>Neues Diskussionsthema</h2>

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

            <label className="grid gap-1 text-[0.95rem]">
              Beschreibung
              <p className="text-xs text-arena-muted">
                Formatierung: **fett**, *kursiv*, [Linktext](URL) und direkte URLs
                werden erkannt.
              </p>
              <textarea
                className="input-base"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={8}
                placeholder="Beschreibe das Thema genauer ..."
              />
            </label>

            <div className="flex gap-2 justify-end">
              <button
                className="btn"
                onClick={handleCreate}
                disabled={isSaving || !title.trim() || !body.trim()}
              >
                {isSaving ? "Wird erstellt ..." : "Thema erstellen"}
              </button>
              <button
                className="btn"
                onClick={() => setShowOverlay(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showPollOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowPollOverlay(false)}>
          <div className="w-[min(520px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5" onClick={(e) => e.stopPropagation()}>
            <h2>Neue Abstimmung</h2>

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
              <button
                className="btn"
                onClick={() => setShowPollOverlay(false)}
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
