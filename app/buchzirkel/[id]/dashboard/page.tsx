"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";
import GenrePicker from "@/app/components/genre-picker";
import { STANDARD_AGB_TEXT, ALLOWED_BEITRAG_EMOJIS } from "@/lib/buchzirkel";
import { CommentToolbar } from "@/app/components/comment-toolbar";

type Bewerber = {
  _id: string;
  bewerberUsername: string;
  status: "ausstehend" | "angenommen" | "abgelehnt";
  antworten: { frageIndex: number; antwort: string }[];
  agbAkzeptiert?: boolean;
  bewirbtSichAm: string;
  kontaktHandynummer?: string;
  kontaktEmail?: string;
  testleserProfile?: {
    zuMir?: { value: string };
    genres?: { value: string };
    verfuegbar?: { value: boolean };
  };
};

type Teilnahme = {
  teilnehmerUsername: string;
  abgeschlosseneAbschnitte: string[];
  rezensionsLinks: { plattform: string; url: string }[];
  fragebogenAntworten: { frageId: string; antwort: string }[];
  abgebrochen: boolean;
  beigetreten: string;
  veranstalterBewertung?: { sterne: number; kommentar: string; bewertetAm: string };
};

type Zirkel = {
  _id: string;
  typ: string;
  titel: string;
  beschreibung: string;
  genre: string;
  coverImageUrl?: string;
  youtubeUrl?: string;
  mediaImageUrl?: string;
  status: string;
  veranstalterUsername: string;
  bewerbungBis: string;
  maxTeilnehmer: number;
  bewerbungsFragen: string[];
  agbPflicht: boolean;
  agbText: string;
  leseabschnitte: { id: string; titel: string; deadline?: string }[];
  diskussionsTopics: { id: string; titel: string; typ: string }[];
  fragebogen: { id: string; frage: string }[];
  dateien: { id: string; originalName: string; abschnittId?: string; uploadedAt: string }[];
  buchformateAngebot?: string[];
  erwartungenAnTestleser?: string;
};

type Datei = { id: string; originalName: string; abschnittId?: string };

type ChatMsg = { id: string; senderUsername: string; body: string; createdAt: string };

export default function BuchzirkelDashboardPage() {
  const params = useParams<{ id: string }>();
  const account = getStoredAccount();

  const [tab, setTab] = useState<"bewerber" | "teilnehmer" | "beitraege" | "chat" | "dateien" | "werbung" | "einstellungen">("bewerber");
  const [zirkel, setZirkel] = useState<Zirkel | null>(null);
  const [bewerber, setBewerber] = useState<Bewerber[]>([]);
  const [teilnahmen, setTeilnahmen] = useState<Teilnahme[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  // Bewertungs-State
  const [bewertungSterne, setBewertungSterne] = useState<Record<string, number>>({});
  const [bewertungKommentar, setBewertungKommentar] = useState<Record<string, string>>({});
  const [bewertungSaving, setBewertungSaving] = useState<Record<string, boolean>>({});
  const [bewertungMsg, setBewertungMsg] = useState<Record<string, string>>({});

  // Beiträge
  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [activeBeitragTopic, setActiveBeitragTopic] = useState("");
  const [neuerBeitrag, setNeuerBeitrag] = useState("");
  const [neuerBeitragTitel, setNeuerBeitragTitel] = useState("");
  const [posting, setPosting] = useState(false);
  const neuerBeitragRef = useRef<HTMLTextAreaElement>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Datei-Upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingDatei, setDeletingDatei] = useState<string | null>(null);

  // Einstellungen-Edit-State
  const [editTitel, setEditTitel] = useState("");
  const [editBeschreibung, setEditBeschreibung] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editCoverImageUrl, setEditCoverImageUrl] = useState("");
  const [editBewerbungBis, setEditBewerbungBis] = useState("");
  const [editMaxTeilnehmer, setEditMaxTeilnehmer] = useState(10);
  const [editFragen, setEditFragen] = useState<string[]>([]);
  const [editAgbPflicht, setEditAgbPflicht] = useState(false);
  const [editAgbText, setEditAgbText] = useState(STANDARD_AGB_TEXT);
  const [editAbschnitte, setEditAbschnitte] = useState<{ id: string; titel: string; deadline?: string }[]>([]);
  const [editTopics, setEditTopics] = useState<{ id: string; titel: string; typ: string }[]>([]);
  const [editFragebogen, setEditFragebogen] = useState<{ id: string; frage: string }[]>([]);
  const [neuerAbschnittTitel, setNeuerAbschnittTitel] = useState("");
  const [neuerAbschnittDeadline, setNeuerAbschnittDeadline] = useState("");
  const [neueFrage, setNeueFrage] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [editBuchformate, setEditBuchformate] = useState<string[]>([]);
  const [editMediaTyp, setEditMediaTyp] = useState<"kein" | "youtube" | "bild">("kein");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editMediaImageUrl, setEditMediaImageUrl] = useState("");
  const [editMediaImageUploading, setEditMediaImageUploading] = useState(false);
  const [editMediaImageError, setEditMediaImageError] = useState("");
  const [editErwartungenAnTestleser, setEditErwartungenAnTestleser] = useState("");

  const load = useCallback(async () => {
    const [zRes, bRes, tRes] = await Promise.all([
      fetch(`/api/buchzirkel/${params.id}`),
      fetch(`/api/buchzirkel/${params.id}/bewerber`),
      fetch(`/api/buchzirkel/${params.id}/teilnahmen`),
    ]);
    const zData = await zRes.json() as { zirkel?: Zirkel };
    const bData = await bRes.json() as { bewerber?: Bewerber[] };
    const tData = await tRes.json() as { teilnahmen?: Teilnahme[] };
    const z = zData.zirkel ?? null;
    setZirkel(z);
    setBewerber(bData.bewerber ?? []);
    setTeilnahmen(tData.teilnahmen ?? []);
    if (z) {
      setEditTitel(z.titel);
      setEditBeschreibung(z.beschreibung ?? "");
      setEditGenre(z.genre ?? "");
      setEditCoverImageUrl(z.coverImageUrl ?? "");
      setEditBewerbungBis(z.bewerbungBis ? z.bewerbungBis.split("T")[0] : "");
      setEditMaxTeilnehmer(z.maxTeilnehmer);
      setEditFragen(z.bewerbungsFragen.length ? z.bewerbungsFragen : [""]);
      setEditAgbPflicht(z.agbPflicht);
      setEditAgbText(z.agbText || STANDARD_AGB_TEXT);
      setEditAbschnitte(z.leseabschnitte.map((a) => ({ ...a, deadline: a.deadline ? a.deadline.split("T")[0] : "" })));
      setEditTopics(z.diskussionsTopics);
      setEditFragebogen(z.fragebogen);
      setEditBuchformate(z.buchformateAngebot ?? []);
      if (z.youtubeUrl) { setEditMediaTyp("youtube"); setEditYoutubeUrl(z.youtubeUrl); }
      else if (z.mediaImageUrl) { setEditMediaTyp("bild"); setEditMediaImageUrl(z.mediaImageUrl); }
      else { setEditMediaTyp("kein"); }
      setEditErwartungenAnTestleser(z.erwartungenAnTestleser ?? "");
    }
    setLoading(false);
  }, [params.id]);

  async function bewertungSpeichern(username: string) {
    const sterne = bewertungSterne[username];
    if (!sterne) return;
    setBewertungSaving((p) => ({ ...p, [username]: true }));
    setBewertungMsg((p) => ({ ...p, [username]: "" }));
    const res = await fetch(`/api/buchzirkel/${params.id}/teilnahmen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teilnehmerUsername: username, sterne, kommentar: bewertungKommentar[username] ?? "" }),
    });
    const data = await res.json() as { message?: string };
    if (res.ok) {
      setBewertungMsg((p) => ({ ...p, [username]: "✅ Gespeichert" }));
      await load();
    } else {
      setBewertungMsg((p) => ({ ...p, [username]: data.message ?? "Fehler." }));
    }
    setBewertungSaving((p) => ({ ...p, [username]: false }));
  }

  const loadBeitraege = useCallback(async (topicId: string) => {
    const res = await fetch(`/api/buchzirkel/${params.id}/beitraege?topicId=${topicId}`);
    const data = await res.json() as { beitraege?: Beitrag[] };
    setBeitraege(data.beitraege ?? []);
  }, [params.id]);

  const loadChat = useCallback(async () => {
    const res = await fetch(`/api/buchzirkel/${params.id}/chat`);
    const data = await res.json() as { messages?: ChatMsg[] };
    setChatMessages(data.messages ?? []);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeBeitragTopic) void loadBeitraege(activeBeitragTopic);
  }, [activeBeitragTopic, loadBeitraege]);

  useEffect(() => {
    if (tab === "chat") void loadChat();
    if (tab === "beitraege" && zirkel?.diskussionsTopics?.[0] && !activeBeitragTopic) {
      setActiveBeitragTopic(zirkel.diskussionsTopics[0].id);
    }
  }, [tab, loadChat, zirkel, activeBeitragTopic]);

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
      body: JSON.stringify({ topicId: activeBeitragTopic, titel: neuerBeitragTitel.trim() || undefined, body: neuerBeitrag.trim() }),
    });
    setNeuerBeitrag("");
    setNeuerBeitragTitel("");
    await loadBeitraege(activeBeitragTopic);
    setPosting(false);
  }

  async function reactBeitrag(beitragId: string, emoji: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    await loadBeitraege(activeBeitragTopic);
  }

  async function replyBeitrag(beitragId: string, body: string) {
    await fetch(`/api/buchzirkel/${params.id}/beitraege/${beitragId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    await loadBeitraege(activeBeitragTopic);
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

  async function entscheidung(bewerbungId: string, entscheidung: "angenommen" | "abgelehnt") {
    setStatusMsg("");
    const res = await fetch(`/api/buchzirkel/${params.id}/bewerber`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bewerbungId, entscheidung }),
    });
    const data = await res.json() as { message?: string };
    if (res.ok) {
      setStatusMsg(entscheidung === "angenommen" ? "✅ Teilnehmer angenommen" : "Bewerbung abgelehnt");
      await load();
    } else {
      setStatusMsg(data.message ?? "Fehler.");
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitel.trim()) { setEditMsg("Titel ist erforderlich."); return; }
    setEditSaving(true);
    setEditMsg("");
    const effectiveAgbPflicht = zirkel?.typ === "betaleser" ? true : editAgbPflicht;
    const res = await fetch(`/api/buchzirkel/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titel: editTitel,
        beschreibung: editBeschreibung,
        genre: editGenre,
        buchformateAngebot: editBuchformate,
        coverImageUrl: editCoverImageUrl.trim() || undefined,
        youtubeUrl: editMediaTyp === "youtube" ? editYoutubeUrl.trim() || undefined : undefined,
        mediaImageUrl: editMediaTyp === "bild" ? editMediaImageUrl || undefined : undefined,
        bewerbungBis: editBewerbungBis ? new Date(editBewerbungBis).toISOString() : undefined,
        maxTeilnehmer: editMaxTeilnehmer,
        bewerbungsFragen: editFragen.filter(Boolean),
        agbPflicht: effectiveAgbPflicht,
        agbText: effectiveAgbPflicht ? editAgbText : undefined,
        leseabschnitte: editAbschnitte.map((a) => ({ ...a, deadline: a.deadline ? new Date(a.deadline).toISOString() : undefined })),
        diskussionsTopics: editTopics,
        fragebogen: editFragebogen,
        erwartungenAnTestleser: editErwartungenAnTestleser.trim() || undefined,
      }),
    });
    const data = await res.json() as { message?: string };
    if (res.ok) {
      setEditMsg("✅ Gespeichert!");
      await load();
    } else {
      setEditMsg(data.message ?? "Fehler beim Speichern.");
    }
    setEditSaving(false);
  }

  function addAbschnitt() {
    if (!neuerAbschnittTitel.trim()) return;
    setEditAbschnitte((prev) => [
      ...prev,
      { id: crypto.randomUUID(), titel: neuerAbschnittTitel.trim(), deadline: neuerAbschnittDeadline },
    ]);
    setNeuerAbschnittTitel("");
    setNeuerAbschnittDeadline("");
  }

  function moveItem<T>(arr: T[], from: number, to: number): T[] {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function addFragebogenFrage() {
    if (!neueFrage.trim()) return;
    setEditFragebogen((prev) => [...prev, { id: crypto.randomUUID(), frage: neueFrage.trim() }]);
    setNeueFrage("");
  }

  async function statusAendern(newStatus: string) {
    await fetch(`/api/buchzirkel/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, abschnittId?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 Minuten
    try {
      const qs = new URLSearchParams({ fileName: file.name });
      if (abschnittId) qs.set("abschnittId", abschnittId);
      const res = await fetch(`/api/buchzirkel/${params.id}/dateien/upload?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
        signal: controller.signal,
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) { setUploadError(data.message ?? "Upload fehlgeschlagen."); }
      else { await load(); }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setUploadError("Der Upload hat zu lange gedauert. Bitte prüfe deine Verbindung und versuche es erneut.");
      } else {
        setUploadError("Upload fehlgeschlagen. Bitte versuche es erneut.");
      }
    } finally {
      clearTimeout(timeoutId);
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteDatei(dateiId: string) {
    if (!confirm("Datei wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return;
    setDeletingDatei(dateiId);
    try {
      const res = await fetch(`/api/buchzirkel/${params.id}/datei/${dateiId}`, { method: "DELETE" });
      if (res.ok) { await load(); }
      else {
        const data = await res.json() as { message?: string };
        setUploadError(data.message ?? "Löschen fehlgeschlagen.");
      }
    } catch {
      setUploadError("Löschen fehlgeschlagen.");
    } finally {
      setDeletingDatei(null);
    }
  }

  if (loading || !account) return <main className="top-centered-main"><p className="text-arena-muted text-center py-8">Wird geladen…</p></main>;
  if (!zirkel) return <main className="top-centered-main"><p className="text-red-600 text-center py-8">Nicht gefunden.</p></main>;

  const ausstehend = bewerber.filter((b) => b.status === "ausstehend");
  const angenommen = bewerber.filter((b) => b.status === "angenommen");

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link href={`/buchzirkel/${zirkel._id}`} className="text-arena-muted text-xs hover:underline">← Zurück zur Zirkel-Seite</Link>
            <h1 className="text-xl font-bold m-0 mt-1">📊 Dashboard: {zirkel.titel}</h1>
            <p className="text-sm text-arena-muted m-0">
              Status: <strong className="text-arena-text">{zirkel.status}</strong> ·
              {" "}{angenommen.length}/{zirkel.maxTeilnehmer} Teilnehmer
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {zirkel.status === "entwurf" && (
              <button type="button" onClick={() => statusAendern("bewerbung")} className="btn btn-primary btn-sm">
                Bewerbungen öffnen
              </button>
            )}
            {zirkel.status === "bewerbung" && (
              <button type="button" onClick={() => statusAendern("aktiv")} className="btn btn-secondary btn-sm">
                Zirkel starten
              </button>
            )}
            {zirkel.status === "aktiv" && (
              <button type="button" onClick={() => statusAendern("bewerbung")} className="btn btn-secondary btn-sm">
                ← Bewerbungen wieder öffnen
              </button>
            )}
            {zirkel.status === "aktiv" && (
              <button type="button" onClick={() => statusAendern("abgeschlossen")} className="btn btn-secondary btn-sm">
                Abschließen
              </button>
            )}
            {zirkel.status === "abgeschlossen" && (
              <button type="button" onClick={() => statusAendern("aktiv")} className="btn btn-secondary btn-sm">
                ← Wieder aktivieren
              </button>
            )}
          </div>
        </div>
        {statusMsg && <p className="text-sm text-green-700 mt-2">{statusMsg}</p>}
      </section>

      {/* Tab-Navigation */}
      <nav className="sticky top-0 z-20 flex gap-1 mt-3 border-b border-arena-border-light pb-0 overflow-x-auto bg-arena-bg -mx-0">
        {[
          { key: "bewerber" as const, label: `Bewerber (${ausstehend.length})` },
          { key: "teilnehmer" as const, label: `Teilnehmer (${angenommen.length})` },
          { key: "beitraege" as const, label: "Beiträge" },
          { key: "chat" as const, label: "Gruppen-Chat" },
          { key: "dateien" as const, label: `Dateien (${zirkel.dateien.length})` },
          { key: "werbung" as const, label: "Werbung" },
          { key: "einstellungen" as const, label: "Einstellungen" },
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

      {/* Bewerber */}
      {tab === "bewerber" && (
        <section className="card mt-3">
          <p className="text-sm text-arena-muted m-0 mb-3">Hier siehst du alle eingegangenen Bewerbungen mit den Antworten auf deine Fragen. Nimm Bewerber an oder lehne sie ab – sie erhalten automatisch eine E-Mail.</p>
          {ausstehend.length === 0 ? (
            <p className="text-arena-muted text-sm">Noch keine ausstehenden Bewerbungen.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ausstehend.map((b) => (
                <BewerberKarte
                  key={b._id}
                  bewerber={b}
                  fragen={zirkel.bewerbungsFragen}
                  coverImageUrl={zirkel.coverImageUrl}
                  onEntscheidung={entscheidung}
                />
              ))}
            </div>
          )}

          {angenommen.length > 0 && (
            <div className="mt-4 pt-4 border-t border-arena-border-light">
              <p className="text-sm font-medium text-arena-muted mb-2">Bereits angenommen:</p>
              <div className="flex flex-wrap gap-2">
                {angenommen.map((b) => (
                  <Link key={b._id} href={`/testleser/${b.bewerberUsername}`} className="text-sm px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 hover:bg-green-100">
                    ✅ {b.bewerberUsername}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Teilnehmer */}
      {tab === "teilnehmer" && (
        <section className="card mt-3">
          <p className="text-sm text-arena-muted m-0 mb-3">Verfolge den Lesefortschritt deiner Teilnehmer und sieh dir ihre Rezensionslinks an. Nach dem Lesen kannst du jeden Teilnehmer mit 1–5 Sternen bewerten.</p>
          {angenommen.length === 0 ? (
            <p className="text-arena-muted text-sm">Noch keine Teilnehmer.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {angenommen.map((b) => {
                const t = teilnahmen.find((t) => t.teilnehmerUsername === b.bewerberUsername);
                const abgeschlossen = t?.abgeschlosseneAbschnitte.length ?? 0;
                const gesamt = zirkel.leseabschnitte.length;
                const bestehendeBewertung = t?.veranstalterBewertung;
                const username = b.bewerberUsername;
                // init Bewertungs-State aus DB wenn noch nicht gesetzt
                const aktiveSterne = bewertungSterne[username] ?? bestehendeBewertung?.sterne ?? 0;
                const aktiverKommentar = bewertungKommentar[username] !== undefined ? bewertungKommentar[username] : (bestehendeBewertung?.kommentar ?? "");
                return (
                  <div key={b._id} className="flex flex-col gap-2 p-3 rounded-lg border border-arena-border-light">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <Link href={`/testleser/${username}`} className="font-medium text-sm hover:underline">
                          {username}
                        </Link>
                        {t?.rezensionsLinks.map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-arena-blue hover:underline">
                            {r.plattform}
                          </a>
                        ))}
                      </div>
                      {gesamt > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-gray-200">
                            <div
                              className="h-1.5 rounded-full bg-arena-blue transition-all"
                              style={{ width: `${(abgeschlossen / gesamt) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-arena-muted">{abgeschlossen}/{gesamt}</span>
                        </div>
                      )}
                    </div>

                    {/* Bewertung */}
                    <div className="border-t border-arena-border-light pt-2">
                      <p className="text-xs font-semibold text-arena-muted mb-1">Deine Bewertung:</p>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setBewertungSterne((p) => ({ ...p, [username]: s }))}
                            className={`text-xl leading-none transition-opacity ${s <= aktiveSterne ? "opacity-100" : "opacity-30"}`}
                          >
                            ⭐
                          </button>
                        ))}
                        {aktiveSterne > 0 && (
                          <span className="text-xs text-arena-muted self-center ml-1">{aktiveSterne}/5</span>
                        )}
                      </div>
                      <textarea
                        className="input-base w-full text-sm"
                        rows={2}
                        placeholder="Kurzer Kommentar (optional)"
                        value={aktiverKommentar}
                        onChange={(e) => setBewertungKommentar((p) => ({ ...p, [username]: e.target.value }))}
                      />
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          disabled={aktiveSterne === 0 || bewertungSaving[username]}
                          onClick={() => bewertungSpeichern(username)}
                          className="btn btn-secondary btn-sm"
                        >
                          {bewertungSaving[username] ? "Speichern…" : "Bewertung speichern"}
                        </button>
                        {bewertungMsg[username] && (
                          <span className={`text-xs ${bewertungMsg[username].startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
                            {bewertungMsg[username]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Beiträge */}
      {tab === "beitraege" && (
        <div className="w-full flex gap-4 mt-3 max-sm:flex-col">
          {/* Topic-Sidebar */}
          <aside className="w-48 max-sm:w-full flex-shrink-0">
            <p className="text-xs text-arena-muted mb-2 max-sm:hidden">Themenbereich:</p>
            <div className="flex flex-col gap-1 max-sm:flex-row max-sm:flex-wrap">
              {zirkel.diskussionsTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveBeitragTopic(t.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors max-sm:px-2.5 ${
                    activeBeitragTopic === t.id ? "bg-arena-blue text-white" : "hover:bg-gray-100 text-arena-muted"
                  }`}
                >
                  {t.titel}
                </button>
              ))}
            </div>
            {zirkel.diskussionsTopics.length === 0 && (
              <p className="text-xs text-arena-muted">Noch keine Themen. Füge sie in den Einstellungen hinzu.</p>
            )}
          </aside>

          {/* Beiträge */}
          <div className="flex-1 min-w-0">
            {activeBeitragTopic && (
              <form onSubmit={postBeitrag} className="card mb-3 flex flex-col gap-2">
                <input
                  className="input text-sm"
                  placeholder="Titel (optional)"
                  value={neuerBeitragTitel}
                  onChange={(e) => setNeuerBeitragTitel(e.target.value)}
                />
                <textarea
                  ref={neuerBeitragRef}
                  className="input text-sm"
                  rows={3}
                  placeholder="Schreibe einen Beitrag…"
                  value={neuerBeitrag}
                  onChange={(e) => setNeuerBeitrag(e.target.value)}
                />
                <CommentToolbar textareaRef={neuerBeitragRef} value={neuerBeitrag} onChange={setNeuerBeitrag} />
                <button type="submit" disabled={posting || !neuerBeitrag.trim()} className="btn btn-primary btn-sm self-end">
                  {posting ? "Wird gepostet…" : "Beitrag posten"}
                </button>
              </form>
            )}
            {!activeBeitragTopic && (
              <p className="text-arena-muted text-sm text-center py-4">Wähle einen Themenbereich.</p>
            )}
            {activeBeitragTopic && beitraege.length === 0 && (
              <p className="text-arena-muted text-sm text-center py-4">Noch keine Beiträge in diesem Topic.</p>
            )}
            {beitraege.map((b) => (
              <DashboardBeitragKarte
                key={b._id}
                beitrag={b}
                username={account.username}
                veranstalterUsername={zirkel?.veranstalterUsername ?? ""}
                onReact={(emoji) => reactBeitrag(b._id, emoji)}
                onReply={(body) => replyBeitrag(b._id, body)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      {tab === "chat" && (
        <section className="mt-3 w-full border border-arena-border rounded-xl overflow-hidden flex flex-col bg-white" style={{ minHeight: 420 }}>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0" style={{ minHeight: 300, maxHeight: "55vh" }}>
            {chatMessages.length === 0 ? (
              <p className="text-arena-muted text-sm text-center my-auto py-8">Noch keine Nachrichten.</p>
            ) : (
              <>
                <div className="flex-1" />
                {chatMessages.map((msg) => {
                  const isMine = msg.senderUsername === account.username;
                  const isAutorMsg = zirkel && msg.senderUsername === zirkel.veranstalterUsername;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[0.95rem] ${
                        isMine ? "bg-arena-blue text-white rounded-br-md"
                        : isAutorMsg ? "bg-amber-50 border border-amber-200 text-gray-900 rounded-bl-md"
                        : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                      }`}>
                        {!isMine && (
                          <p className={`text-[11px] font-semibold m-0 mb-0.5 ${isAutorMsg ? "text-amber-700" : "text-arena-blue"}`}>
                            {msg.senderUsername}{isAutorMsg ? " ✍️" : ""}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap m-0" style={{ lineHeight: 1.5 }}>{msg.body}</p>
                        <span className={`text-[10px] block mt-0.5 ${isMine ? "text-white/50 text-right" : "text-arena-muted"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <div ref={chatEndRef} />
          </div>
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
              <button type="submit" disabled={chatSending || !chatInput.trim()} className="btn btn-primary btn-sm !py-2 !px-4">
                {chatSending ? "…" : "↑"}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Werbung */}
      {tab === "werbung" && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-1">Social-Media-Werbung</h2>
          <p className="text-sm text-arena-muted m-0 mb-4">
            Hier findest du fertige Grafiken für Instagram, Facebook & Co. Lade sie herunter und nutze sie, um für deinen Buchzirkel zu werben.
            Du kannst die Bilder auch nach Belieben verändern (z. B. mit Canva oder Photoshop).
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            {[
              { file: "nimmplatz.png", label: "Variante 1" },
              { file: "nimmplatz2.png", label: "Variante 2" },
              { file: "nimmplatz3.png", label: "Variante 3" },
              { file: "nimmplatz4.png", label: "Variante 4" },
            ].map(({ file, label }) => (
              <div key={file} className="flex flex-col gap-2">
                <a
                  href={`/Buchzirkel/${file}`}
                  download={file}
                  className="block rounded-lg overflow-hidden border border-arena-border hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/Buchzirkel/${file}`} alt={label} className="w-full aspect-[4/5] object-cover" />
                </a>
                <a
                  href={`/Buchzirkel/${file}`}
                  download={file}
                  className="btn btn-secondary btn-sm text-center text-xs"
                >
                  ↓ {label} herunterladen
                </a>
                <a
                  href={`/social-media/beitrag-tool?bgImage=${encodeURIComponent(`/Buchzirkel/${file}`)}`}
                  className="btn btn-sm text-center text-xs"
                >
                  Anpassen
                </a>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-arena-bg border border-arena-border-light p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold m-0">BuchArena365 als Collab-Partner auf Instagram</p>
            <p className="text-sm text-arena-muted m-0">
              Möchtest du mehr Reichweite für deinen Buchzirkel? Lade <strong>@bucharena365</strong> als Collab-Partner bei deinem Instagram-Post ein!
              So erscheint der Beitrag auf beiden Profilen und erreicht deutlich mehr Leserinnen und Leser.
            </p>
            <p className="text-sm text-arena-muted m-0">
              Gehe in Instagram bei deinem Post auf <em>Personen taggen → Kollaborateur einladen</em> und gib <strong>@bucharena365</strong> ein.
            </p>
          </div>
        </section>
      )}

      {/* Dateien */}
      {tab === "dateien" && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-1">Dateien hochladen</h2>
          <p className="text-sm text-arena-muted m-0 mb-3">
            Lade hier dein Manuskript oder Buch hoch (PDF oder EPUB, max. 50 MB). Jeder Teilnehmer erhält automatisch eine Version mit seinem persönlichen Wasserzeichen – für maximalen Schutz deiner unveröffentlichten Inhalte.
          </p>

          {uploadError && <p className="text-red-600 text-sm mb-2">{uploadError}</p>}

          <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${uploading ? "opacity-50" : "hover:border-arena-blue"}`}>
            <span className="text-2xl">📄</span>
            <span className="text-sm font-medium">{uploading ? "Wird hochgeladen…" : "Datei auswählen (PDF/EPUB)"}</span>
            <input type="file" accept=".pdf,.epub" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e)} />
          </label>

          {zirkel.dateien.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {zirkel.dateien.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-arena-border-light text-sm">
                  <span className="text-lg">📄</span>
                  <span className="flex-1 truncate">{d.originalName}</span>
                  {d.abschnittId && (
                    <span className="text-xs text-arena-muted">
                      {zirkel.leseabschnitte.find((a) => a.id === d.abschnittId)?.titel ?? d.abschnittId}
                    </span>
                  )}
                  <span className="text-xs text-arena-muted">{new Date(d.uploadedAt).toLocaleDateString("de-AT")}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDatei(d.id)}
                    disabled={deletingDatei === d.id}
                    className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingDatei === d.id ? "…" : "Löschen"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Einstellungen */}
      {tab === "einstellungen" && (
        <form onSubmit={handleEditSave} className="w-full flex flex-col gap-4 mt-3">
          <section className="card">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="text-base font-semibold m-0">Buchzirkel bearbeiten</h2>
              <Link href={`/buchzirkel/${zirkel._id}`} className="text-arena-blue text-sm hover:underline">← Zur Zirkel-Seite</Link>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Titel *</label>
                <input className="input-base w-full" value={editTitel} onChange={(e) => setEditTitel(e.target.value)} required />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Beschreibung</label>
                <textarea className="input-base w-full" rows={3} value={editBeschreibung} onChange={(e) => setEditBeschreibung(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div className="grid gap-1">
                  <GenrePicker label="Genre" value={editGenre} onChange={setEditGenre} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-semibold">Cover-URL</label>
                  <input className="input-base w-full" value={editCoverImageUrl} onChange={(e) => setEditCoverImageUrl(e.target.value)} placeholder="https://…" />
                </div>
              </div>
              <div className="grid gap-1">
                <span className="text-sm font-semibold">Bereitgestellte Formate</span>
                <div className="flex flex-wrap gap-3 mt-1">
                  {(["gedruckt", "epub", "pdf"] as const).map((fmt) => {
                    const label = fmt === "gedruckt" ? "Gedrucktes Buch" : fmt.toUpperCase();
                    return (
                      <label key={fmt} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editBuchformate.includes(fmt)}
                          onChange={(e) => setEditBuchformate((prev) =>
                            e.target.checked ? [...prev, fmt] : prev.filter((f) => f !== fmt)
                          )}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
              {zirkel.typ === "testleser" && (
                <div className="grid gap-1 mt-3">
                  <label className="text-sm font-semibold">Das erwarte ich vom Testleser</label>
                  <p className="text-sm text-arena-muted m-0 mb-1">Beschreibe, was du dir von deinen Testlesern erhoffst – z.B. Art des Feedbacks, Umfang, Fokusthemen.</p>
                  <textarea
                    className="input-base w-full text-sm"
                    rows={4}
                    value={editErwartungenAnTestleser}
                    onChange={(e) => setEditErwartungenAnTestleser(e.target.value)}
                    placeholder="z.B. Ich freue mich über detailliertes Feedback zu Charakterentwicklung und Spannung. Kapitelweise Anmerkungen sind willkommen …"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="card">            <h2 className="text-base font-semibold m-0 mb-1">Video oder Bild (optional)</h2>
            <p className="text-sm text-arena-muted m-0 mb-3">Füge ein YouTube-Video oder ein Bild hinzu, das Lesern mehr über dein Buch zeigt.</p>
            <div className="flex gap-2 mb-3">
              {(["kein", "youtube", "bild"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setEditMediaTyp(m)}
                  className={`btn btn-sm${editMediaTyp === m ? " btn-primary" : ""}`}>
                  {m === "kein" ? "Kein Medium" : m === "youtube" ? "YouTube-Video" : "Bild hochladen"}
                </button>
              ))}
            </div>
            {editMediaTyp === "youtube" && (
              <div className="grid gap-1">
                <label className="text-sm font-semibold">YouTube-URL</label>
                <input className="input-base w-full" value={editYoutubeUrl} onChange={(e) => setEditYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
              </div>
            )}
            {editMediaTyp === "bild" && (
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Bild hochladen</label>
                {editMediaImageUrl && <img src={editMediaImageUrl} alt="Vorschau" className="max-w-xs max-h-48 w-auto h-auto rounded-lg border border-arena-border mb-1" />}
                <input type="file" accept="image/*" disabled={editMediaImageUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setEditMediaImageUploading(true);
                    setEditMediaImageError("");
                    const fd = new FormData();
                    fd.append("file", file);
                    try {
                      const res = await fetch("/api/buchzirkel/upload-media-image", { method: "POST", body: fd });
                      const data = await res.json() as { imageUrl?: string; message?: string };
                      if (!res.ok) { setEditMediaImageError(data.message ?? "Upload fehlgeschlagen."); return; }
                      setEditMediaImageUrl(data.imageUrl ?? "");
                    } catch { setEditMediaImageError("Upload fehlgeschlagen."); }
                    finally { setEditMediaImageUploading(false); }
                  }}
                />
                {editMediaImageUploading && <p className="text-sm text-arena-muted">Wird hochgeladen…</p>}
                {editMediaImageError && <p className="text-sm text-red-600">{editMediaImageError}</p>}
              </div>
            )}
          </section>

          <section className="card">            <h2 className="text-base font-semibold m-0 mb-3">Bewerbungsphase</h2>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Bewerbungsfrist</label>
                <input type="date" className="input-base w-full" value={editBewerbungBis} onChange={(e) => setEditBewerbungBis(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Max. Teilnehmer</label>
                <input type="number" className="input-base w-full" min={1} max={200} value={editMaxTeilnehmer} onChange={(e) => setEditMaxTeilnehmer(Number(e.target.value))} />
              </div>
            </div>

            <div className="mt-3 grid gap-1">
              <label className="text-sm font-semibold">Bewerbungsfragen</label>
              <p className="text-sm text-arena-muted m-0 mb-1">Bitte überlege gut, welchen Umfang du von Testlesern verlangst – manchmal ist weniger mehr.</p>
              {editFragen.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex flex-col gap-0.5">
                    <button type="button" disabled={i === 0} onClick={() => setEditFragen((prev) => moveItem(prev, i, i - 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none text-xs">▲</button>
                    <button type="button" disabled={i === editFragen.length - 1} onClick={() => setEditFragen((prev) => moveItem(prev, i, i + 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none text-xs">▼</button>
                  </div>
                  <input
                    className="input-base flex-1"
                    value={f}
                    onChange={(e) => setEditFragen((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Frage ${i + 1}`}
                  />
                  <button type="button" onClick={() => setEditFragen((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 px-2">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setEditFragen((prev) => [...prev, ""])} className="text-arena-blue text-sm mt-1 hover:underline">
                + Frage hinzufügen
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold m-0 mb-1">Verschwiegenheitserklärung</h2>
            {zirkel.typ === "betaleser" ? (
              <p className="text-sm text-red-700 m-0 mb-3">Bei Buchzirkeln (Beta) ist die Verschwiegenheitserklärung Pflicht.</p>
            ) : (
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                <input type="checkbox" checked={editAgbPflicht} onChange={(e) => setEditAgbPflicht(e.target.checked)} />
                Verschwiegenheitserklärung aktivieren
              </label>
            )}
            {(zirkel.typ === "betaleser" || editAgbPflicht) && (
              <textarea
                className="input-base w-full text-sm"
                rows={6}
                value={editAgbText}
                onChange={(e) => setEditAgbText(e.target.value)}
              />
            )}
          </section>

          <section className="card">
            <h2 className="text-base font-semibold m-0 mb-3">Leseabschnitte & Deadlines</h2>
            {editAbschnitte.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2 mb-2 text-sm border border-arena-border rounded-lg p-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => setEditAbschnitte((prev) => moveItem(prev, i, i - 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none">▲</button>
                  <button type="button" disabled={i === editAbschnitte.length - 1} onClick={() => setEditAbschnitte((prev) => moveItem(prev, i, i + 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none">▼</button>
                </div>
                <input
                  className="input-base flex-1"
                  value={a.titel}
                  onChange={(e) => setEditAbschnitte((prev) => prev.map((x, j) => j === i ? { ...x, titel: e.target.value } : x))}
                />
                <input
                  type="date"
                  className="input-base w-36"
                  value={a.deadline ?? ""}
                  onChange={(e) => setEditAbschnitte((prev) => prev.map((x, j) => j === i ? { ...x, deadline: e.target.value } : x))}
                />
                <button type="button" onClick={() => setEditAbschnitte((prev) => prev.filter((_, j) => j !== i))} className="text-red-500">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-2 flex-wrap">
              <input className="input-base flex-1" placeholder="z.B. Kapitel 1–10" value={neuerAbschnittTitel} onChange={(e) => setNeuerAbschnittTitel(e.target.value)} />
              <input type="date" className="input-base w-40" value={neuerAbschnittDeadline} onChange={(e) => setNeuerAbschnittDeadline(e.target.value)} />
              <button type="button" onClick={addAbschnitt} className="btn btn-secondary">Hinzufügen</button>
            </div>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold m-0 mb-3">Diskussions-Bereiche</h2>
            {editTopics.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 mb-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => setEditTopics((prev) => moveItem(prev, i, i - 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none text-xs">▲</button>
                  <button type="button" disabled={i === editTopics.length - 1} onClick={() => setEditTopics((prev) => moveItem(prev, i, i + 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none text-xs">▼</button>
                </div>
                <input
                  className="input-base flex-1"
                  value={t.titel}
                  onChange={(e) => setEditTopics((prev) => prev.map((x, j) => j === i ? { ...x, titel: e.target.value } : x))}
                />
                <button type="button" onClick={() => setEditTopics((prev) => prev.filter((_, j) => j !== i))} className="text-red-500">✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setEditTopics((prev) => [...prev, { id: crypto.randomUUID(), titel: "Neues Topic", typ: "allgemein" }])}
              className="text-arena-blue text-sm hover:underline mt-1"
            >
              + Topic hinzufügen
            </button>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold m-0 mb-3">Abschluss-Fragebogen</h2>
            {editFragebogen.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2 mb-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => setEditFragebogen((prev) => moveItem(prev, i, i - 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none text-xs">▲</button>
                  <button type="button" disabled={i === editFragebogen.length - 1} onClick={() => setEditFragebogen((prev) => moveItem(prev, i, i + 1))} className="text-arena-muted hover:text-arena-text disabled:opacity-20 leading-none text-xs">▼</button>
                </div>
                <input
                  className="input-base flex-1 text-sm"
                  value={f.frage}
                  onChange={(e) => setEditFragebogen((prev) => prev.map((x, j) => j === i ? { ...x, frage: e.target.value } : x))}
                />
                <button type="button" onClick={() => setEditFragebogen((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 text-sm">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                className="input-base flex-1"
                placeholder="z.B. War das Ende glaubwürdig?"
                value={neueFrage}
                onChange={(e) => setNeueFrage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFragebogenFrage(); } }}
              />
              <button type="button" onClick={addFragebogenFrage} className="btn btn-secondary">Hinzufügen</button>
            </div>
          </section>

          {editMsg && (
            <p className={`text-sm ${editMsg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>{editMsg}</p>
          )}

          <div className="flex justify-end pb-4">
            <button type="submit" disabled={editSaving} className="btn btn-primary">
              {editSaving ? "Wird gespeichert…" : "💾 Änderungen speichern"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

// ── Dashboard-Beitrag-Karte ────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

type Beitrag = {
  _id: string; topicId: string; autorUsername: string; titel?: string; body: string;
  reactions: { username: string; emoji: string }[];
  replies: { _id: string; autorUsername: string; body: string; createdAt: string; reactions: { username: string; emoji: string }[] }[];
  createdAt: string;
};

function DashboardBeitragKarte({
  beitrag,
  username,
  veranstalterUsername,
  onReact,
  onReply,
}: {
  beitrag: Beitrag;
  username: string;
  veranstalterUsername: string;
  onReact: (emoji: string) => void;
  onReply: (body: string) => Promise<void>;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const isAutor = (u: string) => u === veranstalterUsername;

  async function submitReply() {
    if (!replyText.trim()) return;
    setPostingReply(true);
    await onReply(replyText.trim());
    setReplyText("");
    setShowReplyBox(false);
    setPostingReply(false);
  }

  return (
    <article className="rounded-xl border border-arena-border-light p-4 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${isAutor(beitrag.autorUsername) ? "bg-amber-500" : "bg-arena-blue"}`}>
            {beitrag.autorUsername[0]?.toUpperCase()}
          </div>
          <strong className="text-sm">{beitrag.autorUsername}</strong>
          {isAutor(beitrag.autorUsername) && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">✍️ Autor</span>
          )}
        </div>
        <span className="text-xs text-arena-muted">{timeAgo(beitrag.createdAt)}</span>
      </div>
      {beitrag.titel && <p className="font-semibold text-sm m-0 mb-1">{beitrag.titel}</p>}
      <p className="text-[0.95rem] m-0 whitespace-pre-wrap leading-relaxed">{beitrag.body}</p>

      <div className="flex flex-wrap gap-1.5 mt-3 items-center">
        {ALLOWED_BEITRAG_EMOJIS.map((emoji) => {
          const count = beitrag.reactions.filter((r) => r.emoji === emoji).length;
          const myReact = beitrag.reactions.some((r) => r.username === username && r.emoji === emoji);
          return (
            <button key={emoji} type="button" onClick={() => onReact(emoji)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border cursor-pointer transition-colors ${
                myReact ? "bg-arena-blue/10 border-arena-blue text-arena-blue" : "bg-gray-50 border-arena-border-light hover:bg-gray-100"
              }`}
            >
              {emoji}{count > 0 && <span className="text-xs font-medium">{count}</span>}
            </button>
          );
        })}
        <button type="button" onClick={() => { setShowReplyBox((v) => !v); setReplyText(""); }} className="btn btn-sm text-xs">
          {showReplyBox ? "Abbrechen" : "Antworten"}
        </button>
      </div>

      {showReplyBox && (
        <div className="mt-3 pl-3 border-l-2 border-arena-blue/30 grid gap-2">
          <textarea
            ref={replyRef}
            className="input-base text-sm"
            rows={3}
            placeholder="Deine Antwort…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <CommentToolbar textareaRef={replyRef} value={replyText} onChange={setReplyText} />
          <div className="flex gap-2">
            <button type="button" onClick={submitReply} disabled={postingReply || !replyText.trim()} className="btn btn-sm">
              {postingReply ? "Wird gesendet…" : "Absenden"}
            </button>
            <button type="button" onClick={() => setShowReplyBox(false)} className="btn btn-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {beitrag.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-gray-100 flex flex-col gap-2">
          {beitrag.replies.map((r) => (
            <div key={r._id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${isAutor(r.autorUsername) ? "bg-amber-500" : "bg-arena-blue"}`}>
                  {r.autorUsername[0]?.toUpperCase()}
                </div>
                <strong>{r.autorUsername}</strong>
                {isAutor(r.autorUsername) && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">✍️</span>}
                <span className="text-xs text-arena-muted">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap m-0 pl-7 text-[0.9rem]">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function BewerberKarte({
  bewerber,
  fragen,
  coverImageUrl,
  onEntscheidung,
}: {
  bewerber: Bewerber;
  fragen: string[];
  coverImageUrl?: string;
  onEntscheidung: (id: string, e: "angenommen" | "abgelehnt") => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-arena-border rounded-lg p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          {coverImageUrl && (
            <img src={coverImageUrl} alt="Cover" className="w-10 h-14 object-cover rounded border border-arena-border-light flex-shrink-0" />
          )}
          <div>
            <Link href={`/testleser/${bewerber.bewerberUsername}`} className="font-semibold hover:underline">
              {bewerber.bewerberUsername}
            </Link>
            {bewerber.testleserProfile?.genres?.value && (
              <span className="ml-2 text-xs text-arena-muted">· {bewerber.testleserProfile.genres.value}</span>
            )}
            {bewerber.agbAkzeptiert && <span className="ml-2 text-xs text-green-700">AGB akzeptiert</span>}
            <p className="text-xs text-arena-muted m-0 mt-0.5">
              {new Date(bewerber.bewirbtSichAm).toLocaleDateString("de-AT")}
            </p>
            {(bewerber.kontaktHandynummer || bewerber.kontaktEmail) && (
              <p className="text-xs text-arena-muted m-0 mt-1 flex flex-wrap gap-x-3">
                {bewerber.kontaktHandynummer && (
                  <span>📱 {bewerber.kontaktHandynummer}</span>
                )}
                {bewerber.kontaktEmail && (
                  <a href={`mailto:${bewerber.kontaktEmail}`} className="text-arena-blue hover:underline">
                    ✉️ {bewerber.kontaktEmail}
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEntscheidung(bewerber._id, "angenommen")} className="btn btn-primary btn-sm">
            Annehmen
          </button>
          <button type="button" onClick={() => onEntscheidung(bewerber._id, "abgelehnt")} className="btn btn-secondary btn-sm text-red-600">
            ✕ Ablehnen
          </button>
        </div>
      </div>

      {bewerber.antworten.length > 0 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-arena-blue hover:underline mt-2">
          {expanded ? "▲ Antworten verbergen" : "▼ Bewerbungsantworten anzeigen"}
        </button>
      )}

      {expanded && bewerber.antworten.map((a) => (
        <div key={a.frageIndex} className="mt-2 text-sm">
          <p className="font-medium m-0 text-arena-muted">{fragen[a.frageIndex]}</p>
          <p className="m-0 mt-0.5">{a.antwort}</p>
        </div>
      ))}
    </div>
  );
}
