"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

const CATEGORIES = ["Buch", "Hörbuch", "E-Book", "Lesezeichen", "Sonstiges"];

type TauschItem = {
  id: string;
  authorUsername: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  offen: "bg-green-100 text-green-700",
  reserviert: "bg-yellow-100 text-yellow-700",
  abgeschlossen: "bg-gray-200 text-gray-500",
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

  const [showOverlay, setShowOverlay] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Buch");
  const [isSaving, setIsSaving] = useState(false);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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
      setMessage("Tauschbörse konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  async function handleCreate() {
    if (!title.trim() || !description.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/tausch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      setTitle("");
      setDescription("");
      setCategory("Buch");
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
    if (!confirm("Eintrag wirklich löschen?")) return;
    try {
      const res = await fetch("/api/tausch/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Fehler");
      await loadItems();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler beim Löschen.");
    }
  }

  const filtered = items.filter((item) => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  if (!username) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1>Tauschbörse</h1>
          <p>Bitte <Link href="/auth">melde dich an</Link>, um die Tauschbörse zu nutzen.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Tauschbörse</h1>
          <div className="flex gap-2">
            <Link href="/diskussionen" className="btn">← Treffpunkt</Link>
            <button className="btn" onClick={() => setShowOverlay(true)}>Neues Angebot</button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 my-2">
          <select className="input-base text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Alle Kategorien</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-base text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Alle Status</option>
            <option value="offen">Offen</option>
            <option value="reserviert">Reserviert</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
        </div>

        {message && <p className="text-red-700">{message}</p>}

        {isLoading ? (
          <p>Lade Tauschbörse ...</p>
        ) : filtered.length === 0 ? (
          <p>Keine Angebote gefunden. Erstelle das erste!</p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-arena-border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{item.title}</strong>
                    <span className={`ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[item.status] ?? ""}`}>
                      {item.status}
                    </span>
                    <span className="ml-2 inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {item.category}
                    </span>
                  </div>
                </div>
                <p className="text-sm mt-1.5 whitespace-pre-line">{item.description}</p>
                <div className="flex items-center justify-between gap-2 text-sm text-arena-muted mt-2">
                  <span>von {item.authorUsername} · {timeAgo(item.createdAt)}</span>
                  <div className="flex gap-1.5">
                    {(item.authorUsername === username || role === "SUPERADMIN") && item.status !== "abgeschlossen" && (
                      <>
                        {item.status === "offen" && (
                          <button className="btn btn-sm text-xs" onClick={() => handleStatusChange(item.id, "reserviert")}>Reservieren</button>
                        )}
                        {item.status === "reserviert" && (
                          <>
                            <button className="btn btn-sm text-xs" onClick={() => handleStatusChange(item.id, "offen")}>Wieder öffnen</button>
                            <button className="btn btn-sm text-xs" onClick={() => handleStatusChange(item.id, "abgeschlossen")}>Abschließen</button>
                          </>
                        )}
                      </>
                    )}
                    {(item.authorUsername === username || role === "SUPERADMIN") && (
                      <button className="btn btn-sm text-xs text-red-600" onClick={() => handleDelete(item.id)}>Löschen</button>
                    )}
                    {username && item.authorUsername !== username && (
                      <Link href={`/nachrichten?an=${encodeURIComponent(item.authorUsername)}&betreff=${encodeURIComponent(`Tausch: ${item.title}`)}`} className="btn btn-sm text-xs">
                        Anfragen
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showOverlay && (
        <div className="overlay-backdrop" onClick={() => setShowOverlay(false)}>
          <div className="w-[min(560px,100%)] bg-white rounded-xl p-4 box-border grid gap-3.5" onClick={(e) => e.stopPropagation()}>
            <h2>Neues Tauschangebot</h2>

            <label className="grid gap-1 text-[0.95rem]">
              Titel
              <input className="input-base" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Was möchtest du tauschen?" />
            </label>

            <label className="grid gap-1 text-[0.95rem]">
              Kategorie
              <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="grid gap-1 text-[0.95rem]">
              Beschreibung
              <textarea className="input-base" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} rows={6} placeholder="Beschreibe, was du anbietest und was du suchst ..." />
            </label>

            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={handleCreate} disabled={isSaving || !title.trim() || !description.trim()}>
                {isSaving ? "Wird erstellt ..." : "Angebot erstellen"}
              </button>
              <button className="btn" onClick={() => setShowOverlay(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
