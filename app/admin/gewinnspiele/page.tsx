"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

type Gewinnspiel = {
  _id: string;
  buchTitel: string;
  autorName: string;
  autorUsername: string;
  autorInstagram?: string;
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

function cleanInstaHandle(raw: string): string {
  let h = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  h = h.replace(/^@/, "");
  h = h.split(/[/?#]/)[0];
  return h.trim();
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
  const [socialView, setSocialView] = useState(false);

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
    void load();
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
    if (r.ok) {
      setEinreichungAktiv(aktiv);
      setMsg(aktiv ? "Einreichung aktiviert." : "Einreichung deaktiviert.");
    } else {
      setMsg("Fehler beim Speichern.");
    }
    setToggleSaving(false);
  }

  async function doStatusChange(id: string, status: string) {
    const r = await fetch(`/api/gewinnspiele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      setMsg("Status geändert.");
      await load();
    } else {
      const d = await r.json() as { message?: string };
      setMsg(d.message ?? "Fehler");
    }
  }

  async function doDelete(id: string) {
    if (!confirm("Gewinnspiel wirklich löschen?")) return;
    const r = await fetch(`/api/gewinnspiele/${id}`, { method: "DELETE" });
    if (r.ok) {
      setMsg("Gelöscht.");
      await load();
    } else {
      const d = await r.json() as { message?: string };
      setMsg(d.message ?? "Fehler");
    }
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
    if (r.ok) {
      setMsg("Gespeichert.");
      setEditId(null);
      await load();
    } else {
      const d = await r.json() as { message?: string };
      setMsg(d.message ?? "Fehler");
    }
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
    <main className="centered-main font-sans">
      <section className="card font-sans">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 font-sans">
          <h1 className="font-sans text-2xl font-bold text-arena-blue tracking-tight m-0">Gewinnspiele</h1>
          <Link href="/admin" className="btn btn-sm font-sans">
            ← Admin
          </Link>
        </div>

        {msg && (
          <div className="card-info font-sans flex items-center justify-between py-3 px-4 mb-4">
            <span className="text-sm font-medium">{msg}</span>
            <button className="text-sm font-bold opacity-75 hover:opacity-100 ml-3" onClick={() => setMsg("")}>✕</button>
          </div>
        )}

        {/* Einreichung-Toggle */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-arena-border-light bg-arena-bg-light font-sans mb-4">
          <div className="flex-1 font-sans">
            <p className="font-bold text-sm text-arena-blue m-0">Einreichung durch Autoren</p>
            <p className="text-xs text-arena-muted mt-1 m-0">Wenn deaktiviert, sehen Autoren kein Formular zum Einreichen neuer Bücher.</p>
          </div>
          <div className="flex items-center gap-2 font-sans">
            {einreichungAktiv === null ? (
              <span className="text-xs text-arena-muted">Lade…</span>
            ) : (
              <button
                onClick={() => void toggleEinreichung(!einreichungAktiv)}
                disabled={toggleSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  einreichungAktiv ? "bg-green-600" : "bg-arena-border"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  einreichungAktiv ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            )}
            <span className={`text-sm font-bold font-sans ${einreichungAktiv ? "text-green-700" : "text-arena-muted"}`}>
              {einreichungAktiv ? "Aktiv" : "Deaktiviert"}
            </span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-4 items-center font-sans">
          <div className="segmented-control font-sans flex-wrap">
            {["all", "vorschlag", "anmeldung", "verlost", "versendet", "archiv"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`segmented-control-btn font-sans ${statusFilter === s ? "active" : ""}`}
              >
                {s === "all" ? "Alle" : STATUS_LABEL[s]}
                {s === "vorschlag" && list.filter(g => g.status === "vorschlag").length > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                    {list.filter(g => g.status === "vorschlag").length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            className={`btn btn-sm font-sans ${socialView ? "btn-primary" : ""}`}
            onClick={() => setSocialView((v) => !v)}
            title="Zeigt die 8 neuesten Gewinnspiele als Social-Media-Kachelraster"
          >
            📸 Social Media
          </button>
        </div>

        {/* Social-Media-Ansicht */}
        {socialView && (() => {
          const newest8 = [...list].filter((g) => g.status === "anmeldung").slice(0, 8);
          return (
            <div className="mb-6 font-sans border-t border-arena-border-light pt-4">
              <p className="text-xs text-arena-muted font-bold mb-3">
                Die {newest8.length} aktuellsten Gewinnspiele mit offener Anmeldephase:
              </p>
              <div className="p-4 rounded-xl border border-arena-border-light bg-arena-bg font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newest8.map((g) => (
                    <a
                      key={g._id}
                      href={`/gewinnspiel/${g._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-3 items-start bg-white border border-arena-border-light rounded-xl p-3 no-underline text-arena-text transition-all hover:shadow-md hover:border-arena-blue"
                    >
                      {g.coverImageUrl ? (
                        <img
                          src={g.coverImageUrl}
                          alt={g.buchTitel}
                          className="w-16 h-24 object-cover rounded-lg flex-shrink-0 border border-arena-border-light"
                        />
                      ) : (
                        <div className="w-16 h-24 rounded-lg flex-shrink-0 bg-arena-border-light flex items-center justify-center text-2xl">🎁</div>
                      )}
                      <div className="min-w-0 font-sans flex-1">
                        <div className="font-bold text-sm leading-tight text-arena-blue mb-1 truncate">
                          {g.buchTitel}
                        </div>
                        <div className="text-xs text-arena-muted font-medium mb-2 truncate">von {g.autorName}</div>
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          <span className="text-[10px] font-bold bg-arena-bg text-arena-blue rounded-full px-2.5 py-0.5 border border-arena-border-light">{FORMAT_LABEL[g.format] ?? g.format}</span>
                          {g.anmeldungBis && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 rounded-full px-2.5 py-0.5 border border-amber-200">bis {new Date(g.anmeldungBis).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Caption */}
              {newest8.length > 0 && (() => {
                const captionLines = [
                  "🎁 Buch-Gewinnspiel auf BuchArena! 📚",
                  "",
                  "Wir verlosen tolle Bücher – und du kannst mit dabei sein!",
                  "Einfach auf bucharena.org anmelden und kostenlos teilnehmen.",
                  "",
                  `Das sind die ${newest8.length} aktuellen Verlosungen:`,
                  "",
                  ...newest8.map((g) => {
                    const fmtLabel = FORMAT_LABEL[g.format] ?? g.format;
                    const insta = g.autorInstagram ? ` (@${cleanInstaHandle(g.autorInstagram)})` : "";
                    return `📖 ${g.buchTitel} von ${g.autorName}${insta} (${fmtLabel})`;
                  }),
                  "",
                  "Jetzt mitmachen auf bucharena.org/gewinnspiel 🍀",
                  "",
                  "Rechtlicher Hinweis: Dieses Gewinnspiel steht in keinem Zusammenhang mit Instagram. Die jeweiligen Autoren sind für die Verlosung und den Versand der Gewinne zuständig. Es wird keine Haftung übernommen.",
                ].join("\n");
                return (
                  <div className="mt-4 font-sans">
                    <div className="flex items-center gap-3 mb-2 font-sans">
                      <span className="text-xs text-arena-blue font-bold">Caption</span>
                      <button
                        className="btn btn-sm font-sans"
                        onClick={() => void navigator.clipboard.writeText(captionLines)}
                      >
                        📋 Kopieren
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed bg-arena-bg border border-arena-border-light rounded-xl p-4 m-0 text-arena-text max-h-[300px] overflow-y-auto">
                      {captionLines}
                    </pre>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {loading ? (
          <p className="font-sans text-sm text-arena-muted mt-2">Lade…</p>
        ) : filtered.length === 0 ? (
          <p className="font-sans text-sm text-arena-muted mt-2">Keine Gewinnspiele vorhanden.</p>
        ) : (
          <div className="flex flex-col gap-4 font-sans mt-2">
            {filtered.map((g) => (
              <div key={g._id} className="border border-arena-border-light rounded-xl p-4 font-sans bg-white hover:shadow-xs transition-shadow">
                <div className="flex gap-4 items-start flex-wrap sm:flex-nowrap font-sans">
                  {g.coverImageUrl && (
                    <img src={g.coverImageUrl} alt={g.buchTitel} className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0 border border-arena-border-light" />
                  )}
                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5 font-sans">
                      <span className="font-sans font-bold text-base leading-tight text-arena-blue">{g.buchTitel}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        g.status === "vorschlag" ? "bg-orange-50 text-orange-800 border border-orange-200" :
                        g.status === "anmeldung" ? "bg-green-50 text-green-800 border border-green-200" :
                        g.status === "verlost" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                        g.status === "versendet" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                        "bg-arena-bg text-arena-muted border border-arena-border-light"
                      }`}>
                        {STATUS_LABEL[g.status] ?? g.status}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-arena-bg text-arena-muted border border-arena-border-light">
                        {FORMAT_LABEL[g.format] ?? g.format}
                      </span>
                    </div>
                    <div className="text-xs text-arena-muted font-medium mb-1">Autor: <span className="text-arena-blue font-bold">{g.autorName}</span> (@{g.autorUsername})</div>
                    {g.gewinnerName && (
                      <div className="text-xs font-bold text-green-700 mt-1">Gewinner: {g.gewinnerName}</div>
                    )}

                    {editId === g._id ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border border-arena-border-light bg-arena-bg-light rounded-xl p-4 font-sans">
                        <label className="flex flex-col gap-1 font-sans">
                          <span className="font-bold text-arena-blue text-[10px] uppercase">Anmeldung von</span>
                          <input type="datetime-local" className="input-base font-normal text-xs min-h-[2rem]"
                            value={editFields.anmeldungVon?.slice(0, 16) ?? ""}
                            onChange={(e) => setEditFields((f) => ({ ...f, anmeldungVon: e.target.value }))} />
                        </label>
                        <label className="flex flex-col gap-1 font-sans">
                          <span className="font-bold text-arena-blue text-[10px] uppercase">Anmeldung bis</span>
                          <input type="datetime-local" className="input-base font-normal text-xs min-h-[2rem]"
                            value={editFields.anmeldungBis?.slice(0, 16) ?? ""}
                            onChange={(e) => setEditFields((f) => ({ ...f, anmeldungBis: e.target.value }))} />
                        </label>
                        <label className="flex flex-col gap-1 font-sans">
                          <span className="font-bold text-arena-blue text-[10px] uppercase">Ziehung am</span>
                          <input type="datetime-local" className="input-base font-normal text-xs min-h-[2rem]"
                            value={editFields.ziehungAm?.slice(0, 16) ?? ""}
                            onChange={(e) => setEditFields((f) => ({ ...f, ziehungAm: e.target.value }))} />
                        </label>
                        <div className="sm:col-span-3 flex gap-2 mt-2 font-sans">
                          <button onClick={() => void saveEdit(g._id)}
                            className="btn btn-sm btn-primary font-sans">
                            Speichern
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="btn btn-sm font-sans">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : aktivId === g._id ? (
                      /* Aktivierungs-Formular für Vorschläge */
                      <div className="mt-3 p-4 rounded-xl border border-orange-200 bg-orange-50 font-sans">
                        <p className="text-xs font-bold text-orange-900 mb-3">Zeiträume festlegen und Gewinnspiel aktivieren</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="flex flex-col gap-1 font-sans">
                            <span className="font-bold text-orange-950 text-[10px] uppercase">Anmeldung von *</span>
                            <input type="datetime-local" className="input-base font-normal text-xs min-h-[2rem] border-orange-200"
                              value={aktivFields.anmeldungVon}
                              onChange={(e) => setAktivFields((f) => ({ ...f, anmeldungVon: e.target.value }))} />
                          </label>
                          <label className="flex flex-col gap-1 font-sans">
                            <span className="font-bold text-orange-950 text-[10px] uppercase">Anmeldung bis *</span>
                            <input type="datetime-local" className="input-base font-normal text-xs min-h-[2rem] border-orange-200"
                              value={aktivFields.anmeldungBis}
                              onChange={(e) => setAktivFields((f) => ({ ...f, anmeldungBis: e.target.value }))} />
                          </label>
                          <label className="flex flex-col gap-1 font-sans">
                            <span className="font-bold text-orange-950 text-[10px] uppercase">Ziehung am *</span>
                            <input type="datetime-local" className="input-base font-normal text-xs min-h-[2rem] border-orange-200"
                              value={aktivFields.ziehungAm}
                              onChange={(e) => setAktivFields((f) => ({ ...f, ziehungAm: e.target.value }))} />
                          </label>
                        </div>
                        <div className="flex gap-2 mt-4 font-sans">
                          <button
                            onClick={() => void aktivieren(g._id)}
                            disabled={aktivSaving}
                            className="btn btn-sm btn-primary font-sans bg-orange-600 border-orange-600 text-white"
                          >
                            {aktivSaving ? "Wird aktiviert…" : "Jetzt aktivieren"}
                          </button>
                          <button onClick={() => setAktivId(null)}
                            className="btn btn-sm font-sans">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-arena-muted grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 border-t border-arena-border-light pt-2 font-sans">
                        {g.anmeldungVon ? (
                          <>
                            <span><strong>Anmeldung:</strong> {formatDt(g.anmeldungVon)} – {formatDt(g.anmeldungBis)}</span>
                            <span><strong>Ziehung:</strong> {formatDt(g.ziehungAm)}</span>
                            {g.verlostAm && <span><strong>Verlost:</strong> {formatDt(g.verlostAm)}</span>}
                          </>
                        ) : (
                          <span className="col-span-2 italic text-arena-muted">Noch kein Zeitraum festgelegt</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Aktions-Buttons */}
                <div className="flex flex-wrap gap-2 mt-4 border-t border-arena-border-light pt-3 font-sans">
                  {/* Vorschlag aktivieren */}
                  {g.status === "vorschlag" && aktivId !== g._id && (
                    <button
                      onClick={() => {
                        setAktivId(g._id);
                        setAktivFields({ anmeldungVon: "", anmeldungBis: "", ziehungAm: "" });
                      }}
                      className="btn btn-sm btn-primary font-sans bg-orange-600 border-orange-600 text-white"
                    >
                      Aktivieren
                    </button>
                  )}
                  {g.status === "anmeldung" && (
                    <button
                      onClick={() => { setEditId(g._id); setEditFields({ anmeldungVon: g.anmeldungVon, anmeldungBis: g.anmeldungBis, ziehungAm: g.ziehungAm }); }}
                      className="btn btn-sm font-sans"
                    >
                      Zeiträume bearbeiten
                    </button>
                  )}
                  {(g.status === "verlost" || g.status === "versendet") && (
                    <button
                      onClick={() => void doStatusChange(g._id, "archiv")}
                      className="btn btn-sm font-sans"
                    >
                      Archivieren
                    </button>
                  )}
                  <a
                    href={`/gewinnspiel/${g._id}/teilnehmer`}
                    className="btn btn-sm font-sans"
                  >
                    Teilnehmer
                  </a>
                  <a
                    href={`/gewinnspiel/${g._id}/ziehung`}
                    className="btn btn-sm font-sans border-arena-blue text-arena-blue font-bold hover:bg-arena-bg"
                  >
                    🎬 Ziehung / Reel-Test
                  </a>
                  <button
                    onClick={() => void doDelete(g._id)}
                    className="btn btn-sm btn-danger font-sans"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
