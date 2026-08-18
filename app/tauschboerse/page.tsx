"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type TauschItem = {
  id: string;
  authorUsername: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
};

type Bewerbung = {
  id: string;
  tauschId: string;
  bewerberUsername?: string;
  tauschAuthorUsername?: string;
  nachricht: string;
  status: "ausstehend" | "angenommen" | "abgelehnt" | "zurueckgezogen";
  createdAt: string;
};

const statusColors: Record<string, string> = {
  offen: "bg-green-100 text-green-700",
  reserviert: "bg-yellow-100 text-yellow-700",
  abgeschlossen: "bg-gray-200 text-gray-500",
};

const bewerbungStatusColors: Record<string, string> = {
  ausstehend: "bg-yellow-100 text-yellow-700",
  angenommen: "bg-green-100 text-green-700",
  abgelehnt: "bg-red-100 text-red-600",
  zurueckgezogen: "bg-gray-200 text-gray-500",
};

const bewerbungStatusLabel: Record<string, string> = {
  ausstehend: "Ausstehend",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  zurueckgezogen: "Zurueckgezogen",
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

export default function TauschboersePage() {
  const [items, setItems] = useState<TauschItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  // Inserat erstellen
  const [showOverlay, setShowOverlay] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"inserate" | "meine-bewerbungen">("inserate");

  // Bewerbungs-Modal
  const [bewerbenItemId, setBewerbenItemId] = useState<string | null>(null);
  const [bewerbenNachricht, setBewerbenNachricht] = useState("");
  const [isBewerbing, setIsBewerbing] = useState(false);
  const [bewerbenMessage, setBewerbenMessage] = useState("");

  // Bewerbungen pro Inserat (Inserenten-Sicht) — tauschId → Bewerbung[]
  const [bewerbungenMap, setBewerbungenMap] = useState<Record<string, Bewerbung[]>>({});
  const [expandedBewerbungen, setExpandedBewerbungen] = useState<Set<string>>(new Set());

  // Eigene Bewerbungen (Bewerber-Sicht)
  const [meineBewerbungen, setMeineBewerbungen] = useState<Bewerbung[]>([]);
  const [meineBewerbungenLoading, setMeineBewerbungenLoading] = useState(false);

  // schnelles Lookup eigener Bewerbungen (tauschId -> status)
  const [ownBewerbungMap, setOwnBewerbungMap] = useState<Record<string, { id: string; status: string }>>({});

  useEffect(() => {
    const account = getStoredAccount();
    if (account) {
      setUsername(account.username);
      setRole(account.role ?? "");
    }
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/tausch/list");
      const data = (await res.json()) as { items?: TauschItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setItems(data.items ?? []);
    } catch {
      setMessage("Tauschboerse konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  // Eigene Bewerbungen laden (fuer Lookup-Map + Tab)
  const loadMeineBewerbungen = useCallback(async () => {
    if (!username) return;
    setMeineBewerbungenLoading(true);
    try {
      const res = await fetch("/api/tausch/bewerbungen?meine=1");
      const data = (await res.json()) as { bewerbungen?: Bewerbung[] };
      const list = data.bewerbungen ?? [];
      setMeineBewerbungen(list);
      const map: Record<string, { id: string; status: string }> = {};
      for (const b of list) {
        map[b.tauschId] = { id: b.id, status: b.status };
      }
      setOwnBewerbungMap(map);
    } catch {
      // ignore
    } finally {
      setMeineBewerbungenLoading(false);
    }
  }, [username]);

  useEffect(() => { void loadMeineBewerbungen(); }, [loadMeineBewerbungen]);

  async function handleCreate() {
    if (!title.trim() || !description.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/tausch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setTitle("");
      setDescription("");
      setShowOverlay(false);
      await loadItems();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Erstellen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch("/api/tausch/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      await loadItems();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Aktualisieren.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eintrag wirklich loeschen?")) return;
    try {
      const res = await fetch("/api/tausch/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      await loadItems();
      await loadMeineBewerbungen();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Loeschen.");
    }
  }

  async function handleBewerben() {
    if (!bewerbenItemId) return;
    setIsBewerbing(true);
    setBewerbenMessage("");
    try {
      const res = await fetch("/api/tausch/bewerben", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tauschId: bewerbenItemId, nachricht: bewerbenNachricht.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setBewerbenItemId(null);
      setBewerbenNachricht("");
      await loadMeineBewerbungen();
    } catch (err) {
      setBewerbenMessage(err instanceof Error ? err.message : "Fehler beim Bewerben.");
    } finally {
      setIsBewerbing(false);
    }
  }

  async function handleBewerbungZurueckziehen(bewerbungId: string) {
    if (!confirm("Bewerbung wirklich zurueckziehen?")) return;
    try {
      const res = await fetch("/api/tausch/bewerbungen/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bewerbungId, status: "zurueckgezogen" }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      await loadMeineBewerbungen();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler.");
    }
  }

  async function toggleBewerbungenFuerInserat(tauschId: string) {
    const next = new Set(expandedBewerbungen);
    if (next.has(tauschId)) {
      next.delete(tauschId);
      setExpandedBewerbungen(next);
      return;
    }
    next.add(tauschId);
    setExpandedBewerbungen(next);
    if (bewerbungenMap[tauschId]) return; // already loaded
    try {
      const res = await fetch(`/api/tausch/bewerbungen?tauschId=${tauschId}`);
      const data = (await res.json()) as { bewerbungen?: Bewerbung[] };
      setBewerbungenMap((prev) => ({ ...prev, [tauschId]: data.bewerbungen ?? [] }));
    } catch {
      // ignore
    }
  }

  async function handleBewerbungStatusChange(bewerbungId: string, newStatus: string, tauschId: string) {
    try {
      const res = await fetch("/api/tausch/bewerbungen/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bewerbungId, status: newStatus }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      // Reload bewerbungen for this inserat
      const res2 = await fetch(`/api/tausch/bewerbungen?tauschId=${tauschId}`);
      const data2 = (await res2.json()) as { bewerbungen?: Bewerbung[] };
      setBewerbungenMap((prev) => ({ ...prev, [tauschId]: data2.bewerbungen ?? [] }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler.");
    }
  }

  const filtered = items.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight m-0">Tauschboerse</h1>
          <p className="font-sans text-sm text-arena-text mt-4">Bitte <Link href="/auth" className="text-arena-link hover:underline">melde dich an</Link>, um die Tauschboerse zu nutzen.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight m-0">Tauschboerse</h1>
          <div className="flex gap-2">
            <Link href="/diskussionen" className="btn font-sans">← Treffpunkt</Link>
            <button className="btn font-sans" onClick={() => setShowOverlay(true)}>Neues Angebot</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-arena-border-light">
          <button
            className={`font-sans px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "inserate" ? "border-arena-blue text-arena-blue" : "border-transparent text-arena-muted hover:text-arena-text"}`}
            onClick={() => setActiveTab("inserate")}
          >
            Inserate
          </button>
          <button
            className={`font-sans px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "meine-bewerbungen" ? "border-arena-blue text-arena-blue" : "border-transparent text-arena-muted hover:text-arena-text"}`}
            onClick={() => { setActiveTab("meine-bewerbungen"); void loadMeineBewerbungen(); }}
          >
            Meine Bewerbungen
            {meineBewerbungen.filter((b) => b.status === "ausstehend").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-arena-blue text-white rounded-full">
                {meineBewerbungen.filter((b) => b.status === "ausstehend").length}
              </span>
            )}
          </button>
        </div>

        {message && <p className="font-sans text-red-700 text-sm mt-4">{message}</p>}

        {/* ── Tab: Inserate ── */}
        {activeTab === "inserate" && (
          <>
            {/* Filter */}
            <div className="flex flex-wrap gap-2 my-3">
              <select className="input-base text-sm font-sans" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Alle Status</option>
                <option value="offen">Offen</option>
                <option value="reserviert">Reserviert</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </div>

            {isLoading ? (
              <p className="font-sans text-arena-muted text-sm mt-4">Lade Tauschboerse ...</p>
            ) : filtered.length === 0 ? (
              <p className="font-sans text-arena-muted text-sm mt-4">Keine Angebote gefunden. Erstelle das erste!</p>
            ) : (
              <div className="grid gap-3">
                {filtered.map((item) => {
                  const isOwn = item.authorUsername === username;
                  const isAdmin = role === "SUPERADMIN" || role === "ADMIN";
                  const ownBewerbung = ownBewerbungMap[item.id];
                  const bewerbungenList = bewerbungenMap[item.id] ?? [];
                  const isExpanded = expandedBewerbungen.has(item.id);

                  return (
                    <div key={item.id} className="card-base p-4 hover:border-arena-blue hover:shadow-xs transition-all duration-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="font-sans font-bold text-arena-blue text-base">{item.title}</strong>
                          <span className={`ml-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full font-sans ${statusColors[item.status] ?? ""}`}>
                            {item.status}
                          </span>
                          {item.category && item.category !== "Sonstiges" && (
                            <span className="ml-1 inline-block text-xs px-2 py-0.5 rounded-full font-sans bg-arena-bg text-arena-muted">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="font-sans text-sm mt-1.5 whitespace-pre-line text-arena-text leading-relaxed">{item.description}</p>
                      <div className="font-sans flex items-center justify-between gap-2 text-xs sm:text-sm text-arena-muted mt-3 flex-wrap">
                        <span>von {item.authorUsername} · {timeAgo(item.createdAt)}</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {/* Inserenten-Aktionen */}
                          {(isOwn || isAdmin) && item.status !== "abgeschlossen" && (
                            <>
                              {item.status === "offen" && (
                                <button className="btn btn-sm text-xs font-sans" onClick={() => handleStatusChange(item.id, "reserviert")}>Reservieren</button>
                              )}
                              {item.status === "reserviert" && (
                                <>
                                  <button className="btn btn-sm text-xs font-sans" onClick={() => handleStatusChange(item.id, "offen")}>Wieder oeffnen</button>
                                  <button className="btn btn-sm text-xs font-sans" onClick={() => handleStatusChange(item.id, "abgeschlossen")}>Abschliessen</button>
                                </>
                              )}
                            </>
                          )}
                          {(isOwn || isAdmin) && (
                            <button className="btn btn-sm text-xs text-red-600 font-sans" onClick={() => handleDelete(item.id)}>Loeschen</button>
                          )}

                          {/* Bewerber-Aktionen (nur fremde offene Inserate) */}
                          {!isOwn && item.status === "offen" && (
                            <>
                              {!ownBewerbung || ownBewerbung.status === "zurueckgezogen" ? (
                                <button
                                  className="btn btn-sm text-xs font-sans btn-primary"
                                  onClick={() => { setBewerbenItemId(item.id); setBewerbenNachricht(""); setBewerbenMessage(""); }}
                                >
                                  Bewerben
                                </button>
                              ) : (
                                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full font-sans ${bewerbungStatusColors[ownBewerbung.status]}`}>
                                  {bewerbungStatusLabel[ownBewerbung.status]}
                                </span>
                              )}
                              {ownBewerbung && ownBewerbung.status === "ausstehend" && (
                                <button
                                  className="btn btn-sm text-xs font-sans text-red-600"
                                  onClick={() => handleBewerbungZurueckziehen(ownBewerbung.id)}
                                >
                                  Zurueckziehen
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bewerbungen-Bereich (nur fuer Inserenten) */}
                      {(isOwn || isAdmin) && (
                        <div className="mt-3 pt-3 border-t border-arena-border-light">
                          <button
                            className="font-sans text-xs font-semibold text-arena-blue hover:underline"
                            onClick={() => toggleBewerbungenFuerInserat(item.id)}
                          >
                            {isExpanded ? "Bewerbungen ausblenden" : "Bewerbungen anzeigen"}
                            {bewerbungenList.length > 0 && ` (${bewerbungenList.length})`}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 grid gap-2">
                              {bewerbungenList.length === 0 ? (
                                <p className="font-sans text-xs text-arena-muted">Noch keine Bewerbungen.</p>
                              ) : (
                                bewerbungenList.map((b) => (
                                  <div key={b.id} className="bg-arena-bg rounded-lg p-3 text-sm">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="font-sans font-semibold text-arena-blue">{b.bewerberUsername}</span>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full font-sans ${bewerbungStatusColors[b.status]}`}>
                                        {bewerbungStatusLabel[b.status]}
                                      </span>
                                    </div>
                                    {b.nachricht && <p className="font-sans text-arena-text mt-1 text-xs whitespace-pre-line">{b.nachricht}</p>}
                                    <p className="font-sans text-arena-muted text-xs mt-1">{timeAgo(b.createdAt)}</p>
                                    {b.status === "ausstehend" && (
                                      <div className="flex gap-2 mt-2">
                                        <button
                                          className="btn btn-sm text-xs font-sans"
                                          onClick={() => handleBewerbungStatusChange(b.id, "angenommen", item.id)}
                                        >
                                          Annehmen
                                        </button>
                                        <button
                                          className="btn btn-sm text-xs font-sans text-red-600"
                                          onClick={() => handleBewerbungStatusChange(b.id, "abgelehnt", item.id)}
                                        >
                                          Ablehnen
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Meine Bewerbungen ── */}
        {activeTab === "meine-bewerbungen" && (
          <div className="mt-4">
            {meineBewerbungenLoading ? (
              <p className="font-sans text-arena-muted text-sm">Lade Bewerbungen ...</p>
            ) : meineBewerbungen.length === 0 ? (
              <p className="font-sans text-arena-muted text-sm">Du hast dich noch auf kein Inserat beworben.</p>
            ) : (
              <div className="grid gap-3">
                {meineBewerbungen.map((b) => {
                  const inserat = items.find((i) => i.id === b.tauschId);
                  return (
                    <div key={b.id} className="card-base p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <strong className="font-sans font-bold text-arena-blue text-sm">
                            {inserat ? inserat.title : `Inserat (${b.tauschId.slice(-6)})`}
                          </strong>
                          {inserat && (
                            <span className="font-sans ml-2 text-xs text-arena-muted">von {inserat.authorUsername}</span>
                          )}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full font-sans ${bewerbungStatusColors[b.status]}`}>
                          {bewerbungStatusLabel[b.status]}
                        </span>
                      </div>
                      {b.nachricht && (
                        <p className="font-sans text-xs text-arena-text mt-1 whitespace-pre-line">{b.nachricht}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                        <span className="font-sans text-xs text-arena-muted">{timeAgo(b.createdAt)}</span>
                        {b.status === "ausstehend" && (
                          <button
                            className="btn btn-sm text-xs font-sans text-red-600"
                            onClick={() => handleBewerbungZurueckziehen(b.id)}
                          >
                            Zurueckziehen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Modal: Neues Angebot ── */}
      {showOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowOverlay(false)}>
          <div className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0">Neues Tauschangebot</h2>

            <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-2">
              Titel
              <input className="input-base font-normal" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Was moechtest du tauschen?" />
            </label>

            <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue mt-2">
              Beschreibung
              <textarea className="input-base font-normal" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} rows={6} placeholder="Beschreibe, was du anbietest und was du suchst ..." />
            </label>

            <div className="flex gap-2 justify-end">
              <button className="btn font-sans" onClick={handleCreate} disabled={isSaving || !title.trim() || !description.trim()}>
                {isSaving ? "Wird erstellt ..." : "Angebot erstellen"}
              </button>
              <button className="btn font-sans" onClick={() => setShowOverlay(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Bewerben ── */}
      {bewerbenItemId && (
        <div className="overlay-backdrop" onClick={() => setBewerbenItemId(null)}>
          <div className="w-[min(480px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0">Auf Inserat bewerben</h2>
            <p className="font-sans text-sm text-arena-text m-0">
              Der Inserent erhaelt eine Benachrichtigung und sieht deine Bewerbung direkt im Inserat.
            </p>

            <label className="font-sans grid gap-1 text-sm font-bold text-arena-blue">
              Nachricht <span className="font-normal text-arena-muted">(optional, max. 1000 Zeichen)</span>
              <textarea
                className="input-base font-normal"
                value={bewerbenNachricht}
                onChange={(e) => setBewerbenNachricht(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Stell dich kurz vor oder erklaer, warum du gut zum Tausch passt ..."
              />
            </label>

            {bewerbenMessage && <p className="font-sans text-red-700 text-sm">{bewerbenMessage}</p>}

            <div className="flex gap-2 justify-end">
              <button
                className="btn font-sans btn-primary"
                onClick={handleBewerben}
                disabled={isBewerbing}
              >
                {isBewerbing ? "Wird gesendet ..." : "Bewerbung senden"}
              </button>
              <button className="btn font-sans" onClick={() => setBewerbenItemId(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
