"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";
import Image from "next/image";

type Buch = { id: string; title: string; coverImageUrl?: string; genre?: string };

type Gewinnspiel = {
  _id: string;
  buchTitel: string;
  format: string;
  status: string;
  anmeldungVon?: string;
  anmeldungBis?: string;
  ziehungAm?: string;
  gewinnerName?: string;
  gewinnerEmail?: string;
  gewinnerAdresse?: string;
  verlostAm?: string;
  versendetAm?: string;
  teilnehmerAnzahl?: number;
  coverImageUrl?: string;
};

const STATUS_LABEL: Record<string, string> = {
  vorschlag: "Eingereicht – Zeitraum noch nicht festgelegt",
  anmeldung: "Anmeldephase aktiv",
  verlost: "Verlost – bitte versenden",
  versendet: "Versendet",
  archiv: "Archiviert",
};

const FORMAT_LABEL: Record<string, string> = {
  ebook: "E-Book",
  print: "Print",
  both: "E-Book & Print",
};

function fmtDt(iso: string | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}


export default function AutorGewinnspielPage() {
  const router = useRouter();
  const [buecher, setBuecher] = useState<Buch[]>([]);
  const [eigeneGewinnspiele, setEigeneGewinnspiele] = useState<Gewinnspiel[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const [buchId, setBuchId] = useState("");
  const [format, setFormat] = useState<"ebook" | "print" | "both">("print");
  const [beschreibung, setBeschreibung] = useState("");
  const [anmeldungVon, setAnmeldungVon] = useState("");
  const [anmeldungBis, setAnmeldungBis] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline-Zeitraum-Formular für bestehende Vorschläge
  const [editZeitraumId, setEditZeitraumId] = useState<string | null>(null);
  const [ezVon, setEzVon] = useState("");
  const [ezBis, setEzBis] = useState("");
  const [ezSaving, setEzSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [buechRes, gwRes] = await Promise.all([
      fetch("/api/gewinnspiele/meine-buecher"),
      fetch("/api/gewinnspiele/list"),
    ]);
    if (buechRes.ok) setBuecher(await buechRes.json() as Buch[]);
    if (gwRes.ok) {
      const all = await gwRes.json() as (Gewinnspiel & { autorUsername?: string })[];
      const accNow = getStoredAccount();
      const own = all.filter((g) => g.autorUsername === accNow?.username);
      // Detail-Daten laden (inkl. gewinnerEmail / gewinnerAdresse)
      const details = await Promise.all(
        own.map((g) =>
          fetch(`/api/gewinnspiele/${g._id}`)
            .then((r) => r.json() as Promise<Gewinnspiel>)
            .catch(() => null)
        )
      );
      setEigeneGewinnspiele(details.filter((d): d is Gewinnspiel => !!d));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const acc = getStoredAccount();
    if (!acc) { router.push("/auth"); return; }
    load();
    const sync = () => {
      const a = getStoredAccount();
      if (!a) router.push("/auth");
    };
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
  }, [load, router]);

  async function einreichen(e: React.FormEvent) {
    e.preventDefault();
    if (!buchId) { setMsg({ text: "Bitte ein Buch auswählen.", ok: false }); return; }
    setSaving(true);
    setMsg(null);
    const r = await fetch("/api/gewinnspiele/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buchId, format, beschreibung, anmeldungVon: anmeldungVon || undefined, anmeldungBis: anmeldungBis || undefined }),
    });
    const d = await r.json() as { id?: string; message?: string };
    if (r.ok) {
      const hasDates = anmeldungVon && anmeldungBis;
      setMsg({ text: hasDates ? "Gewinnspiel gestartet! Die Anmeldephase ist jetzt aktiv." : "Buch erfolgreich eingereicht. Du kannst den Zeitraum jetzt direkt festlegen.", ok: true });
      setBuchId(""); setBeschreibung(""); setAnmeldungVon(""); setAnmeldungBis("");
      await load();
    } else {
      setMsg({ text: d.message ?? "Fehler", ok: false });
    }
    setSaving(false);
  }

  async function aktiviereZeitraum(id: string) {
    if (!ezVon || !ezBis) { setMsg({ text: "Bitte Anmeldungs-Von und -Bis ausfüllen.", ok: false }); return; }
    setEzSaving(true);
    const r = await fetch(`/api/gewinnspiele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anmeldungVon: ezVon, anmeldungBis: ezBis, status: "anmeldung" }),
    });
    if (r.ok) {
      setMsg({ text: "Gewinnspiel gestartet! Anmeldephase ist aktiv.", ok: true });
      setEditZeitraumId(null);
      await load();
    } else {
      const d = await r.json() as { message?: string };
      setMsg({ text: d.message ?? "Fehler", ok: false });
    }
    setEzSaving(false);
  }

  async function markVersendet(id: string) {
    if (!confirm("Versand als abgeschlossen markieren?")) return;
    const r = await fetch(`/api/gewinnspiele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "versendet" }),
    });
    if (r.ok) { setMsg({ text: "Als versendet markiert.", ok: true }); await load(); }
    else { const d = await r.json() as { message?: string }; setMsg({ text: d.message ?? "Fehler", ok: false }); }
  }

  return (
    <div className="site-shell py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-arena-blue)" }}>
        Buch für Gewinnspiel einreichen
      </h1>
      <p className="text-sm opacity-70 mb-6">
        Stelle eines deiner Bücher für eine Verlosung zur Verfügung. Du kannst den Anmeldezeitraum
        direkt selbst festlegen – oder das Buch erst einreichen und den Zeitraum später bestimmen.
        Nach der Ziehung erhältst du die Kontaktdaten des Gewinners und übernimmst den Versand eigenständig.
      </p>

      {msg && (
        <div className={`mb-4 p-3 rounded text-sm ${msg.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
          <button className="ml-3 text-xs underline" onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {/* Formular: neues Gewinnspiel */}
      <div className="border rounded-lg p-5 mb-8" style={{ borderColor: "var(--color-arena-border)", background: "var(--color-arena-bg)" }}>
        <h2 className="text-lg font-semibold mb-4">Neues Buch einreichen</h2>
        <form onSubmit={einreichen} className="flex flex-col gap-4">
          {/* Buch-Auswahl */}
          <div>
            <label className="block text-sm font-medium mb-1">Buch auswählen *</label>
            {loading ? (
              <p className="text-sm opacity-50">Lade Bücher…</p>
            ) : buecher.length === 0 ? (
              <p className="text-sm text-red-600">Du hast noch keine Bücher hinterlegt. <a href="/meine-buecher" className="underline">Jetzt Buch hinzufügen</a></p>
            ) : (
              <select
                value={buchId}
                onChange={(e) => setBuchId(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-arena-border)" }}
              >
                <option value="">– Buch auswählen –</option>
                {buecher.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium mb-2">Format *</label>
            <div className="flex gap-4">
              {(["ebook", "print", "both"] as const).map((f) => (
                <label key={f} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                  />
                  {FORMAT_LABEL[f]}
                </label>
              ))}
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium mb-1">Hinweis (optional)</label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="z. B. Signiertes Exemplar, besondere Ausgabe…"
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              style={{ borderColor: "var(--color-arena-border)" }}
            />
          </div>

          {/* Optionaler Zeitraum beim Einreichen */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium mb-3">Anmeldezeitraum jetzt festlegen (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Anmeldung von</label>
                <input type="datetime-local" value={anmeldungVon} onChange={(e) => setAnmeldungVon(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm" style={{ borderColor: "var(--color-arena-border)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Anmeldung bis</label>
                <input type="datetime-local" value={anmeldungBis} onChange={(e) => setAnmeldungBis(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm" style={{ borderColor: "var(--color-arena-border)" }} />
              </div>
            </div>
            <p className="text-xs opacity-50 mt-2">Wenn du beide Felder ausfüllst, startet das Gewinnspiel sofort. Das Ziehungsdatum legst du selbst fest.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="self-start px-5 py-2 rounded font-medium text-sm transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-arena-blue)", color: "white" }}
          >
            {saving ? "Wird eingereicht…" : "Einreichen"}
          </button>
        </form>
      </div>

      {/* Eigene Gewinnspiele */}
      <h2 className="text-lg font-semibold mb-3">Meine Gewinnspiele</h2>
      {loading ? (
        <p className="text-sm opacity-50">Lade…</p>
      ) : eigeneGewinnspiele.length === 0 ? (
        <p className="text-sm opacity-60">Noch keine Bücher eingereicht.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {eigeneGewinnspiele.map((g) => (
            <div key={g._id} className="border rounded-lg p-4" style={{ borderColor: "var(--color-arena-border)" }}>
              <div className="flex gap-3">
                {g.coverImageUrl && (
                  <img src={g.coverImageUrl} alt={g.buchTitel} className="w-12 h-16 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold">{g.buchTitel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      g.status === "vorschlag" ? "bg-gray-100 text-gray-600" :
                      g.status === "anmeldung" ? "bg-green-100 text-green-800" :
                      g.status === "verlost" ? "bg-yellow-100 text-yellow-800" :
                      g.status === "versendet" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {STATUS_LABEL[g.status] ?? g.status}
                    </span>
                    <span className="text-xs text-gray-500">{FORMAT_LABEL[g.format]}</span>
                    {g.teilnehmerAnzahl !== undefined && (
                      <span className="text-xs text-gray-500">{g.teilnehmerAnzahl} Teilnehmer</span>
                    )}
                  </div>

                  {g.anmeldungVon ? (
                    <div className="text-xs opacity-60 mt-1">
                      Anmeldung: {fmtDt(g.anmeldungVon)} – {fmtDt(g.anmeldungBis)}
                    </div>
                  ) : g.status === "vorschlag" ? (
                    <div className="mt-2">
                      {editZeitraumId === g._id ? (
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <p className="text-xs font-medium mb-2">Zeitraum festlegen &amp; starten</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="block text-xs mb-0.5">Anmeldung von</label>
                              <input type="datetime-local" value={ezVon} onChange={(e) => setEzVon(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs" style={{ borderColor: "var(--color-arena-border)" }} />
                            </div>
                            <div>
                              <label className="block text-xs mb-0.5">Anmeldung bis</label>
                              <input type="datetime-local" value={ezBis} onChange={(e) => setEzBis(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs" style={{ borderColor: "var(--color-arena-border)" }} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => aktiviereZeitraum(g._id)}
                              disabled={ezSaving}
                              className="px-3 py-1.5 text-xs rounded font-medium disabled:opacity-50"
                              style={{ background: "var(--color-arena-blue)", color: "white" }}
                            >
                              {ezSaving ? "Starte…" : "Gewinnspiel starten"}
                            </button>
                            <button
                              onClick={() => setEditZeitraumId(null)}
                              className="px-3 py-1.5 text-xs rounded border"
                              style={{ borderColor: "var(--color-arena-border)" }}
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditZeitraumId(g._id); setEzVon(""); setEzBis(""); }}
                          className="text-xs px-2 py-1 rounded border"
                          style={{ borderColor: "var(--color-arena-blue)", color: "var(--color-arena-blue)" }}
                        >
                          Zeitraum festlegen &amp; starten
                        </button>
                      )}
                    </div>
                  ) : null}

                  {/* Gewinner-Info (nur nach Ziehung) */}
                  {g.status !== "anmeldung" && g.gewinnerName && (
                    <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
                      <p className="font-bold text-base mb-1">🎉 Ziehung abgeschlossen!</p>
                      <p className="font-semibold">Gewinner: {g.gewinnerName}</p>
                      {g.format === "ebook" ? (
                        g.gewinnerEmail && <p className="mt-0.5">E-Book per E-Mail senden an: <strong>{g.gewinnerEmail}</strong></p>
                      ) : (
                        <>
                          {g.gewinnerAdresse && <p className="mt-0.5">Versandadresse: {g.gewinnerAdresse}</p>}
                          {g.gewinnerEmail && <p className="mt-0.5">E-Mail: {g.gewinnerEmail}</p>}
                        </>
                      )}
                      <p className="text-xs opacity-70 mt-1">Du hast auch eine Bestätigungs-E-Mail erhalten.</p>
                    </div>
                  )}

                  {/* Ziehung starten (immer möglich bei anmeldung/verlost – Autor entscheidet selbst) */}
                  {(g.status === "anmeldung" || g.status === "verlost") && (
                    <a
                      href={`/gewinnspiel/${g._id}/ziehung`}
                      className="mt-2 inline-block px-3 py-1.5 text-sm rounded font-medium"
                      style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)", border: "1px solid var(--color-arena-blue)" }}
                    >
                      {g.status === "verlost" ? "Ziehung wiederholen" : "Ziehung starten"}
                    </a>
                  )}

                  {/* Versand-Button */}
                  {g.status === "verlost" && (
                    <button
                      onClick={() => markVersendet(g._id)}
                      className="mt-2 px-3 py-1.5 text-sm rounded font-medium"
                      style={{ background: "var(--color-arena-blue)", color: "white" }}
                    >
                      ✓ Versand abgeschlossen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
