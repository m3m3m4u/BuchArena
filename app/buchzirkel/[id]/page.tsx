"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredAccount } from "@/lib/client-account";

type Leseabschnitt = { id: string; titel: string; deadline: string };
type Topic = { id: string; titel: string; typ: string };

type Zirkel = {
  _id: string;
  typ: "testleser" | "betaleser";
  titel: string;
  beschreibung: string;
  coverImageUrl?: string;
  genre: string;
  status: string;
  veranstalterUsername: string;
  bewerbungBis: string;
  maxTeilnehmer: number;
  bewerbungsFragen: string[];
  genreFilter: string[];
  agbPflicht: boolean;
  agbText: string;
  leseabschnitte: Leseabschnitt[];
  diskussionsTopics: Topic[];
  fragebogen: { id: string; frage: string }[];
  isVeranstalter: boolean;
  isTeilnehmer: boolean;
  isBeworben: boolean;
};

export default function BuchzirkelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [zirkel, setZirkel] = useState<Zirkel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const account = getStoredAccount();

  // Bewerbungs-State
  const [antworten, setAntworten] = useState<string[]>([]);
  const [agbAkzeptiert, setAgbAkzeptiert] = useState(false);
  const [showAgb, setShowAgb] = useState(false);
  const [bewerbungSending, setBewerbungSending] = useState(false);
  const [bewerbungGestellt, setBewerbungGestellt] = useState(false);
  const [bewerbungError, setBewerbungError] = useState("");

  useEffect(() => {
    fetch(`/api/buchzirkel/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setZirkel(d.zirkel);
        setAntworten(new Array(d.zirkel?.bewerbungsFragen?.length ?? 0).fill(""));
      })
      .catch(() => setError("Buchzirkel konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleBewerben(e: React.FormEvent) {
    e.preventDefault();
    if (!zirkel?.agbPflicht || agbAkzeptiert) {
      setBewerbungSending(true);
      setBewerbungError("");
      try {
        const res = await fetch(`/api/buchzirkel/${params.id}/bewerben`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            antworten: antworten.map((a, i) => ({ frageIndex: i, antwort: a })),
            agbAkzeptiert,
          }),
        });
        const data = await res.json() as { message?: string };
        if (!res.ok) { setBewerbungError(data.message ?? "Fehler."); return; }
        setBewerbungGestellt(true);
      } catch {
        setBewerbungError("Unbekannter Fehler.");
      } finally {
        setBewerbungSending(false);
      }
    }
  }

  if (loading) return <main className="top-centered-main"><p className="text-arena-muted text-center py-8">Wird geladen…</p></main>;
  if (error || !zirkel) return <main className="top-centered-main"><p className="text-red-600 text-center py-8">{error || "Nicht gefunden."}</p></main>;

  const isBeta = zirkel.typ === "betaleser";
  const bewerbungOffen = zirkel.status === "bewerbung" && new Date(zirkel.bewerbungBis) > new Date();
  const kannBewerben = bewerbungOffen && account && !zirkel.isVeranstalter && !zirkel.isTeilnehmer && !zirkel.isBeworben;

  return (
    <main className="top-centered-main">
      {/* Header-Karte */}
      <section className="card">
        <div className="flex gap-5 flex-wrap">
          {zirkel.coverImageUrl && (
            <img src={zirkel.coverImageUrl} alt={zirkel.titel} className="w-24 h-36 object-cover rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBeta ? "bg-red-100 text-red-700" : "bg-blue-100 text-arena-blue"}`}>
                {isBeta ? "🔒 Betaleser-Zirkel" : "📖 Testleser-Zirkel"}
              </span>
              {zirkel.genre && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-arena-muted">{zirkel.genre}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                zirkel.status === "bewerbung" ? "bg-green-100 text-green-700" :
                zirkel.status === "aktiv" ? "bg-yellow-100 text-yellow-700" :
                zirkel.status === "abgeschlossen" ? "bg-gray-100 text-gray-600" : "bg-gray-100"
              }`}>
                {zirkel.status === "entwurf" ? "Entwurf" :
                 zirkel.status === "bewerbung" ? "Bewerbungen offen" :
                 zirkel.status === "aktiv" ? "Laufend" :
                 zirkel.status === "abgeschlossen" ? "Abgeschlossen" : zirkel.status}
              </span>
            </div>
            <h1 className="text-xl font-bold m-0">{zirkel.titel}</h1>
            <p className="text-arena-muted text-sm m-0">
              von <Link href={`/autor/${zirkel.veranstalterUsername}`} className="hover:underline">{zirkel.veranstalterUsername}</Link>
            </p>
            {zirkel.beschreibung && <p className="text-sm m-0 mt-2">{zirkel.beschreibung}</p>}

            <div className="flex gap-4 mt-3 text-sm text-arena-muted flex-wrap">
              <span>👥 max. {zirkel.maxTeilnehmer} Teilnehmer</span>
              <span>📅 Frist: {new Date(zirkel.bewerbungBis).toLocaleDateString("de-AT")}</span>
              {zirkel.leseabschnitte.length > 0 && <span>📖 {zirkel.leseabschnitte.length} Leseabschnitte</span>}
            </div>

            {/* Veranstalter-Links */}
            {zirkel.isVeranstalter && (
              <div className="flex gap-2 mt-3">
                <Link href={`/buchzirkel/${zirkel._id}/dashboard`} className="btn btn-primary btn-sm">
                  Dashboard öffnen →
                </Link>
              </div>
            )}

            {/* Teilnehmer-Link */}
            {zirkel.isTeilnehmer && (
              <div className="mt-3">
                <Link href={`/buchzirkel/${zirkel._id}/teilnehmer`} className="btn btn-primary btn-sm">
                  Zum Lesebereich →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Leseabschnitte */}
      {zirkel.leseabschnitte.length > 0 && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-3">📖 Zeitplan</h2>
          <div className="flex flex-col gap-2">
            {zirkel.leseabschnitte.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-50 border border-arena-border-light">
                <span className="font-medium text-sm">{i + 1}. {a.titel}</span>
                <span className="text-xs text-arena-muted">📅 {new Date(a.deadline).toLocaleDateString("de-AT")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Diskussions-Topics (nur Vorschau) */}
      {zirkel.diskussionsTopics.length > 0 && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-3">💬 Diskussionsbereiche</h2>
          <div className="flex flex-wrap gap-2">
            {zirkel.diskussionsTopics.map((t) => (
              <span key={t.id} className="text-sm px-3 py-1 rounded-full bg-gray-100 text-arena-muted">{t.titel}</span>
            ))}
          </div>
          {!zirkel.isTeilnehmer && !zirkel.isVeranstalter && (
            <p className="text-xs text-arena-muted mt-2">Nur für Teilnehmer sichtbar.</p>
          )}
        </section>
      )}

      {/* Bereits beworben */}
      {zirkel.isBeworben && !zirkel.isTeilnehmer && (
        <section className="card mt-3">
          <div className="rounded-xl bg-yellow-50 border-2 border-yellow-300 p-5 text-center">
            <p className="text-2xl m-0">⏳</p>
            <p className="font-semibold text-yellow-800 m-0 mt-1">Bewerbung eingereicht</p>
            <p className="text-sm text-yellow-700 m-0 mt-1">Du hast dich bereits beworben. Du erhältst eine E-Mail, sobald der Autor eine Entscheidung trifft.</p>
          </div>
        </section>
      )}

      {/* Bewerbungsbereich */}
      {kannBewerben && (
        <section className="card mt-3">
          <h2 className="text-base font-semibold m-0 mb-3">✍️ Bewerbung einreichen</h2>

          {isBeta && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-3 text-sm text-red-800">
              <strong>🔒 Vertraulich:</strong> Dieser Betaleser-Zirkel erfordert eine Verschwiegenheitserklärung.
              Alle Dateien werden mit einem persönlichen Wasserzeichen versehen.
            </div>
          )}

          {bewerbungGestellt ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
              ✅ Deine Bewerbung wurde eingereicht! Du erhältst eine E-Mail, sobald der Autor eine Entscheidung trifft.
            </div>
          ) : (
            <form onSubmit={handleBewerben} className="flex flex-col gap-3">
              {zirkel.bewerbungsFragen.map((frage, i) => (
                <div key={i}>
                  <label className="label">{frage}</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={antworten[i] ?? ""}
                    onChange={(e) => setAntworten((prev) => prev.map((a, j) => j === i ? e.target.value : a))}
                    required
                  />
                </div>
              ))}

              {zirkel.agbPflicht && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAgb((v) => !v)}
                    className="text-arena-blue text-sm hover:underline"
                  >
                    {showAgb ? "▲" : "▼"} Verschwiegenheitserklärung anzeigen
                  </button>
                  {showAgb && (
                    <pre className="mt-2 text-xs bg-gray-50 border border-arena-border rounded-lg p-3 whitespace-pre-wrap font-sans text-arena-text">
                      {zirkel.agbText}
                    </pre>
                  )}
                  <label className="flex items-start gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agbAkzeptiert}
                      onChange={(e) => setAgbAkzeptiert(e.target.checked)}
                      required
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      Ich habe die Verschwiegenheitserklärung gelesen und akzeptiere sie.
                      Mir ist bewusst, dass alle Dateien mit meinem persönlichen Wasserzeichen versehen sind.
                    </span>
                  </label>
                </div>
              )}

              {bewerbungError && <p className="text-red-600 text-sm">{bewerbungError}</p>}

              {!account && (
                <p className="text-sm text-arena-muted">
                  <Link href="/auth" className="text-arena-blue hover:underline">Melde dich an</Link>, um dich zu bewerben.
                </p>
              )}

              <button
                type="submit"
                disabled={bewerbungSending || (zirkel.agbPflicht && !agbAkzeptiert)}
                className="btn btn-primary w-full"
              >
                {bewerbungSending ? "Wird gesendet…" : "Bewerbung einreichen"}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Nicht eingeloggt */}
      {!account && bewerbungOffen && (
        <section className="card mt-3 text-center py-6">
          <p className="text-arena-muted m-0">
            <Link href="/auth" className="text-arena-blue hover:underline font-semibold">Anmelden</Link>, um dich für diesen Buchzirkel zu bewerben.
          </p>
        </section>
      )}
    </main>
  );
}
