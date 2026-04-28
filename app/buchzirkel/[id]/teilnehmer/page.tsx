"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";
import { ALLOWED_BEITRAG_EMOJIS } from "@/lib/buchzirkel";

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
};

type Teilnahme = {
  abgeschlosseneAbschnitte: string[];
  rezensionsLinks: { plattform: string; url: string; eingetragen: string }[];
  fragebogenAntworten: { frageId: string; antwort: string }[];
};

export default function TeilnehmerBereichPage() {
  const params = useParams<{ id: string }>();
  const account = getStoredAccount();

  const [zirkel, setZirkel] = useState<Zirkel | null>(null);
  const [teilnahme, setTeilnahme] = useState<Teilnahme | null>(null);
  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [neuerBeitrag, setNeuerBeitrag] = useState("");
  const [neuerBeitragTitel, setNeuerBeitragTitel] = useState("");
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"diskussion" | "dateien" | "fortschritt" | "fragebogen" | "rezensionen">("diskussion");

  // Rezensions-Links
  const [rlPlattform, setRlPlattform] = useState("");
  const [rlUrl, setRlUrl] = useState("");
  const [rlSaving, setRlSaving] = useState(false);

  const load = useCallback(async () => {
    const [zRes, tRes] = await Promise.all([
      fetch(`/api/buchzirkel/${params.id}`),
      fetch(`/api/buchzirkel/${params.id}/meine-teilnahme`),
    ]);
    const zData = await zRes.json() as { zirkel?: Zirkel };
    const tData = await tRes.json() as { teilnahme?: Teilnahme };
    setZirkel(zData.zirkel ?? null);
    setTeilnahme(tData.teilnahme ?? null);
    if (zData.zirkel?.diskussionsTopics?.[0]) {
      setActiveTopic(zData.zirkel.diskussionsTopics[0].id);
    }
    setLoading(false);
  }, [params.id]);

  const loadBeitraege = useCallback(async (topicId: string) => {
    const res = await fetch(`/api/buchzirkel/${params.id}/beitraege?topicId=${topicId}`);
    const data = await res.json() as { beitraege?: Beitrag[] };
    setBeitraege(data.beitraege ?? []);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTopic) loadBeitraege(activeTopic); }, [activeTopic, loadBeitraege]);

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

  async function react(beitragId: string, emoji: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
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
          <h1 className="text-xl font-bold m-0">📚 {zirkel.titel}</h1>
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
          { key: "diskussion" as const, label: "💬 Diskussion" },
          { key: "dateien" as const, label: "📄 Dateien" },
          { key: "fortschritt" as const, label: "✅ Fortschritt" },
          { key: "rezensionen" as const, label: "⭐ Rezensionen" },
          ...(zirkel.fragebogen.length > 0 ? [{ key: "fragebogen" as const, label: "📝 Fragebogen" }] : []),
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
                  isVeranstalter={zirkel.isVeranstalter}
                  onReact={(emoji) => react(b._id, emoji)}
                  onTreffpunkt={() => treffpunktTeilen(b._id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Dateien / PDF-Viewer */}
      {tab === "dateien" && (
        <section className="card mt-3">
          {zirkel.dateien.length === 0 ? (
            <p className="text-arena-muted text-sm">Noch keine Dateien hochgeladen.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {zirkel.dateien.map((d) => (
                <div key={d.id} className="border border-arena-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <span className="font-medium text-sm">{d.originalName}</span>
                    </div>
                    <a
                      href={`/api/buchzirkel/${zirkel._id}/datei/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      Im Viewer öffnen ↗
                    </a>
                  </div>
                  {d.originalName.endsWith(".pdf") && (
                    <iframe
                      src={`/api/buchzirkel/${zirkel._id}/datei/${d.id}`}
                      className="w-full"
                      style={{ height: "70vh" }}
                      title={d.originalName}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Fortschritt */}
      {tab === "fortschritt" && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-3">Leseabschnitte</h2>
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
                        📅 {deadline.toLocaleDateString("de-AT")} {fällig ? "– Überfällig!" : ""}
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
          <h2 className="text-base font-semibold m-0 mb-3">Rezensions-Links</h2>
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

// ── Beitrag-Karte ─────────────────────────────────────────────────────────

function BeitragKarte({
  beitrag,
  username,
  isVeranstalter,
  onReact,
  onTreffpunkt,
}: {
  beitrag: Beitrag;
  username: string;
  isVeranstalter: boolean;
  onReact: (emoji: string) => void;
  onTreffpunkt: () => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);

  function emojiCount(emoji: string) {
    return beitrag.reactions.filter((r) => r.emoji === emoji).length;
  }

  return (
    <div className="card mb-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-arena-blue text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {beitrag.autorUsername[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{beitrag.autorUsername}</span>
            <span className="text-xs text-arena-muted">{new Date(beitrag.createdAt).toLocaleDateString("de-AT")}</span>
            {beitrag.imTreffpunktGeteilt && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Im Treffpunkt</span>}
          </div>
          {beitrag.titel && <p className="font-semibold m-0 mt-1">{beitrag.titel}</p>}
          <p className="text-sm m-0 mt-1 whitespace-pre-wrap">{beitrag.body}</p>

          {/* Reaktionen */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {ALLOWED_BEITRAG_EMOJIS.map((emoji) => {
              const count = emojiCount(emoji);
              const myReact = beitrag.reactions.some((r) => r.username === username && r.emoji === emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className={`px-2 py-0.5 rounded-full text-sm transition-colors border ${
                    myReact ? "bg-arena-yellow border-arena-yellow" : "border-arena-border hover:bg-gray-100"
                  }`}
                >
                  {emoji}{count > 0 && <span className="ml-0.5 text-xs">{count}</span>}
                </button>
              );
            })}

            {/* Teilen (nur Veranstalter) */}
            {isVeranstalter && !beitrag.imTreffpunktGeteilt && (
              <button
                type="button"
                onClick={onTreffpunkt}
                className="ml-2 text-xs text-arena-blue hover:underline border border-arena-blue px-2 py-0.5 rounded-full"
              >
                Im Treffpunkt teilen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
  const [antworten, setAntworten] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const a of bestehend) m[a.frageId] = a.antwort;
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    onSaved();
  }

  return (
    <section className="card mt-3">
      <h2 className="text-base font-semibold m-0 mb-3">📝 Abschluss-Fragebogen</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {fragen.map((f) => (
          <div key={f.id}>
            <label className="label">{f.frage}</label>
            <textarea
              className="input"
              rows={3}
              value={antworten[f.id] ?? ""}
              onChange={(e) => setAntworten((prev) => ({ ...prev, [f.id]: e.target.value }))}
            />
          </div>
        ))}
        {saved && <p className="text-green-700 text-sm">✅ Antworten gespeichert.</p>}
        <button type="submit" disabled={saving} className="btn btn-primary self-start">
          {saving ? "Wird gespeichert…" : "Antworten absenden"}
        </button>
      </form>
    </section>
  );
}
