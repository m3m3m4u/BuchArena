"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

type GewinnspielDetail = {
  _id: string;
  buchTitel: string;
  buchId: string;
  autorName: string;
  autorUsername: string;
  coverImageUrl?: string;
  format: string;
  beschreibung?: string;
  anmeldungVon: string;
  anmeldungBis: string;
  ziehungAm: string;
  status: string;
  gewinnerName?: string;
  gewinnerUsername?: string;
  verlostAm?: string;
  teilnehmerAnzahl: number;
  hatTeilgenommen: boolean;
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

export default function GewinnspielDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [g, setG] = useState<GewinnspielDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [account, setAccount] = useState(getStoredAccount());
  const [showAdresseForm, setShowAdresseForm] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState("Deutschland");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sync = () => setAccount(getStoredAccount());
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
  }, []);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/gewinnspiele/${id}`);
    if (r.ok) setG(await r.json() as GewinnspielDetail);
    else setG(null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function teilnehmen() {
    if (!account) { router.push("/auth"); return; }

    const needsAdresse = g?.format === "print" || g?.format === "both";
    if (needsAdresse && !showAdresseForm) {
      setShowAdresseForm(true);
      return;
    }

    setSubmitting(true);
    setMsg(null);
    const r = await fetch(`/api/gewinnspiele/${id}/teilnehmen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gewinnspielId: id, adresse, ort, land }),
    });
    const d = await r.json() as { ok?: boolean; message?: string; needsProfile?: boolean };
    if (r.ok) {
      setMsg({ text: "Du nimmst jetzt teil! Viel Glück!", ok: true });
      setShowAdresseForm(false);
      await load();
    } else if (d.needsProfile) {
      setMsg({
        text: "Für die Teilnahme benötigst du ein Profil auf BuchArena.",
        ok: false,
      });
    } else {
      setMsg({ text: d.message ?? "Fehler", ok: false });
    }
    setSubmitting(false);
  }

  async function abmelden() {
    if (!confirm("Teilnahme zurückziehen?")) return;
    const r = await fetch(`/api/gewinnspiele/${id}/teilnehmen`, { method: "DELETE" });
    if (r.ok) { setMsg({ text: "Teilnahme zurückgezogen.", ok: true }); await load(); }
    else { const d = await r.json() as { message?: string }; setMsg({ text: d.message ?? "Fehler", ok: false }); }
  }

  if (loading) return <main className="site-shell py-10 text-center text-sm opacity-60">Lade…</main>;
  if (!g) return <main className="site-shell py-10"><p className="text-sm">Gewinnspiel nicht gefunden.</p><Link href="/gewinnspiel" className="underline text-sm mt-2 block">← Zurück</Link></main>;

  const now = new Date();
  const anmeldungLaeuft = g.status === "anmeldung" && now >= new Date(g.anmeldungVon) && now <= new Date(g.anmeldungBis);
  const needsAdresse = g.format === "print" || g.format === "both";

  return (
    <main className="site-shell py-8">
      <Link href="/gewinnspiel" className="text-sm opacity-60 hover:opacity-100 mb-4 inline-block">← Alle Gewinnspiele</Link>

      <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--color-arena-border)" }}>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="flex gap-4 items-start">
              {g.coverImageUrl && (
                <img src={g.coverImageUrl} alt={g.buchTitel} className="w-24 rounded shadow-md flex-shrink-0 object-cover" style={{ aspectRatio: "2/3" }} />
              )}
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--color-arena-blue)" }}>{g.buchTitel}</h1>
                <p className="text-sm opacity-70">von <Link href={`/autor/${g.autorUsername}`} className="underline">{g.autorName}</Link></p>
              </div>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
              g.status === "anmeldung" ? "bg-green-100 text-green-800" :
              g.status === "verlost" ? "bg-yellow-100 text-yellow-800" :
              "bg-gray-100 text-gray-600"
            }`}>
              {g.status === "anmeldung" ? "Anmeldung läuft" :
               g.status === "verlost" ? "Gewinner gezogen" :
               g.status === "versendet" ? "Versendet" : "Archiv"}
            </span>
          </div>

          {/* Details */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
            <dt className="opacity-60">Format</dt>
            <dd className="font-medium">{FORMAT_LABEL[g.format]}</dd>
            <dt className="opacity-60">Anmeldung bis</dt>
            <dd>{fmtDt(g.anmeldungBis)}</dd>
            <dt className="opacity-60">Teilnehmer</dt>
            <dd>{g.teilnehmerAnzahl}</dd>
          </dl>

          {g.beschreibung && (
            <p className="text-sm opacity-80 mb-4 p-3 rounded" style={{ background: "var(--color-arena-bg-secondary, #f9f9f9)" }}>
              {g.beschreibung}
            </p>
          )}

          {/* Gewinner-Banner */}
          {g.status !== "anmeldung" && g.gewinnerName && (() => {
            const ichHabGewonnen = account && g.gewinnerUsername === account.username;
            const ichHabTeilgenommen = g.hatTeilgenommen;
            if (ichHabGewonnen) {
              return (
                <div className="mb-4 p-4 rounded-lg text-center" style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
                  <p className="text-2xl font-bold mb-1">🎉 Du hast gewonnen!</p>
                  <p className="text-sm font-medium">Du hast das Buch <strong>{g.buchTitel}</strong> gewonnen.</p>
                  <p className="text-xs opacity-70 mt-1">Der Autor wird sich bei dir melden.</p>
                </div>
              );
            }
            if (ichHabTeilgenommen) {
              return (
                <div className="mb-4 p-4 rounded-lg text-center bg-gray-100 text-gray-700">
                  <p className="font-semibold">Leider hast du diesmal nicht gewonnen.</p>
                  <p className="text-xs opacity-70 mt-1">Gewonnen hat: {g.gewinnerName}</p>
                </div>
              );
            }
            return (
              <div className="mb-4 p-4 rounded-lg text-center font-bold text-lg"
                style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
                Gewinner: {g.gewinnerName}
              </div>
            );
          })()}

          {msg && (
            <div className={`mb-4 p-3 rounded text-sm ${msg.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {msg.text}
              {!msg.ok && msg.text.includes("Profil") && (
                <span className="ml-2">
                  Anlegen als:{" "}
                  <Link href="/testleser" className="underline">Testleser</Link>,{" "}
                  <Link href="/fuer-autoren" className="underline">Autor</Link>,{" "}
                  <Link href="/sprecher" className="underline">Sprecher</Link>,{" "}
                  <Link href="/blogger" className="underline">Blogger</Link>,{" "}
                  <Link href="/lektoren" className="underline">Lektor</Link>{" "}
                  oder{" "}
                  <Link href="/verlage" className="underline">Verlag</Link>
                </span>
              )}
              <button className="ml-3 text-xs underline" onClick={() => setMsg(null)}>✕</button>
            </div>
          )}

          {/* Adress-Formular (für Print) */}
          {showAdresseForm && (
            <div className="mb-4 p-4 border rounded-lg" style={{ borderColor: "var(--color-arena-border)" }}>
              <p className="text-sm font-medium mb-3">Bitte gib deine Versandadresse an (nur für den Gewinnfall):</p>
              <div className="flex flex-col gap-2">
                <input placeholder="Straße und Hausnummer *" value={adresse} onChange={(e) => setAdresse(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-arena-border)" }} />
                <input placeholder="Ort / PLZ *" value={ort} onChange={(e) => setOrt(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-arena-border)" }} />
                <input placeholder="Land" value={land} onChange={(e) => setLand(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-arena-border)" }} />
              </div>
            </div>
          )}

          {/* Hinweis für E-Book-Gewinnspiele */}
          {!needsAdresse && anmeldungLaeuft && !g.hatTeilgenommen && (
            <p className="text-xs opacity-60 mb-2 text-center">Im Gewinnfall wird das E-Book an deine hinterlegte E-Mail-Adresse gesendet.</p>
          )}

          {/* Teilnahme-Bereich */}
          {anmeldungLaeuft && !g.hatTeilgenommen && (
            <div className="flex flex-col items-center gap-2">
              <p className="w-full text-xs rounded-lg px-3 py-2 mb-1" style={{ background: "#eff6ff", color: "#1e40af" }}>
                ℹ️ Für die Teilnahme ist ein Profil auf BuchArena erforderlich (z.&nbsp;B. als <Link href="/testleser" className="underline font-medium">Testleser</Link>, <Link href="/fuer-autoren" className="underline font-medium">Autor</Link>, <Link href="/sprecher" className="underline font-medium">Sprecher</Link> u.&nbsp;v.&nbsp;m.). Für Versand und Verlosung ist der Autor verantwortlich – nicht BuchArena.
              </p>
              <button
                onClick={teilnehmen}
                disabled={submitting}
                className="w-full py-3 rounded-lg font-bold text-base transition-opacity disabled:opacity-50"
                style={{ background: "var(--color-arena-blue)", color: "white" }}
              >
                {submitting ? "Wird angemeldet…" : needsAdresse && !showAdresseForm ? "Jetzt teilnehmen" : "Anmeldung bestätigen 🍀"}
              </button>
              {!account && (
                <p className="text-xs opacity-60">
                  <Link href="/auth" className="underline">Anmelden</Link> oder <Link href="/auth?tab=register" className="underline">registrieren</Link>, um teilzunehmen.
                </p>
              )}
            </div>
          )}

          {anmeldungLaeuft && g.hatTeilgenommen && (
            <div className="text-center">
              <p className="text-sm text-green-700 font-medium mb-2">Du nimmst bereits teil.</p>
              <button onClick={abmelden} className="text-xs text-red-600 underline">Teilnahme zurückziehen</button>
            </div>
          )}

          {!anmeldungLaeuft && g.status === "anmeldung" && now < new Date(g.anmeldungVon) && (
            <p className="text-sm opacity-60 text-center">Die Anmeldephase beginnt am {fmtDt(g.anmeldungVon)}.</p>
          )}
          {!anmeldungLaeuft && g.status === "anmeldung" && now > new Date(g.anmeldungBis) && (
            <p className="text-sm opacity-60 text-center">Die Anmeldephase ist abgelaufen.</p>
          )}

          {/* Vorlagen für den Autor/Admin */}
          {account && (account.username === g.autorUsername || account.role === "ADMIN" || account.role === "SUPERADMIN") && (
            <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--color-arena-border)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-arena-blue)" }}>
                Reel für dein Gewinnspiel erstellen
              </p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { file: "gewinnebuch.png",  label: "Vorlage 1" },
                  { file: "gewinnebuch2.png", label: "Vorlage 2" },
                ].map(({ file, label }) => {
                  const href = `/social-media/beitrag-tool?format=9:16&bgImage=/gewinnspiel/${encodeURIComponent(file)}`;
                  return (
                    <div key={file} className="flex flex-col items-center gap-2">
                      <div className="relative w-24 rounded overflow-hidden shadow border" style={{ aspectRatio: "9/16", borderColor: "var(--color-arena-border)" }}>
                        <Image
                          src={`/gewinnspiel/${file}`}
                          alt={label}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                      <Link
                        href={href}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
                        style={{ background: "var(--color-arena-blue)", color: "white" }}
                      >
                        Reel erstellen →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
