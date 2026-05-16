"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

type Gewinnspiel = {
  _id: string;
  buchTitel: string;
  autorName: string;
  autorUsername: string;
  format: string;
  anmeldungVon?: string;
  anmeldungBis?: string;
  ziehungAm?: string;
  status: string;
  gewinnerName?: string;
  verlostAm?: string;
  teilnehmerAnzahl?: number;
  coverImageUrl?: string;
};

const STATUS_LABEL: Record<string, string> = {
  vorschlag: "Eingereicht",
  anmeldung: "Anmeldephase",
  verlost: "Verlost",
  versendet: "Versendet",
  archiv: "Archiv",
};

const FORMAT_LABEL: Record<string, string> = {
  ebook: "E-Book",
  print: "Print",
  both: "E-Book & Print",
};

function formatDt(iso: string | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminGewinnspielePage() {
  const router = useRouter();
  const [list, setList] = useState<Gewinnspiel[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");


  // Einreichung-Toggle
  const [einreichungAktiv, setEinreichungAktiv] = useState<boolean | null>(null);
  const [toggleSaving, setToggleSaving] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState("vorschlag");

  // Inline-Edit (Zeiträume ändern für aktive Gewinnspiele)
  const [editId, setEditId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Gewinnspiel>>({});

  // Aktivierungs-Formular für Vorschläge
  const [aktivId, setAktivId] = useState<string | null>(null);
  const [aktivFields, setAktivFields] = useState({ anmeldungVon: "", anmeldungBis: "", ziehungAm: "" });
  const [aktivSaving, setAktivSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/gewinnspiele/list");
    if (r.ok) {
      const data = await r.json() as Gewinnspiel[];
      // Teilnehmeranzahl für jeden Eintrag laden
      setList(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const acc = getStoredAccount();
    if (!acc || (acc.role !== "ADMIN" && acc.role !== "SUPERADMIN")) {
      router.replace("/admin");
      return;
    }
    load();
    fetch("/api/admin/gewinnspiele-einreichung")
      .then((r) => r.json() as Promise<{ aktiv: boolean }>)
      .then((d) => setEinreichungAktiv(d.aktiv))
      .catch(() => setEinreichungAktiv(true));
  }, [load, router]);

  async function toggleEinreichung(aktiv: boolean) {
    setToggleSaving(true);
    const r = await fetch("/api/admin/gewinnspiele-einreichung", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktiv }),
    });
    if (r.ok) { setEinreichungAktiv(aktiv); setMsg(aktiv ? "Einreichung aktiviert." : "Einreichung deaktiviert."); }
    else { setMsg("Fehler beim Speichern."); }
    setToggleSaving(false);
  }

  async function doStatusChange(id: string, status: string) {
    const r = await fetch(`/api/gewinnspiele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) { setMsg("Status geändert."); await load(); }
    else { const d = await r.json() as { message?: string }; setMsg(d.message ?? "Fehler"); }
  }

  async function doDelete(id: string) {
    if (!confirm("Gewinnspiel wirklich löschen?")) return;
    const r = await fetch(`/api/gewinnspiele/${id}`, { method: "DELETE" });
    if (r.ok) { setMsg("Gelöscht."); await load(); }
    else { const d = await r.json() as { message?: string }; setMsg(d.message ?? "Fehler"); }
  }

  async function saveEdit(id: string) {
    const r = await fetch(`/api/gewinnspiele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anmeldungVon: editFields.anmeldungVon,
        anmeldungBis: editFields.anmeldungBis,
        ziehungAm: editFields.ziehungAm,
      }),
    });
    if (r.ok) { setMsg("Gespeichert."); setEditId(null); await load(); }
    else { const d = await r.json() as { message?: string }; setMsg(d.message ?? "Fehler"); }
  }

  async function aktivieren(id: string) {
    if (!aktivFields.anmeldungVon || !aktivFields.anmeldungBis || !aktivFields.ziehungAm) {
      setMsg("Bitte alle Zeiträume ausfüllen.");
      return;
    }
    setAktivSaving(true);
    const r = await fetch(`/api/gewinnspiele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "anmeldung",
        anmeldungVon: aktivFields.anmeldungVon,
        anmeldungBis: aktivFields.anmeldungBis,
        ziehungAm: aktivFields.ziehungAm,
      }),
    });
    if (r.ok) {
      setMsg("Gewinnspiel aktiviert – Anmeldephase hat begonnen.");
      setAktivId(null);
      await load();
    } else {
      const d = await r.json() as { message?: string };
      setMsg(d.message ?? "Fehler");
    }
    setAktivSaving(false);
  }

  const filtered = list.filter((g) => statusFilter === "all" || g.status === statusFilter);

  return (
    <div className="site-shell py-8">
      <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--color-arena-blue)" }}>
        Gewinnspiele
      </h1>

      {msg && (
        <div className="mb-4 p-3 rounded text-sm" style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" }}>
          {msg}
          <button className="ml-3 text-xs underline" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      {/* Einreichung-Toggle */}
      <div className="mb-6 flex items-center gap-4 p-4 rounded-lg border" style={{ borderColor: "var(--color-arena-border)" }}>
        <div className="flex-1">
          <p className="font-medium text-sm">Einreichung durch Autoren</p>
          <p className="text-xs opacity-60 mt-0.5">Wenn deaktiviert, sehen Autoren kein Formular zum Einreichen neuer Bücher.</p>
        </div>
        {einreichungAktiv === null ? (
          <span className="text-xs opacity-50">Lade…</span>
        ) : (
          <button
            onClick={() => toggleEinreichung(!einreichungAktiv)}
            disabled={toggleSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              einreichungAktiv ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              einreichungAktiv ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        )}
        <span className={`text-sm font-medium ${einreichungAktiv ? "text-green-700" : "text-gray-500"}`}>
          {einreichungAktiv ? "Aktiv" : "Deaktiviert"}
        </span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "vorschlag", "anmeldung", "verlost", "versendet", "archiv"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${statusFilter === s ? "bg-[var(--color-arena-blue)] text-white border-[var(--color-arena-blue)]" : "bg-white text-[var(--color-arena-blue)] border-[var(--color-arena-blue)]"}`}
          >
            {s === "all" ? "Alle" : STATUS_LABEL[s]}
            {s === "vorschlag" && list.filter(g => g.status === "vorschlag").length > 0 && (
              <span className="ml-1.5 bg-orange-400 text-white text-xs rounded-full px-1.5 py-0.5">
                {list.filter(g => g.status === "vorschlag").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm opacity-60">Lade…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm opacity-60">Keine Gewinnspiele vorhanden.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((g) => (
            <div key={g._id} className="border rounded-lg p-4" style={{ borderColor: "var(--color-arena-border)" }}>
              <div className="flex gap-3 items-start">
                {g.coverImageUrl && (
                  <img src={g.coverImageUrl} alt={g.buchTitel} className="w-14 h-20 object-cover rounded shadow-sm flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-lg leading-tight">{g.buchTitel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      g.status === "vorschlag" ? "bg-orange-100 text-orange-800" :
                      g.status === "anmeldung" ? "bg-green-100 text-green-800" :
                      g.status === "verlost" ? "bg-yellow-100 text-yellow-800" :
                      g.status === "versendet" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {STATUS_LABEL[g.status] ?? g.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {FORMAT_LABEL[g.format] ?? g.format}
                    </span>
                  </div>
                  <div className="text-sm opacity-70">Autor: {g.autorName} (@{g.autorUsername})</div>
                  {g.gewinnerName && (
                    <div className="text-sm font-medium text-green-700 mt-1">Gewinner: {g.gewinnerName}</div>
                  )}

                  {editId === g._id ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <label className="flex flex-col gap-1">
                        <span className="font-medium text-xs">Anmeldung von</span>
                        <input type="datetime-local" className="border rounded px-2 py-1 text-xs"
                          value={editFields.anmeldungVon?.slice(0, 16) ?? ""}
                          onChange={(e) => setEditFields((f) => ({ ...f, anmeldungVon: e.target.value }))} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-medium text-xs">Anmeldung bis</span>
                        <input type="datetime-local" className="border rounded px-2 py-1 text-xs"
                          value={editFields.anmeldungBis?.slice(0, 16) ?? ""}
                          onChange={(e) => setEditFields((f) => ({ ...f, anmeldungBis: e.target.value }))} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-medium text-xs">Ziehung am</span>
                        <input type="datetime-local" className="border rounded px-2 py-1 text-xs"
                          value={editFields.ziehungAm?.slice(0, 16) ?? ""}
                          onChange={(e) => setEditFields((f) => ({ ...f, ziehungAm: e.target.value }))} />
                      </label>
                      <div className="sm:col-span-3 flex gap-2 mt-1">
                        <button onClick={() => saveEdit(g._id)}
                          className="px-3 py-1 text-xs rounded bg-[var(--color-arena-blue)] text-white">
                          Speichern
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="px-3 py-1 text-xs rounded border">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : aktivId === g._id ? (
                    /* Aktivierungs-Formular für Vorschläge */
                    <div className="mt-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                      <p className="text-xs font-semibold text-orange-800 mb-2">Zeiträume festlegen und Gewinnspiel aktivieren</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="font-medium text-xs">Anmeldung von *</span>
                          <input type="datetime-local" className="border rounded px-2 py-1 text-xs"
                            value={aktivFields.anmeldungVon}
                            onChange={(e) => setAktivFields((f) => ({ ...f, anmeldungVon: e.target.value }))} />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="font-medium text-xs">Anmeldung bis *</span>
                          <input type="datetime-local" className="border rounded px-2 py-1 text-xs"
                            value={aktivFields.anmeldungBis}
                            onChange={(e) => setAktivFields((f) => ({ ...f, anmeldungBis: e.target.value }))} />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="font-medium text-xs">Ziehung am *</span>
                          <input type="datetime-local" className="border rounded px-2 py-1 text-xs"
                            value={aktivFields.ziehungAm}
                            onChange={(e) => setAktivFields((f) => ({ ...f, ziehungAm: e.target.value }))} />
                        </label>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => aktivieren(g._id)}
                          disabled={aktivSaving}
                          className="px-4 py-1.5 text-xs rounded bg-[var(--color-arena-blue)] text-white disabled:opacity-50 font-medium"
                        >
                          {aktivSaving ? "Wird aktiviert…" : "Jetzt aktivieren"}
                        </button>
                        <button onClick={() => setAktivId(null)}
                          className="px-3 py-1.5 text-xs rounded border">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs opacity-60 grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                      {g.anmeldungVon ? (
                        <>
                          <span>Anmeldung: {formatDt(g.anmeldungVon)} – {formatDt(g.anmeldungBis)}</span>
                          <span>Ziehung: {formatDt(g.ziehungAm)}</span>
                          {g.verlostAm && <span>Verlost: {formatDt(g.verlostAm)}</span>}
                        </>
                      ) : (
                        <span className="col-span-3 italic">Noch kein Zeitraum festgelegt</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Aktions-Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Vorschlag aktivieren */}
                {g.status === "vorschlag" && aktivId !== g._id && (
                  <button
                    onClick={() => {
                      setAktivId(g._id);
                      setAktivFields({ anmeldungVon: "", anmeldungBis: "", ziehungAm: "" });
                    }}
                    className="px-3 py-1.5 text-sm rounded font-medium bg-orange-500 text-white hover:opacity-80"
                  >
                    Aktivieren
                  </button>
                )}
                {g.status === "anmeldung" && (
                  <button
                    onClick={() => { setEditId(g._id); setEditFields({ anmeldungVon: g.anmeldungVon, anmeldungBis: g.anmeldungBis, ziehungAm: g.ziehungAm }); }}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Zeiträume bearbeiten
                  </button>
                )}
                {(g.status === "verlost" || g.status === "versendet") && (
                  <button
                    onClick={() => doStatusChange(g._id, "archiv")}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Archivieren
                  </button>
                )}
                <a
                  href={`/gewinnspiel/${g._id}/teilnehmer`}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Teilnehmer
                </a>
                <a
                  href={`/gewinnspiel/${g._id}/ziehung`}
                  className="px-3 py-1.5 text-sm rounded font-medium border hover:opacity-80"
                  style={{ borderColor: "var(--color-arena-blue)", color: "var(--color-arena-blue)" }}
                >
                  🎬 Ziehung / Reel-Test
                </a>
                <button
                  onClick={() => doDelete(g._id)}
                  className="px-3 py-1.5 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
