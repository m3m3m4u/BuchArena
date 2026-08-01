"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { PLATFORM_LABELS, type MatchPlatform } from "@/lib/buchmatch";
import type { LoggedInAccount } from "@/lib/client-account";

const PLATFORM_BADGE_STYLES: Record<MatchPlatform, { label: string; badgeCls: string }> = {
  instagram: { label: "Instagram", badgeCls: "bg-pink-100 text-pink-800 border-pink-200" },
  tiktok: { label: "TikTok", badgeCls: "bg-slate-900 text-cyan-300 border-slate-700" },
  blog: { label: "Blog", badgeCls: "bg-blue-100 text-blue-800 border-blue-200" },
  youtube: { label: "YouTube", badgeCls: "bg-red-100 text-red-800 border-red-200" },
  newsletter: { label: "Newsletter", badgeCls: "bg-purple-100 text-purple-800 border-purple-200" },
  podcast: { label: "Podcast", badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  egal: { label: "Egal / Flexibel", badgeCls: "bg-amber-100 text-amber-800 border-amber-200" },
  andere: { label: "Andere Plattform", badgeCls: "bg-gray-100 text-gray-800 border-gray-200" },
};

function PlatformBadge({ platform, labelPrefix }: { platform: MatchPlatform; labelPrefix?: string }) {
  const style = PLATFORM_BADGE_STYLES[platform] || {
    label: PLATFORM_LABELS[platform] || platform,
    badgeCls: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border shrink-0 ${style.badgeCls}`}>
      {labelPrefix && <span className="opacity-75 font-normal">{labelPrefix}:</span>}
      <span>{style.label}</span>
    </span>
  );
}

type UserBook = {
  id: string;
  title: string;
  coverImageUrl?: string;
  genre?: string;
};

type Offer = {
  id: string;
  authorUsername: string;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  offeredPlatform: MatchPlatform;
  offeredFormat: string;
  offeredChannelHandle?: string;
  requestedPlatform: MatchPlatform;
  requestedFormat?: string;
  preferredGenres?: string[];
  notes?: string;
  status: string;
  createdAt: string;
};

type Application = {
  id: string;
  offerId: string;
  offerAuthorUsername?: string;
  offerBookTitle?: string;
  offerBookCoverUrl?: string;
  offerPlatform?: MatchPlatform;
  offerFormat?: string;
  applicantUsername: string;
  applicantBookId: string;
  applicantBookTitle: string;
  applicantBookCoverUrl?: string;
  applicantPlatform: MatchPlatform;
  applicantFormat: string;
  applicantChannelHandle?: string;
  message?: string;
  status: "pending" | "matched" | "declined" | "completed";
  publishedUrlApplicant?: string;
  publishedUrlOwner?: string;
  createdAt: string;
  matchedAt?: string;
};

type MatchItem = {
  id: string;
  offerId: string;
  isOwner: boolean;
  partnerUsername: string;
  myBookTitle: string;
  myBookCoverUrl?: string;
  partnerBookTitle: string;
  partnerBookCoverUrl?: string;
  partnerPlatform: MatchPlatform;
  partnerFormat: string;
  partnerChannelHandle?: string;
  myPlatform: MatchPlatform;
  myFormat: string;
  myChannelHandle?: string;
  status: "matched" | "completed";
  publishedUrlApplicant?: string;
  publishedUrlOwner?: string;
  matchedAt?: string;
  createdAt: string;
};

export default function BuchMatchSection({ account }: { account: LoggedInAccount | null }) {
  const [subTab, setSubTab] = useState<"market" | "create" | "applications" | "matches">("market");
  const [appRole, setAppRole] = useState<"incoming" | "outgoing">("incoming");

  const [myBooks, setMyBooks] = useState<UserBook[]>([]);
  const [loadingMyBooks, setLoadingMyBooks] = useState(false);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const [selectedOfferForApply, setSelectedOfferForApply] = useState<Offer | null>(null);
  const [applyBookId, setApplyBookId] = useState("");
  const [applyPlatform, setApplyPlatform] = useState<MatchPlatform>("instagram");
  const [applyFormat, setApplyFormat] = useState("Reel & Feed-Post");
  const [applyChannelHandle, setApplyChannelHandle] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  const [createBookId, setCreateBookId] = useState("");
  const [createOfferedPlatform, setCreateOfferedPlatform] = useState<MatchPlatform>("instagram");
  const [createOfferedFormat, setCreateOfferedFormat] = useState("Instagram Reel / Post");
  const [createChannelHandle, setCreateChannelHandle] = useState("");
  const [createRequestedPlatform, setCreateRequestedPlatform] = useState<MatchPlatform>("egal");
  const [createRequestedFormat, setCreateRequestedFormat] = useState("Egal / Freie Wahl");
  const [createNotes, setCreateNotes] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [publishUrlInput, setPublishUrlInput] = useState<Record<string, string>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadMyBooks = useCallback(async () => {
    if (!account) return;
    setLoadingMyBooks(true);
    try {
      const res = await fetch("/api/books/list", { method: "POST" });
      const data = await res.json();
      if (data.books) {
        setMyBooks(data.books);
        if (data.books.length > 0) {
          setCreateBookId(data.books[0].id);
          setApplyBookId(data.books[0].id);
        }
      }
    } catch { /* ignore */ } finally {
      setLoadingMyBooks(false);
    }
  }, [account]);

  const loadOffers = useCallback(async () => {
    setLoadingOffers(true);
    try {
      const url = new URL("/api/social-media/buch-match/offers", window.location.origin);
      if (platformFilter !== "all") url.searchParams.set("platform", platformFilter);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) setOffers(data.offers);
    } catch { /* ignore */ } finally {
      setLoadingOffers(false);
    }
  }, [platformFilter]);

  const loadApplications = useCallback(async () => {
    if (!account) return;
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/social-media/buch-match/applications?role=${appRole}`);
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch { /* ignore */ } finally {
      setLoadingApps(false);
    }
  }, [account, appRole]);

  const loadMatches = useCallback(async () => {
    if (!account) return;
    setLoadingMatches(true);
    try {
      const res = await fetch("/api/social-media/buch-match/applications?role=matches");
      const data = await res.json();
      if (data.success) setMatches(data.matches);
    } catch { /* ignore */ } finally {
      setLoadingMatches(false);
    }
  }, [account]);

  useEffect(() => { loadOffers(); }, [loadOffers]);
  useEffect(() => { if (account) loadMyBooks(); }, [account, loadMyBooks]);
  useEffect(() => {
    if (subTab === "applications") loadApplications();
    if (subTab === "matches") loadMatches();
  }, [subTab, loadApplications, loadMatches]);

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess("");
    try {
      const res = await fetch("/api/social-media/buch-match/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: createBookId,
          offeredPlatform: createOfferedPlatform,
          offeredFormat: createOfferedFormat,
          offeredChannelHandle: createChannelHandle,
          requestedPlatform: createRequestedPlatform,
          requestedFormat: createRequestedFormat,
          notes: createNotes,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setCreateError(data.message || "Fehler beim Erstellen.");
      } else {
        setCreateSuccess(data.message || "Inserat erfolgreich erstellt!");
        setCreateNotes("");
        loadOffers();
        setTimeout(() => { setSubTab("market"); setCreateSuccess(""); }, 1500);
      }
    } catch { setCreateError("Netzwerkfehler."); } finally { setCreateLoading(false); }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !selectedOfferForApply) return;
    setApplyLoading(true);
    setApplyError("");
    setApplySuccess("");
    try {
      const res = await fetch("/api/social-media/buch-match/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOfferForApply.id,
          applicantBookId: applyBookId,
          applicantPlatform: applyPlatform,
          applicantFormat: applyFormat,
          applicantChannelHandle: applyChannelHandle,
          message: applyMessage,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setApplyError(data.message || "Fehler.");
      } else {
        setApplySuccess(data.message || "Bewerbung gesendet!");
        setTimeout(() => {
          setSelectedOfferForApply(null);
          setApplySuccess("");
          setApplyMessage("");
          setSubTab("applications");
          setAppRole("outgoing");
        }, 1500);
      }
    } catch { setApplyError("Netzwerkfehler."); } finally { setApplyLoading(false); }
  }

  async function handleApplicationAction(applicationId: string, action: "match" | "decline") {
    if (!confirm(action === "match" ? "Möchtest du dieses Match bestätigen?" : "Bewerbung ablehnen?")) return;
    try {
      const res = await fetch("/api/social-media/buch-match/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadApplications();
        if (action === "match") loadMatches();
      } else {
        alert(data.message || "Fehler.");
      }
    } catch { alert("Netzwerkfehler."); }
  }

  async function handleSavePublishUrl(matchId: string) {
    const url = publishUrlInput[matchId]?.trim();
    if (!url) { alert("Bitte gib einen Link ein."); return; }
    setPublishingId(matchId);
    try {
      const res = await fetch("/api/social-media/buch-match/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: matchId, action: "publish", publishedUrl: url }),
      });
      const data = await res.json();
      if (data.success) { alert(data.message); loadMatches(); }
      else alert(data.message || "Fehler.");
    } catch { alert("Netzwerkfehler."); } finally { setPublishingId(null); }
  }

  const SUB_TABS = [
    { key: "market" as const, label: `Marktplatz (${offers.length})` },
    ...(account ? [
      { key: "create" as const, label: "Inserat erstellen" },
      { key: "applications" as const, label: "Bewerbungen" },
      { key: "matches" as const, label: `Meine Matches (${matches.length})` },
    ] : []),
  ];

  return (
    <div className="grid gap-4">
      {/* Erklärung */}
      <div className="card-info">
        <p className="font-sans text-[0.93rem] leading-relaxed text-arena-text m-0">
          <strong>Wie funktioniert Buch-Match?</strong> Erstelle ein Inserat für dein Buch und gib an, auf welchem Kanal du das Buch eines anderen Autors vorstellen kannst (z.&nbsp;B. Instagram, Blog, TikTok). Andere Autoren bewerben sich mit ihrem Buch – bei gegenseitigem Interesse entsteht ein <em>Match</em>. Beide Seiten stellen sich gegenseitig vor und tragen den Link zur Veröffentlichung ein.
        </p>
      </div>

      {/* Sub-Tabs */}
      <div className="segmented-control max-sm:flex-nowrap max-sm:overflow-x-auto no-scrollbar max-sm:py-1 max-sm:px-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`segmented-control-btn max-sm:shrink-0 max-sm:px-3 max-sm:py-2.5 max-sm:text-xs ${subTab === t.key ? "active" : ""}`}
            onClick={() => setSubTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* MARKTPLATZ */}
      {subTab === "market" && (
        <div className="grid gap-4">
          {/* Filter */}
          <div className="card-base flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2.5 px-3 sm:px-4 overflow-hidden">
            <span className="font-sans text-xs font-bold text-arena-muted flex items-center gap-1.5 shrink-0">
              <FunnelIcon className="h-4 w-4 text-arena-blue" />
              Plattform-Filter:
            </span>
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 py-1 w-full">
              <button
                onClick={() => setPlatformFilter("all")}
                className={`btn btn-sm shrink-0 min-h-[36px] max-sm:text-xs px-3 ${platformFilter === "all" ? "btn-primary" : ""}`}
              >
                Alle
              </button>
              {(Object.keys(PLATFORM_LABELS) as MatchPlatform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`btn btn-sm shrink-0 min-h-[36px] max-sm:text-xs px-3 ${platformFilter === p ? "btn-primary" : ""}`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {loadingOffers ? (
            <div className="card-base py-8 text-center text-arena-muted font-sans flex items-center justify-center gap-2">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-arena-blue" />
              <span>Lade Inserate …</span>
            </div>
          ) : offers.length === 0 ? (
            <div className="card-base py-10 text-center grid gap-2">
              <BookOpenIcon className="h-10 w-10 text-arena-border mx-auto" />
              <p className="font-sans font-bold text-arena-blue m-0">Noch keine Inserate vorhanden</p>
              <p className="font-sans text-sm text-arena-muted m-0">Erstelle das erste Buch-Match-Inserat!</p>
              {account && (
                <button onClick={() => setSubTab("create")} className="btn btn-primary mx-auto mt-1 text-sm min-h-[40px] px-4">
                  <PlusIcon className="h-4 w-4 mr-1" /> Inserat erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {offers.map((offer) => (
                <div key={offer.id} className="card-base flex flex-col justify-between gap-3 p-3.5 sm:p-4 hover:border-arena-blue transition-colors">
                  <div className="flex items-start gap-3">
                    {offer.bookCoverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={offer.bookCoverUrl} alt={offer.bookTitle} className="w-16 h-22 sm:w-14 sm:h-20 object-cover rounded-md border border-arena-border-light flex-shrink-0 shadow-xs" />
                    ) : (
                      <div className="w-16 h-22 sm:w-14 sm:h-20 bg-arena-bg rounded-md border border-arena-border-light flex items-center justify-center text-arena-muted flex-shrink-0">
                        <BookOpenIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="grid gap-1.5 min-w-0 flex-1">
                      <span className="font-sans text-xs font-bold text-arena-blue/80">@{offer.authorUsername}</span>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-arena-blue m-0 leading-snug break-words">{offer.bookTitle}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <PlatformBadge platform={offer.offeredPlatform} labelPrefix="Bietet" />
                        {offer.offeredFormat && (
                          <span className="font-sans text-xs text-arena-muted truncate max-w-full">({offer.offeredFormat})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PlatformBadge platform={offer.requestedPlatform} labelPrefix="Sucht" />
                        {offer.requestedFormat && (
                          <span className="font-sans text-xs text-arena-muted truncate max-w-full">({offer.requestedFormat})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {offer.notes && (
                    <p className="font-sans text-xs text-arena-muted italic p-2.5 rounded-lg bg-arena-bg/60 border border-arena-border-light/60 m-0">
                      &quot;{offer.notes}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-arena-border-light">
                    <span className="font-sans text-xs text-arena-muted">
                      {new Date(offer.createdAt).toLocaleDateString("de-DE")}
                    </span>
                    {account ? (
                      offer.authorUsername === account.username ? (
                        <span className="font-sans text-xs text-arena-muted italic px-2 py-1 bg-arena-bg rounded">Dein Inserat</span>
                      ) : (
                        <button
                          onClick={() => { setSelectedOfferForApply(offer); setApplyError(""); setApplySuccess(""); }}
                          className="btn btn-primary btn-sm min-h-[38px] px-3.5"
                        >
                          Bewerben
                        </button>
                      )
                    ) : (
                      <Link href="/auth" className="btn btn-sm min-h-[36px] text-xs no-underline flex items-center">Anmelden</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSERAT ERSTELLEN */}
      {subTab === "create" && account && (
        <div className="card-base grid gap-4">
          <div className="border-b border-arena-border-light pb-3">
            <h3 className="font-serif text-base font-bold text-arena-blue m-0">Neues Inserat erstellen</h3>
            <p className="font-sans text-xs text-arena-muted m-0 mt-1">
              Wähle dein Buch und gib an, was du anbietest und was du dir wünschst.
            </p>
          </div>

          {loadingMyBooks ? (
            <div className="py-6 text-center text-sm text-arena-muted flex items-center justify-center gap-2">
              <ArrowPathIcon className="h-4 w-4 animate-spin text-arena-blue" />
              <span>Lade deine Bücher …</span>
            </div>
          ) : myBooks.length === 0 ? (
            <div className="card-tip text-sm">
              <p className="font-sans font-bold text-arena-blue m-0 mb-1">Noch kein Buch angelegt</p>
              <p className="font-sans text-arena-muted m-0">
                Lege zuerst dein Buch unter{" "}
                <Link href="/meine-buecher" className="text-arena-link underline font-bold">Meine Bücher</Link>{" "}
                an, dann kannst du hier ein Inserat erstellen.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateOffer} className="grid gap-4">
              {createError && <div className="card-danger font-sans text-sm font-semibold">{createError}</div>}
              {createSuccess && <div className="card-base border-green-200 bg-green-50 font-sans text-sm font-semibold text-green-800">{createSuccess}</div>}

              <label className="grid gap-1">
                <span className="font-sans text-xs font-bold text-arena-text">Dein Buch *</span>
                <select value={createBookId} onChange={(e) => setCreateBookId(e.target.value)} className="input-base" required>
                  {myBooks.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}{b.genre ? ` (${b.genre})` : ""}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Ich biete Vorstellung auf *</span>
                  <select value={createOfferedPlatform} onChange={(e) => setCreateOfferedPlatform(e.target.value as MatchPlatform)} className="input-base" required>
                    {(Object.keys(PLATFORM_LABELS) as MatchPlatform[]).map((p) => (
                      <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Mein Kanal / Handle (optional)</span>
                  <input type="text" value={createChannelHandle} onChange={(e) => setCreateChannelHandle(e.target.value)} placeholder="@dein_instagram" className="input-base" />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="font-sans text-xs font-bold text-arena-text">Format meiner Vorstellung *</span>
                <input type="text" value={createOfferedFormat} onChange={(e) => setCreateOfferedFormat(e.target.value)} placeholder="z. B. Dedicated Reel + Story, Blog-Rezension" className="input-base" required />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Ich wünsche mir Vorstellung auf</span>
                  <select value={createRequestedPlatform} onChange={(e) => setCreateRequestedPlatform(e.target.value as MatchPlatform)} className="input-base">
                    {(Object.keys(PLATFORM_LABELS) as MatchPlatform[]).map((p) => (
                      <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Gewünschtes Format</span>
                  <input type="text" value={createRequestedFormat} onChange={(e) => setCreateRequestedFormat(e.target.value)} placeholder="z. B. Feed-Post, Podcast" className="input-base" />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="font-sans text-xs font-bold text-arena-text">Notizen / Wünsche (optional)</span>
                <textarea value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} rows={3} placeholder="Vorlaufzeit, bevorzugte Genres, sonstiges …" className="input-base" />
              </label>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
                <button type="button" onClick={() => setSubTab("market")} className="btn btn-sm min-h-[40px] justify-center">Abbrechen</button>
                <button type="submit" disabled={createLoading} className="btn btn-primary min-h-[44px] justify-center max-sm:w-full">
                  {createLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" /> : <PlusIcon className="h-4 w-4 mr-1" />}
                  Inserat veröffentlichen
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* BEWERBUNGEN */}
      {subTab === "applications" && account && (
        <div className="grid gap-4">
          <div className="segmented-control max-sm:flex-nowrap max-sm:overflow-x-auto no-scrollbar max-sm:py-1 max-sm:px-1">
            <button
              type="button"
              className={`segmented-control-btn max-sm:shrink-0 max-sm:px-3 max-sm:py-2.5 max-sm:text-xs ${appRole === "incoming" ? "active" : ""}`}
              onClick={() => setAppRole("incoming")}
            >
              Eingehende Bewerbungen
            </button>
            <button
              type="button"
              className={`segmented-control-btn max-sm:shrink-0 max-sm:px-3 max-sm:py-2.5 max-sm:text-xs ${appRole === "outgoing" ? "active" : ""}`}
              onClick={() => setAppRole("outgoing")}
            >
              Meine Bewerbungen
            </button>
          </div>

          {loadingApps ? (
            <div className="card-base py-8 text-center text-arena-muted font-sans flex items-center justify-center gap-2">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-arena-blue" />
              <span>Lade Bewerbungen …</span>
            </div>
          ) : applications.length === 0 ? (
            <div className="card-base py-8 text-center font-sans text-arena-muted">
              Keine Bewerbungen in dieser Kategorie vorhanden.
            </div>
          ) : (
            <div className="grid gap-3">
              {applications.map((app) => (
                <div key={app.id} className="card-base grid gap-3 p-3.5 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3 w-full sm:w-auto min-w-0">
                      {app.applicantBookCoverUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={app.applicantBookCoverUrl} alt={app.applicantBookTitle} className="w-14 h-20 object-cover rounded-md border border-arena-border-light flex-shrink-0 shadow-xs" />
                      ) : (
                        <div className="w-14 h-20 bg-arena-bg border border-arena-border-light rounded-md flex items-center justify-center text-arena-muted flex-shrink-0">
                          <BookOpenIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="grid gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-sans text-xs font-bold text-arena-blue">
                            {appRole === "incoming" ? `@${app.applicantUsername}` : `→ @${app.offerAuthorUsername}`}
                          </span>
                          <span className={`badge ${
                            app.status === "matched" ? "bg-green-100 text-green-800" :
                            app.status === "declined" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {app.status === "matched" ? "Gematcht" : app.status === "declined" ? "Abgelehnt" : "Ausstehend"}
                          </span>
                        </div>
                        <p className="font-serif font-bold text-arena-text text-base m-0 leading-snug">{app.applicantBookTitle}</p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <PlatformBadge platform={app.applicantPlatform} />
                          <span className="font-sans text-xs text-arena-muted">{app.applicantFormat}</span>
                          {app.applicantChannelHandle && (
                            <span className="font-sans text-xs font-semibold text-arena-muted">({app.applicantChannelHandle})</span>
                          )}
                        </div>
                        {app.offerBookTitle && (
                          <p className="font-sans text-xs text-arena-muted m-0 mt-0.5">Inserat: „{app.offerBookTitle}"</p>
                        )}
                      </div>
                    </div>

                    {appRole === "incoming" && app.status === "pending" && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-arena-border-light">
                        <button
                          onClick={() => handleApplicationAction(app.id, "decline")}
                          className="btn btn-sm btn-danger min-h-[40px] flex-1 sm:flex-initial justify-center"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" /> Ablehnen
                        </button>
                        <button
                          onClick={() => handleApplicationAction(app.id, "match")}
                          className="btn btn-sm btn-primary min-h-[40px] flex-1 sm:flex-initial justify-center bg-green-600 hover:bg-green-700 border-green-600"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" /> Match!
                        </button>
                      </div>
                    )}
                  </div>

                  {app.message && (
                    <p className="font-sans text-xs text-arena-muted italic p-2.5 rounded-lg bg-arena-bg/60 border border-arena-border-light/60 m-0">
                      „{app.message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MATCHES */}
      {subTab === "matches" && account && (
        <div className="grid gap-4">
          <div className="card-info flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-arena-blue shrink-0 mt-0.5" />
            <p className="font-sans text-xs sm:text-sm text-arena-text m-0 leading-relaxed">
              Nach dem Match öffnet sich ein Chat in deinen{" "}
              <Link href="/nachrichten" className="text-arena-link underline font-bold">Nachrichten</Link>.
              Tauscht dort Buchexemplare und Termine aus und tragt hier den Link zu eurer Veröffentlichung ein.
            </p>
          </div>

          {loadingMatches ? (
            <div className="card-base py-8 text-center text-arena-muted font-sans flex items-center justify-center gap-2">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-arena-blue" />
              <span>Lade Matches …</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="card-base py-8 text-center font-sans text-arena-muted">
              Noch keine aktiven Matches. Bewirb dich auf ein Inserat oder erstelle dein eigenes!
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.map((m) => (
                <div key={m.id} className="card-base grid gap-4 p-3.5 sm:p-5 border-arena-blue/30 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-arena-border-light pb-3">
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-arena-blue m-0">Match mit @{m.partnerUsername}</h3>
                      <p className="font-sans text-xs text-arena-muted m-0">
                        Seit {m.matchedAt ? new Date(m.matchedAt).toLocaleDateString("de-DE") : "kürzlich"}
                      </p>
                    </div>
                    <Link href={`/nachrichten?user=${m.partnerUsername}`} className="btn btn-sm btn-primary no-underline flex items-center justify-center gap-1.5 min-h-[40px] px-4 w-full sm:w-auto">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" /> Chat öffnen
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div className="card-info grid gap-2 p-3">
                      <span className="font-sans text-xs font-bold text-arena-muted uppercase tracking-wider">Dein Buch</span>
                      <div className="flex items-center gap-3">
                        {m.myBookCoverUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.myBookCoverUrl} alt={m.myBookTitle} className="w-10 h-14 object-cover rounded border border-arena-border-light shrink-0" />
                        ) : (
                          <div className="w-10 h-14 bg-arena-bg rounded border border-arena-border-light flex items-center justify-center text-arena-muted shrink-0">
                            <BookOpenIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-arena-blue text-sm m-0 truncate">{m.myBookTitle}</p>
                          <div className="mt-1">
                            <PlatformBadge platform={m.partnerPlatform} labelPrefix="Partner stellt vor auf" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card-info grid gap-2 p-3">
                      <span className="font-sans text-xs font-bold text-arena-muted uppercase tracking-wider">Buch von @{m.partnerUsername}</span>
                      <div className="flex items-center gap-3">
                        {m.partnerBookCoverUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.partnerBookCoverUrl} alt={m.partnerBookTitle} className="w-10 h-14 object-cover rounded border border-arena-border-light shrink-0" />
                        ) : (
                          <div className="w-10 h-14 bg-arena-bg rounded border border-arena-border-light flex items-center justify-center text-arena-muted shrink-0">
                            <BookOpenIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-arena-blue text-sm m-0 truncate">{m.partnerBookTitle}</p>
                          <div className="mt-1">
                            <PlatformBadge platform={m.myPlatform} labelPrefix="Du stellst vor auf" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Veröffentlichungslinks */}
                  <div className="card-base border-arena-border-light grid gap-3 p-3.5 sm:p-4 bg-arena-bg/40">
                    <h4 className="font-sans text-xs font-bold text-arena-text uppercase tracking-wider m-0">Veröffentlichungsnachweis</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="grid gap-1">
                        <label className="font-sans text-xs font-bold text-arena-muted">Dein Beitrags-Link:</label>
                        {(m.isOwner ? m.publishedUrlOwner : m.publishedUrlApplicant) ? (
                          <a href={m.isOwner ? m.publishedUrlOwner : m.publishedUrlApplicant} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-arena-link font-semibold underline break-all">
                            <LinkIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{m.isOwner ? m.publishedUrlOwner : m.publishedUrlApplicant}</span>
                          </a>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="url"
                              placeholder="https://..."
                              value={publishUrlInput[m.id] || ""}
                              onChange={(e) => setPublishUrlInput({ ...publishUrlInput, [m.id]: e.target.value })}
                              className="input-base text-sm flex-1"
                            />
                            <button
                              onClick={() => handleSavePublishUrl(m.id)}
                              disabled={publishingId === m.id}
                              className="btn btn-primary btn-sm min-h-[40px] shrink-0 justify-center w-full sm:w-auto px-4"
                            >
                              {publishingId === m.id ? "…" : "Speichern"}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-1">
                        <label className="font-sans text-xs font-bold text-arena-muted">Link von @{m.partnerUsername}:</label>
                        {(m.isOwner ? m.publishedUrlApplicant : m.publishedUrlOwner) ? (
                          <a href={m.isOwner ? m.publishedUrlApplicant : m.publishedUrlOwner} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-arena-link font-semibold underline break-all">
                            <LinkIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{m.isOwner ? m.publishedUrlApplicant : m.publishedUrlOwner}</span>
                          </a>
                        ) : (
                          <span className="font-sans text-xs text-arena-muted italic py-1">Noch nicht eingetragen</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPLY MODAL */}
      {selectedOfferForApply && account && (
        <div className="overlay-backdrop flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="card grid gap-4 max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-arena-border-light pb-3">
              <h3 className="font-serif text-base sm:text-lg font-bold text-arena-blue m-0">Jetzt bewerben</h3>
              <button onClick={() => setSelectedOfferForApply(null)} className="btn btn-sm p-1 min-h-[38px] min-w-[38px] flex items-center justify-center">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="card-info text-sm p-3">
              <p className="font-sans text-xs font-bold text-arena-blue m-0">@{selectedOfferForApply.authorUsername}:</p>
              <p className="font-serif font-bold text-arena-text text-base m-0 leading-tight">{selectedOfferForApply.bookTitle}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <PlatformBadge platform={selectedOfferForApply.offeredPlatform} labelPrefix="Bietet" />
                {selectedOfferForApply.offeredFormat && (
                  <span className="font-sans text-xs text-arena-muted">({selectedOfferForApply.offeredFormat})</span>
                )}
              </div>
            </div>

            {myBooks.length === 0 ? (
              <div className="card-tip text-sm">
                <p className="font-sans m-0">Lege zuerst dein Buch unter <Link href="/meine-buecher" className="underline text-arena-link font-bold">Meine Bücher</Link> an.</p>
              </div>
            ) : (
              <form onSubmit={handleApply} className="grid gap-4">
                {applyError && <div className="card-danger font-sans text-sm font-semibold">{applyError}</div>}
                {applySuccess && <div className="card-base border-green-200 bg-green-50 font-sans text-sm font-semibold text-green-800">{applySuccess}</div>}

                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Dein Buch *</span>
                  <select value={applyBookId} onChange={(e) => setApplyBookId(e.target.value)} className="input-base" required>
                    {myBooks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <span className="font-sans text-xs font-bold text-arena-text">Meine Plattform *</span>
                    <select value={applyPlatform} onChange={(e) => setApplyPlatform(e.target.value as MatchPlatform)} className="input-base" required>
                      {(Object.keys(PLATFORM_LABELS) as MatchPlatform[]).map((p) => (
                        <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="font-sans text-xs font-bold text-arena-text">Kanal / Handle</span>
                    <input type="text" value={applyChannelHandle} onChange={(e) => setApplyChannelHandle(e.target.value)} placeholder="@dein_account" className="input-base" />
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Mein Vorstellungsformat *</span>
                  <input type="text" value={applyFormat} onChange={(e) => setApplyFormat(e.target.value)} placeholder="z. B. Reel Unboxing + Story" className="input-base" required />
                </label>

                <label className="grid gap-1">
                  <span className="font-sans text-xs font-bold text-arena-text">Persönliche Nachricht (optional)</span>
                  <textarea value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} rows={3} placeholder="Kurze Vorstellung …" className="input-base" />
                </label>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
                  <button type="button" onClick={() => setSelectedOfferForApply(null)} className="btn btn-sm min-h-[40px] justify-center">Abbrechen</button>
                  <button type="submit" disabled={applyLoading} className="btn btn-primary min-h-[44px] justify-center max-sm:w-full">
                    {applyLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" /> : null}
                    Bewerbung absenden
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
