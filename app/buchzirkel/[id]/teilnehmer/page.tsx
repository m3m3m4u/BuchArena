"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";
import { ALLOWED_BEITRAG_EMOJIS } from "@/lib/buchzirkel";
import { CommentToolbar } from "@/app/components/comment-toolbar";
import dynamic from "next/dynamic";

const EpubReader = dynamic(() => import("@/app/components/EpubReader"), { ssr: false });

type Topic = { id: string; titel: string; typ: string };
type Leseabschnitt = { id: string; titel: string; deadline: string };
type Datei = { id: string; originalName: string; abschnittId?: string };
type Beitrag = {
  _id: string;
  topicId: string;
  autorUsername: string;
  titel?: string;
  body: string;
  reactions: { username: string; emoji: string }[];
  replies: { _id: string; autorUsername: string; body: string; createdAt: string; reactions: { username: string; emoji: string }[] }[];
  imTreffpunktGeteilt: boolean;
  inBuchbeschreibungGeteilt: boolean;
  createdAt: string;
};

type Zirkel = {
  _id: string;
  typ: "testleser" | "betaleser";
  titel: string;
  status: string;
  veranstalterUsername: string;
  diskussionsTopics: Topic[];
  leseabschnitte: Leseabschnitt[];
  fragebogen: { id: string; frage: string }[];
  dateien: Datei[];
  isVeranstalter: boolean;
  isTeilnehmer: boolean;
  buchformateAngebot?: string[];
};

type Teilnahme = {
  abgeschlosseneAbschnitte: string[];
  rezensionsLinks: { plattform: string; url: string; eingetragen: string }[];
  fragebogenAntworten: { frageId: string; antwort: string }[];
};

type LesePosition = { cfi?: string; pdfPage?: number };

export default function TeilnehmerBereichPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const account = getStoredAccount();

  const [zirkel, setZirkel] = useState<Zirkel | null>(null);
  const [teilnahme, setTeilnahme] = useState<Teilnahme | null>(null);
  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [neuerBeitrag, setNeuerBeitrag] = useState("");
  const [neuerBeitragTitel, setNeuerBeitragTitel] = useState("");
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"diskussion" | "dateien" | "fortschritt" | "fragebogen" | "rezensionen" | "chat">(
    (searchParams.get("tab") as "chat" | null) === "chat" ? "chat" : "diskussion"
  );
  const [epubReaderUrl, setEpubReaderUrl] = useState<string | null>(null);
  const [epubReaderDateiId, setEpubReaderDateiId] = useState<string | null>(null);

  // Leseposition: EPUB-CFI und PDF-Seite pro Datei-ID (server-seitig)
  const [lesePositionen, setLesePositionen] = useState<Record<string, LesePosition>>({});
  const getSavedCfi  = (dateiId: string) => lesePositionen[dateiId]?.cfi;
  const getSavedPage = (dateiId: string) => lesePositionen[dateiId]?.pdfPage ?? 1;
  const [pdfPageInput, setPdfPageInput] = useState<Record<string, string>>({});

  // Gruppen-Chat
  type ChatMsg = { id: string; senderUsername: string; body: string; createdAt: string };
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Thema hinzufügen (nur Veranstalter)
  const [neuesTopicTitel, setNeuesTopicTitel] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);

  // Rezensions-Links
  const [rlPlattform, setRlPlattform] = useState("");
  const [rlUrl, setRlUrl] = useState("");
  const [rlSaving, setRlSaving] = useState(false);

  const load = useCallback(async () => {
    const [zRes, tRes, lpRes] = await Promise.all([
      fetch(`/api/buchzirkel/${params.id}`),
      fetch(`/api/buchzirkel/${params.id}/meine-teilnahme`),
      fetch(`/api/buchzirkel/${params.id}/leseposition`),
    ]);
    const zData = await zRes.json() as { zirkel?: Zirkel };
    const tData = await tRes.json() as { teilnahme?: Teilnahme };
    const lpData = await lpRes.json() as { lesePositionen?: Record<string, LesePosition> };
    setZirkel(zData.zirkel ?? null);
    setTeilnahme(tData.teilnahme ?? null);
    setLesePositionen(lpData.lesePositionen ?? {});
    if (zData.zirkel?.diskussionsTopics?.[0]) {
      setActiveTopic(zData.zirkel.diskussionsTopics[0].id);
    }
    setLoading(false);
  }, [params.id]);

  /** Leseposition auf dem Server speichern (fire-and-forget) */
  const saveLeseposition = useCallback((dateiId: string, update: LesePosition) => {
    setLesePositionen((prev) => ({
      ...prev,
      [dateiId]: { ...prev[dateiId], ...update },
    }));
    fetch(`/api/buchzirkel/${params.id}/leseposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateiId, ...update }),
    }).catch(() => { /* Netzwerkfehler ignorieren */ });
  }, [params.id]);

  const loadBeitraege = useCallback(async (topicId: string) => {
    const res = await fetch(`/api/buchzirkel/${params.id}/beitraege?topicId=${topicId}`);
    const data = await res.json() as { beitraege?: Beitrag[] };
    setBeitraege(data.beitraege ?? []);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTopic) loadBeitraege(activeTopic); }, [activeTopic, loadBeitraege]);

  const loadChat = useCallback(async () => {
    const res = await fetch(`/api/buchzirkel/${params.id}/chat`);
    const data = await res.json() as { messages?: ChatMsg[] };
    setChatMessages(data.messages ?? []);
  }, [params.id]);

  useEffect(() => {
    if (tab === "chat") {
      void loadChat();
    }
  }, [tab, loadChat]);

  // Auto-scroll bei neuen Chat-Nachrichten
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function postBeitrag(e: React.FormEvent) {
    e.preventDefault();
    if (!neuerBeitrag.trim()) return;
    setPosting(true);
    await fetch(`/api/buchzirkel/${params.id}/beitraege`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: activeTopic, titel: neuerBeitragTitel.trim() || undefined, body: neuerBeitrag.trim() }),
    });
    setNeuerBeitrag("");
    setNeuerBeitragTitel("");
    await loadBeitraege(activeTopic);
    setPosting(false);
  }

  async function toggleFortschritt(abschnittId: string) {
    await fetch(`/api/buchzirkel/${params.id}/fortschritt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abschnittId }),
    });
    await load();
  }

  async function addRezensionsLink(e: React.FormEvent) {
    e.preventDefault();
    if (!rlPlattform || !rlUrl) return;
    setRlSaving(true);
    await fetch(`/api/buchzirkel/${params.id}/rezension-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plattform: rlPlattform, url: rlUrl }),
    });
    setRlPlattform("");
    setRlUrl("");
    await load();
    setRlSaving(false);
  }

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!neuesTopicTitel.trim() || !zirkel) return;
    setAddingTopic(true);
    const newTopic = { id: crypto.randomUUID(), titel: neuesTopicTitel.trim(), typ: "allgemein" };
    const updatedTopics = [...zirkel.diskussionsTopics, newTopic];
    await fetch(`/api/buchzirkel/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diskussionsTopics: updatedTopics }),
    });
    setNeuesTopicTitel("");
    setAddingTopic(false);
    await load();
    setActiveTopic(newTopic.id);
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/buchzirkel/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: chatInput.trim() }),
      });
      const data = await res.json() as { message?: ChatMsg };
      if (res.ok && data.message) {
        setChatMessages((prev) => [...prev, data.message!]);
        setChatInput("");
      }
    } catch { /* ignore */ } finally {
      setChatSending(false);
    }
  }

  async function react(beitragId: string, emoji: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    await loadBeitraege(activeTopic);
  }

  async function reply(beitragId: string, body: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    await loadBeitraege(activeTopic);
  }

  async function editBeitrag(beitragId: string, body: string, titel?: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit-beitrag", body, titel }),
    });
    await loadBeitraege(activeTopic);
  }

  async function editReply(beitragId: string, replyId: string, body: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit-reply", replyId, body }),
    });
    await loadBeitraege(activeTopic);
  }

  async function treffpunktTeilen(beitragId: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teilen: "treffpunkt" }),
    });
    await loadBeitraege(activeTopic);
  }

  if (loading || !account) return <main className="top-centered-main"><p className="text-arena-muted text-center py-8">Wird geladen…</p></main>;
  if (!zirkel?.isTeilnehmer && !zirkel?.isVeranstalter) {
    return (
      <main className="top-centered-main">
        <section className="card text-center py-8">
          <p className="text-arena-muted">Du hast keinen Zugang zu diesem Buchzirkel.</p>
          <Link href={`/buchzirkel/${params.id}`} className="text-arena-blue hover:underline text-sm mt-2 block">← Zur Zirkel-Seite</Link>
        </section>
      </main>
    );
  }

  const abgeschlossen = teilnahme?.abgeschlosseneAbschnitte ?? [];
  const fortschrittProzent = zirkel.leseabschnitte.length > 0
    ? Math.round((abgeschlossen.length / zirkel.leseabschnitte.length) * 100)
    : 0;

  return (
    <main className="top-centered-main">
      {/* Header */}
      <section className="card">
        <Link href={`/buchzirkel/${zirkel._id}`} className="text-arena-muted text-xs hover:underline">← Zurück</Link>
        <div className="flex items-center justify-between gap-3 mt-1 flex-wrap">
          <h1 className="text-xl font-bold m-0">{zirkel.titel}</h1>
          {zirkel.isVeranstalter && (
            <Link href={`/buchzirkel/${zirkel._id}/dashboard`} className="btn btn-secondary btn-sm">Dashboard →</Link>
          )}
        </div>
        {zirkel.leseabschnitte.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-arena-muted mb-1">
              <span>Lesefortschritt</span>
              <span>{abgeschlossen.length}/{zirkel.leseabschnitte.length} Abschnitte · {fortschrittProzent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-arena-blue transition-all" style={{ width: `${fortschrittProzent}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <nav className="flex gap-0 mt-3 border-b border-arena-border-light overflow-x-auto">
        {[
          { key: "diskussion" as const, label: "Diskussion" },
          { key: "chat" as const, label: "Gruppen-Chat" },
          { key: "dateien" as const, label: "Dateien" },
          { key: "fortschritt" as const, label: "Fortschritt" },
          { key: "rezensionen" as const, label: "Rezensionen" },
          ...(zirkel.fragebogen.length > 0 ? [{ key: "fragebogen" as const, label: "Fragebogen" }] : []),
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? "border-arena-blue text-arena-blue" : "border-transparent text-arena-muted hover:text-arena-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Diskussion */}
      {tab === "diskussion" && (
        <div className="w-full flex gap-4 mt-3 max-sm:flex-col">
          {/* Topic-Sidebar */}
          <aside className="w-48 max-sm:w-full flex-shrink-0">
            <p className="text-xs text-arena-muted mb-2 max-sm:hidden">Wähle einen Themenbereich:</p>
            <div className="flex flex-col gap-1 max-sm:flex-row max-sm:flex-wrap">
              {zirkel.diskussionsTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTopic(t.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors max-sm:px-2.5 ${
                    activeTopic === t.id ? "bg-arena-blue text-white" : "hover:bg-gray-100 text-arena-muted"
                  }`}
                >
                  {t.titel}
                </button>
              ))}
            </div>
            {zirkel.isVeranstalter && (
              <form onSubmit={addTopic} className="mt-2 flex gap-1">
                <input
                  className="input-base flex-1 text-sm"
                  placeholder="Neues Thema…"
                  value={neuesTopicTitel}
                  onChange={(e) => setNeuesTopicTitel(e.target.value)}
                  maxLength={80}
                />
                <button
                  type="submit"
                  disabled={addingTopic || !neuesTopicTitel.trim()}
                  className="btn btn-sm btn-primary !px-2.5"
                  title="Thema hinzufügen"
                >
                  +
                </button>
              </form>
            )}
          </aside>

          {/* Beiträge */}
          <div className="flex-1 min-w-0">
            {/* Neuer Beitrag */}
            <form onSubmit={postBeitrag} className="card mb-3 flex flex-col gap-2">
              <input
                className="input text-sm"
                placeholder="Titel (optional)"
                value={neuerBeitragTitel}
                onChange={(e) => setNeuerBeitragTitel(e.target.value)}
              />
              <textarea
                className="input text-sm"
                rows={3}
                placeholder="Schreibe einen Beitrag…"
                value={neuerBeitrag}
                onChange={(e) => setNeuerBeitrag(e.target.value)}
              />
              <button type="submit" disabled={posting || !neuerBeitrag.trim()} className="btn btn-primary btn-sm self-end">
                {posting ? "Wird gepostet…" : "Beitrag posten"}
              </button>
            </form>

            {/* Beitrags-Liste */}
            {beitraege.length === 0 ? (
              <p className="text-arena-muted text-sm text-center py-4">Noch keine Beiträge in diesem Topic.</p>
            ) : (
              beitraege.map((b) => (
                <BeitragKarte
                  key={b._id}
                  beitrag={b}
                  username={account.username}
                  veranstalterUsername={zirkel.veranstalterUsername}
                  isVeranstalter={zirkel.isVeranstalter}
                  onReact={(emoji) => react(b._id, emoji)}
                  onTreffpunkt={() => treffpunktTeilen(b._id)}
                  onReply={(body) => reply(b._id, body)}
                  onEditBeitrag={(body, titel) => editBeitrag(b._id, body, titel)}
                  onEditReply={(replyId, body) => editReply(b._id, replyId, body)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Gruppen-Chat */}
      {tab === "chat" && (
        <section className="mt-3 w-full border border-arena-border rounded-xl overflow-hidden flex flex-col bg-white" style={{ minHeight: 420 }}>
          {/* Nachrichten-Bereich */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0" style={{ minHeight: 300, maxHeight: "55vh" }}>
            {chatMessages.length === 0 ? (
              <p className="text-arena-muted text-sm text-center my-auto py-8">
                Noch keine Nachrichten. Schreib etwas!
              </p>
            ) : (
              <>
                <div className="flex-1" />
                {chatMessages.map((msg) => {
                const isMine = msg.senderUsername === account.username;
                const isAutor = msg.senderUsername === zirkel.veranstalterUsername;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5 group`}>
                    <div className={`relative max-w-[80%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-[0.95rem] ${
                      isMine
                        ? "bg-arena-blue text-white rounded-br-md"
                        : isAutor
                          ? "bg-amber-50 border border-amber-200 text-gray-900 rounded-bl-md"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                    }`}>
                      {!isMine && (
                        <p className={`text-[11px] font-semibold m-0 mb-0.5 ${isAutor ? "text-amber-700" : "text-arena-blue"}`}>
                          {msg.senderUsername}{isAutor ? " ✍️" : ""}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap m-0" style={{ lineHeight: 1.5 }}>{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${isMine ? "text-white/50" : "text-arena-muted"}`}>
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Eingabe */}
          <div className="border-t border-arena-border px-4 py-3 bg-gray-50">
            <form onSubmit={sendChat} className="flex gap-2 items-end">
              <textarea
                className="input-base flex-1 resize-none"
                rows={1}
                placeholder="Nachricht an Gruppe…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat(e as unknown as React.FormEvent);
                  }
                }}
                style={{ minHeight: 40, maxHeight: 120 }}
              />
              <button
                type="submit"
                disabled={chatSending || !chatInput.trim()}
                className="btn btn-primary btn-sm !py-2 !px-4"
              >
                {chatSending ? "…" : "↑"}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* EPUB Reader Modal */}
      {epubReaderUrl && (
        <EpubReader
          url={epubReaderUrl}
          initialCfi={epubReaderDateiId ? getSavedCfi(epubReaderDateiId) : undefined}
          onCfiChange={(cfi) => {
            if (epubReaderDateiId) saveLeseposition(epubReaderDateiId, { cfi });
          }}
          onClose={() => { setEpubReaderUrl(null); setEpubReaderDateiId(null); }}
        />
      )}

      {/* Dateien / PDF-Viewer */}
      {tab === "dateien" && (
        <section className="card mt-3">
          <p className="text-sm text-arena-muted m-0 mb-3">Hier findest du das Manuskript oder Buch. Jede Datei ist mit deinem persönlichen Wasserzeichen versehen – bitte nicht weitergeben.</p>
          {zirkel.dateien.length === 0 ? (
            <p className="text-arena-muted text-sm">Noch keine Dateien hochgeladen.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {zirkel.dateien.map((d) => {
                const isEpub = d.originalName.toLowerCase().endsWith(".epub");
                const isPdf = d.originalName.toLowerCase().endsWith(".pdf");
                const dateiUrl = `/api/buchzirkel/${zirkel._id}/datei/${d.id}`;
                const savedPage = getSavedPage(d.id);
                const pdfInput = pdfPageInput[d.id] ?? "";
                const activePdfPage = Number(pdfInput) > 0 ? Number(pdfInput) : savedPage;
                const savedCfi = getSavedCfi(d.id);                return (
                  <div key={d.id} className="border border-arena-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{isEpub ? "📖" : "📄"}</span>
                        <span className="font-medium text-sm">{d.originalName}</span>
                        {isEpub && savedCfi && (
                          <span className="text-xs text-arena-muted">(letzte Position gespeichert)</span>
                        )}
                        {isPdf && savedPage > 1 && (
                          <span className="text-xs text-arena-muted">(zuletzt: Seite {savedPage})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEpub && (
                          <button
                            onClick={() => { setEpubReaderUrl(dateiUrl); setEpubReaderDateiId(d.id); }}
                            className="btn btn-primary btn-sm"
                          >
                            {savedCfi ? "Weiterlesen" : "Im Browser lesen"}
                          </button>
                        )}
                        {isPdf && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-arena-muted">Seite:</span>
                            <input
                              type="number"
                              min={1}
                              value={pdfInput}
                              placeholder={String(savedPage)}
                              onChange={(e) => setPdfPageInput((prev) => ({ ...prev, [d.id]: e.target.value }))}
                              onBlur={(e) => {
                                const n = Number(e.target.value);
                                if (n > 0) saveLeseposition(d.id, { pdfPage: n });
                              }}
                              className="input text-sm w-16 py-1"
                            />
                          </div>
                        )}
                        {isPdf && (
                          <a
                            href={`${dateiUrl}#page=${activePdfPage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            Im Viewer öffnen ↗
                          </a>
                        )}
                        <a
                          href={dateiUrl}
                          download={d.originalName}
                          className="btn btn-secondary btn-sm"
                        >
                          ⬇ Herunterladen
                        </a>
                      </div>
                    </div>
                    {isPdf && (
                      <iframe
                        key={activePdfPage}
                        src={`${dateiUrl}#page=${activePdfPage}`}
                        className="w-full"
                        style={{ height: "70vh" }}
                        title={d.originalName}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Fortschritt */}
      {tab === "fortschritt" && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-1">Leseabschnitte</h2>
          <p className="text-sm text-arena-muted m-0 mb-3">Markiere jeden Abschnitt als gelesen, sobald du ihn abgeschlossen hast. Der Autor kann deinen Fortschritt im Dashboard einsehen.</p>
          {zirkel.leseabschnitte.length === 0 ? (
            <p className="text-arena-muted text-sm">Keine Leseabschnitte definiert.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {zirkel.leseabschnitte.map((a) => {
                const done = abgeschlossen.includes(a.id);
                const deadline = new Date(a.deadline);
                const fällig = deadline < new Date() && !done;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                      done ? "bg-green-50 border-green-200" : fällig ? "bg-red-50 border-red-200" : "border-arena-border-light"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm m-0">{a.titel}</p>
                      <p className={`text-xs m-0 mt-0.5 ${fällig ? "text-red-600 font-medium" : "text-arena-muted"}`}>
                        {deadline.toLocaleDateString("de-AT")} {fällig ? "– Überfällig!" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFortschritt(a.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        done ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-100 text-arena-text hover:bg-gray-200"
                      }`}
                    >
                      {done ? "✅ Gelesen" : "Als gelesen markieren"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Rezensions-Links */}
      {tab === "rezensionen" && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-1">Rezensions-Links</h2>
          <p className="text-sm text-arena-muted m-0 mb-3">Hast du eine Rezension auf Amazon, Goodreads oder einer anderen Plattform veröffentlicht? Trage den Link hier ein – der Autor kann die Links im Dashboard einsehen.</p>
          {teilnahme?.rezensionsLinks.map((r, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 text-sm">
              <span className="font-medium">{r.plattform}:</span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-arena-blue hover:underline truncate">{r.url}</a>
            </div>
          ))}
          <form onSubmit={addRezensionsLink} className="flex gap-2 mt-3 flex-wrap">
            <input
              className="input w-36"
              placeholder="Plattform (Amazon…)"
              value={rlPlattform}
              onChange={(e) => setRlPlattform(e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="https://…"
              type="url"
              value={rlUrl}
              onChange={(e) => setRlUrl(e.target.value)}
            />
            <button type="submit" disabled={rlSaving} className="btn btn-primary btn-sm">
              Hinzufügen
            </button>
          </form>
        </section>
      )}

      {/* Fragebogen */}
      {tab === "fragebogen" && zirkel.fragebogen.length > 0 && (
        <FragebogenTab
          zirkelId={zirkel._id}
          fragen={zirkel.fragebogen}
          bestehend={teilnahme?.fragebogenAntworten ?? []}
          onSaved={load}
        />
      )}
    </main>
  );
}

// ── timeAgo ─────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
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

// ── Beitrag-Karte ─────────────────────────────────────────────────────────

function BeitragKarte({
  beitrag,
  username,
  veranstalterUsername,
  isVeranstalter,
  onReact,
  onTreffpunkt,
  onReply,
  onEditBeitrag,
  onEditReply,
}: {
  beitrag: Beitrag;
  username: string;
  veranstalterUsername: string;
  isVeranstalter: boolean;
  onReact: (emoji: string) => void;
  onTreffpunkt: () => void;
  onReply: (body: string) => Promise<void>;
  onEditBeitrag: (body: string, titel?: string) => Promise<void>;
  onEditReply: (replyId: string, body: string) => Promise<void>;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingBeitrag, setEditingBeitrag] = useState(false);
  const [editBeitragBody, setEditBeitragBody] = useState("");
  const [editBeitragTitel, setEditBeitragTitel] = useState("");
  const [savingBeitrag, setSavingBeitrag] = useState(false);
  const editBeitragRef = useRef<HTMLTextAreaElement>(null);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyBody, setEditReplyBody] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const editReplyRef = useRef<HTMLTextAreaElement>(null);

  const isAutor = (u: string) => u === veranstalterUsername;

  async function submitReply() {
    if (!replyText.trim()) return;
    setPostingReply(true);
    await onReply(replyText.trim());
    setReplyText("");
    setShowReplyBox(false);
    setPostingReply(false);
  }

  async function saveBeitragEdit() {
    if (!editBeitragBody.trim()) return;
    setSavingBeitrag(true);
    await onEditBeitrag(editBeitragBody.trim(), editBeitragTitel.trim() || undefined);
    setEditingBeitrag(false);
    setSavingBeitrag(false);
  }

  async function saveReplyEdit(replyId: string) {
    if (!editReplyBody.trim()) return;
    setSavingReply(true);
    await onEditReply(replyId, editReplyBody.trim());
    setEditingReplyId(null);
    setSavingReply(false);
  }

  function emojiCount(emoji: string) {
    return beitrag.reactions.filter((r) => r.emoji === emoji).length;
  }

  return (
    <article className="rounded-xl border border-arena-border-light p-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${isAutor(beitrag.autorUsername) ? "bg-amber-500" : "bg-arena-blue"}`}>
            {beitrag.autorUsername[0]?.toUpperCase()}
          </div>
          <strong className="text-sm">{beitrag.autorUsername}</strong>
          {isAutor(beitrag.autorUsername) && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">✍️ Autor</span>
          )}
          {beitrag.imTreffpunktGeteilt && (
            <span className="text-xs bg-arena-yellow/20 text-arena-blue px-1.5 py-0.5 rounded">Im Treffpunkt</span>
          )}
        </div>
        <span className="text-xs text-arena-muted flex-shrink-0">{timeAgo(beitrag.createdAt)}</span>
      </div>

      {/* Body (oder Edit-Formular) */}
      {editingBeitrag ? (
        <div className="mt-1 pl-3 border-l-2 border-arena-blue/30 grid gap-2">
          <input
            className="input-base text-sm"
            placeholder="Titel (optional)"
            value={editBeitragTitel}
            onChange={(e) => setEditBeitragTitel(e.target.value)}
          />
          <textarea
            ref={editBeitragRef}
            className="input-base text-sm"
            rows={4}
            value={editBeitragBody}
            onChange={(e) => setEditBeitragBody(e.target.value)}
            maxLength={5000}
            autoFocus
          />
          <CommentToolbar textareaRef={editBeitragRef} value={editBeitragBody} onChange={setEditBeitragBody} />
          <div className="flex gap-2">
            <button type="button" onClick={saveBeitragEdit} disabled={savingBeitrag || !editBeitragBody.trim()} className="btn btn-sm">
              {savingBeitrag ? "Wird gespeichert…" : "Speichern"}
            </button>
            <button type="button" onClick={() => setEditingBeitrag(false)} className="btn btn-sm">Abbrechen</button>
          </div>
        </div>
      ) : (
        <>
          {beitrag.titel && <p className="font-semibold text-sm m-0 mb-1">{beitrag.titel}</p>}
          <p className="text-[0.95rem] m-0 whitespace-pre-wrap leading-relaxed">{beitrag.body}</p>
        </>
      )}

      {/* Reaktionen + Aktionen */}
      <div className="flex flex-wrap gap-1.5 mt-3 items-center">
        {ALLOWED_BEITRAG_EMOJIS.map((emoji) => {
          const count = emojiCount(emoji);
          const myReact = beitrag.reactions.some((r) => r.username === username && r.emoji === emoji);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border cursor-pointer transition-colors ${
                myReact
                  ? "bg-arena-blue/10 border-arena-blue text-arena-blue"
                  : "bg-gray-50 border-arena-border-light text-arena-text hover:bg-gray-100"
              }`}
            >
              {emoji}{count > 0 && <span className="text-xs font-medium">{count}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { setShowReplyBox((v) => !v); setReplyText(""); }}
          className="btn btn-sm text-xs"
        >
          {showReplyBox ? "Abbrechen" : "Antworten"}
        </button>
        {beitrag.autorUsername === username && !editingBeitrag && (
          <button
            type="button"
            onClick={() => {
              setEditBeitragBody(beitrag.body);
              setEditBeitragTitel(beitrag.titel ?? "");
              setEditingBeitrag(true);
              setShowReplyBox(false);
            }}
            className="btn btn-sm text-xs"
          >
            Bearbeiten
          </button>
        )}
        {isVeranstalter && !beitrag.imTreffpunktGeteilt && (
          <button type="button" onClick={onTreffpunkt} className="btn btn-sm text-xs">
            Im Treffpunkt teilen
          </button>
        )}
      </div>

      {/* Reply-Formular */}
      {showReplyBox && (
        <div className="mt-3 pl-3 border-l-2 border-arena-blue/30 grid gap-2">
          <textarea
            ref={replyTextareaRef}
            className="input-base text-sm"
            rows={3}
            placeholder="Deine Antwort…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <CommentToolbar
            textareaRef={replyTextareaRef}
            value={replyText}
            onChange={setReplyText}
          />
          <div className="flex gap-2">
            <button type="button" onClick={submitReply} disabled={postingReply || !replyText.trim()} className="btn btn-sm">
              {postingReply ? "Wird gesendet…" : "Absenden"}
            </button>
            <button type="button" onClick={() => { setShowReplyBox(false); setReplyText(""); }} className="btn btn-sm">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Antworten */}
      {beitrag.replies.length > 0 && (
        <div className="mt-4 grid gap-2">
          <p className="text-xs text-arena-muted m-0">
            {beitrag.replies.length} {beitrag.replies.length === 1 ? "Antwort" : "Antworten"}
          </p>
          {beitrag.replies.map((r) => (
            <div key={r._id}>
              <article className="rounded-lg border border-arena-border-light p-3 ml-3 sm:ml-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${isAutor(r.autorUsername) ? "bg-amber-500" : "bg-arena-blue"}`}>
                      {r.autorUsername[0]?.toUpperCase()}
                    </div>
                    <strong className="text-sm">{r.autorUsername}</strong>
                    {isAutor(r.autorUsername) && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">✍️ Autor</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-arena-muted">{timeAgo(r.createdAt)}</span>
                    {r.autorUsername === username && editingReplyId !== r._id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReplyId(r._id);
                          setEditReplyBody(r.body);
                        }}
                        className="btn btn-sm text-xs"
                      >
                        Bearbeiten
                      </button>
                    )}
                  </div>
                </div>
                {editingReplyId === r._id ? (
                  <div className="pl-2 border-l-2 border-arena-blue/30 grid gap-2 mt-1">
                    <textarea
                      ref={editReplyRef}
                      className="input-base text-sm"
                      rows={3}
                      value={editReplyBody}
                      onChange={(e) => setEditReplyBody(e.target.value)}
                      maxLength={2000}
                      autoFocus
                    />
                    <CommentToolbar textareaRef={editReplyRef} value={editReplyBody} onChange={setEditReplyBody} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveReplyEdit(r._id)} disabled={savingReply || !editReplyBody.trim()} className="btn btn-sm">
                        {savingReply ? "Wird gespeichert…" : "Speichern"}
                      </button>
                      <button type="button" onClick={() => { setEditingReplyId(null); setEditReplyBody(""); }} className="btn btn-sm">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[0.95rem] m-0 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                )}
              </article>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

// ── Fragebogen-Tab ────────────────────────────────────────────────────────

function FragebogenTab({
  zirkelId,
  fragen,
  bestehend,
  onSaved,
}: {
  zirkelId: string;
  fragen: { id: string; frage: string }[];
  bestehend: { frageId: string; antwort: string }[];
  onSaved: () => void;
}) {
  const hatAntworten = bestehend.length > 0 && bestehend.some((a) => a.antwort.trim() !== "");
  const [editMode, setEditMode] = useState(!hatAntworten);
  const [antworten, setAntworten] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const a of bestehend) m[a.frageId] = a.antwort;
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync wenn bestehend sich von außen ändert (z. B. nach onSaved + load())
  useEffect(() => {
    const m: Record<string, string> = {};
    for (const a of bestehend) m[a.frageId] = a.antwort;
    setAntworten(m);
  }, [bestehend]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/buchzirkel/${zirkelId}/fragebogen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        antworten: Object.entries(antworten).map(([frageId, antwort]) => ({ frageId, antwort })),
      }),
    });
    setSaving(false);
    setSaved(true);
    setEditMode(false);
    onSaved();
  }

  // Lesemodus: gespeicherte Antworten anzeigen
  if (!editMode) {
    return (
      <section className="card mt-3">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold m-0">📝 Abschluss-Fragebogen</h2>
            <p className="text-sm text-arena-muted m-0 mt-0.5">Deine gespeicherten Antworten</p>
          </div>
          <button
            type="button"
            onClick={() => { setSaved(false); setEditMode(true); }}
            className="btn btn-secondary btn-sm"
          >
            ✏️ Antworten bearbeiten
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {fragen.map((f) => {
            const antwort = antworten[f.id] ?? "";
            return (
              <div key={f.id} className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-arena-text m-0">{f.frage}</p>
                {antwort.trim() ? (
                  <p className="text-sm text-arena-text m-0 whitespace-pre-wrap bg-gray-50 border border-arena-border-light rounded-lg px-3 py-2.5">{antwort}</p>
                ) : (
                  <p className="text-sm text-arena-muted m-0 italic">Noch keine Antwort eingetragen.</p>
                )}
              </div>
            );
          })}
        </div>
        {saved && <p className="text-green-700 text-sm mt-3">✅ Antworten wurden gespeichert.</p>}
      </section>
    );
  }

  // Bearbeitungsmodus
  return (
    <section className="card mt-3">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="text-base font-semibold m-0">📝 Abschluss-Fragebogen</h2>
        {hatAntworten && (
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="btn btn-secondary btn-sm"
          >
            Abbrechen
          </button>
        )}
      </div>
      <p className="text-sm text-arena-muted m-0 mb-4">Der Autor möchte am Ende dein Feedback zu diesen Fragen. Du kannst deine Antworten jederzeit ändern und erneut absenden.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {fragen.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-arena-text">{f.frage}</label>
            <textarea
              className="input"
              rows={5}
              value={antworten[f.id] ?? ""}
              onChange={(e) => setAntworten((prev) => ({ ...prev, [f.id]: e.target.value }))}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Wird gespeichert…" : "Antworten absenden"}
          </button>
          {hatAntworten && (
            <button type="button" onClick={() => setEditMode(false)} className="btn btn-secondary">
              Abbrechen
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
