"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";

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
  createdAt: string;
  isBeworben?: boolean;
  isTeilnehmer?: boolean;
};

export default function BuchzirkelPage() {
  const [zirkel, setZirkel] = useState<Zirkel[]>([]);
  const [meine, setMeine] = useState<Zirkel[]>([]);
  const [loading, setLoading] = useState(true);
  const [typFilter, setTypFilter] = useState<"" | "testleser" | "betaleser">("");
  const [account, setAccount] = useState<ReturnType<typeof getStoredAccount>>(null);

  useEffect(() => {
    setAccount(getStoredAccount());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ status: "aktiv" });
    if (typFilter) params.set("typ", typFilter);
    fetch(`/api/buchzirkel/list?${params}`)
      .then((r) => r.json())
      .then((d) => setZirkel(d.zirkel ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typFilter]);

  useEffect(() => {
    const stored = getStoredAccount();
    if (!stored) return;
    // Abgeschlossene Zirkel laden, an denen der User als Veranstalter oder Teilnehmer beteiligt war
    const params = new URLSearchParams({ status: "abgeschlossen", limit: "50" });
    fetch(`/api/buchzirkel/list?${params}`)
      .then((r) => r.json())
      .then((d: { zirkel?: Zirkel[] }) => {
        const list = (d.zirkel ?? []).filter(
          (z) => z.veranstalterUsername === stored.username || z.isTeilnehmer
        );
        setMeine(list);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="top-centered-main">
      {/* Beta-Hinweis */}
      <div className="rounded-lg bg-arena-yellow/15 border border-arena-yellow px-4 py-3 text-sm text-arena-blue font-medium mb-3">
        Dieses Tool wird aktuell noch getestet! Du kannst es gerne schon verwenden und uns rückmelden, was wir noch verbessern sollten!
      </div>

      {/* Header */}
      <section className="card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold m-0 flex items-center gap-2">Buchzirkel</h1>
            <p className="text-arena-muted text-sm m-0 mt-1">
              (Test)Leser- und Betaleser-Runden – direkt von Autoren und Verlagen
            </p>
          </div>
          {account && (
            <Link href="/buchzirkel/erstellen" className="btn btn-primary">
              + Buchzirkel erstellen
            </Link>
          )}
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="card mt-3">
        <h2 className="text-base font-semibold m-0 mb-3">So funktioniert ein Buchzirkel</h2>
        <ol className="flex flex-col gap-2 text-sm text-arena-text pl-0 list-none m-0">
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold">1</span><span><strong>Autor erstellt einen Zirkel</strong> – mit Beschreibung, Bewerbungsfrist und optionalen Fragen an Interessenten.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold">2</span><span><strong>Leser bewerben sich</strong> – innerhalb der Bewerbungsfrist können registrierte Mitglieder eine Bewerbung einreichen.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold">3</span><span><strong>Autor wählt Teilnehmer aus</strong> – angenommene Teilnehmer erhalten Zugang zum Lesebereich mit Manuskript/Buch und Diskussion.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold">4</span><span><strong>Gemeinsames Lesen</strong> – Teilnehmer lesen nach Zeitplan, diskutieren in Themen-Bereichen und geben Feedback.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold">5</span><span><strong>Rezensionen</strong> – nach dem Lesen tragen (Test)Leser ihre Rezensionslinks ein (Amazon, Goodreads, …).</span></li>
        </ol>
      </section>

      {/* Filter */}
      <section className="card mt-3">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTypFilter("")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typFilter === "" ? "bg-arena-blue text-white border-arena-blue" : "border-arena-border text-arena-text hover:border-arena-blue"
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setTypFilter("testleser")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typFilter === "testleser" ? "bg-arena-blue text-white border-arena-blue" : "border-arena-border text-arena-text hover:border-arena-blue"
            }`}
          >
            Buchzirkel
          </button>
          <button
            type="button"
            onClick={() => setTypFilter("betaleser")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typFilter === "betaleser" ? "bg-arena-blue text-white border-arena-blue" : "border-arena-border text-arena-text hover:border-arena-blue"
            }`}
          >
            Buchzirkel (Beta)
          </button>
        </div>
      </section>

      {/* Erklär-Karten */}
      <section className="card mt-3 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-arena-muted m-0">Zirkel-Typen</p>
        <div className="flex gap-3 items-start">
          <div>
            <p className="font-semibold m-0 text-arena-blue text-sm">Buchzirkel</p>
            <p className="text-sm text-arena-muted m-0">
              Rezensionsexemplare für bereits veröffentlichte Bücher – Feedback und Bewertungen auf Amazon, Goodreads & Co.
            </p>
          </div>
        </div>
        <hr className="border-arena-border-light m-0" />
        <div className="flex gap-3 items-start">
          <div>
            <p className="font-semibold m-0 text-red-800 text-sm">Buchzirkel (Beta)</p>
            <p className="text-sm text-arena-muted m-0">
              Unveröffentlichte Manuskripte – streng vertraulich. Alle Teilnehmer bestätigen eine Verschwiegenheitserklärung.
            </p>
          </div>
        </div>
      </section>

      {/* Liste */}
      {loading ? (
        <p className="text-arena-muted text-center py-8">Wird geladen…</p>
      ) : zirkel.length === 0 ? (
        <section className="card mt-3 text-center py-8">
          <p className="text-arena-muted m-0">Aktuell keine offenen Buchzirkel.</p>
          {account && (
            <p className="text-sm m-0 mt-2">
              <Link href="/buchzirkel/erstellen" className="text-arena-blue hover:underline">
                Erstelle den ersten →
              </Link>
            </p>
          )}
        </section>
      ) : (
        <section className="w-full grid grid-cols-2 gap-4 mt-3 max-sm:grid-cols-1">
          {zirkel.map((z) => (
            <ZirkelKarte key={z._id} zirkel={z} />
          ))}
        </section>
      )}

      {/* Meine abgeschlossenen Zirkel */}
      {account && meine.length > 0 && (
        <section className="card mt-6">
          <h2 className="text-base font-semibold mb-3">Meine abgeschlossenen Zirkel</h2>
          <div className="w-full grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            {meine.map((z) => (
              <ZirkelKarte key={z._id} zirkel={z} deletable={z.veranstalterUsername === account.username} onDelete={() => setMeine((prev) => prev.filter((m) => m._id !== z._id))} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ZirkelKarte({ zirkel, deletable, onDelete }: { zirkel: Zirkel; deletable?: boolean; onDelete?: () => void }) {
  const isBeta = zirkel.typ === "betaleser";
  const frist = new Date(zirkel.bewerbungBis);
  const expired = frist < new Date();
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/buchzirkel/${zirkel._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen.");
      if (onDelete) onDelete();
      setShowDelete(false);
    } catch {
      setDeleteError("Fehler beim Löschen.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative group">
      <Link
        href={`/buchzirkel/${zirkel._id}`}
        className="no-underline text-inherit flex gap-4 rounded-xl border border-arena-border bg-white p-4 hover:border-arena-blue transition-colors"
      >
        {/* Cover */}
        <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-arena-border-light flex items-center justify-center">
          {zirkel.coverImageUrl ? (
            <img src={zirkel.coverImageUrl} alt={zirkel.titel} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">📚</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBeta ? "bg-red-100 text-red-700" : "bg-[#1a1a2e]/10 text-arena-blue"}`}>
              {isBeta ? "Buchzirkel (Beta)" : "Buchzirkel"}
            </span>
            {zirkel.genre && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-arena-muted">
                {zirkel.genre}
              </span>
            )}
            {zirkel.isTeilnehmer && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Teilnehmer</span>
            )}
            {!zirkel.isTeilnehmer && zirkel.isBeworben && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-yellow text-arena-blue">⏳ Beworben</span>
            )}
          </div>

          <h2 className="text-base font-bold m-0 mt-1 truncate">{zirkel.titel}</h2>
          <p className="text-xs text-arena-muted m-0">von {zirkel.veranstalterUsername}</p>
          <p className="text-sm text-arena-muted m-0 mt-1 line-clamp-2">{zirkel.beschreibung}</p>

          <div className="flex items-center gap-3 mt-2 text-xs text-arena-muted">
            <span>max. {zirkel.maxTeilnehmer} Teilnehmer</span>
            {expired ? (
              <span className="text-red-600 font-medium">Bewerbung beendet</span>
            ) : (
              <span>Frist: {frist.toLocaleDateString("de-AT")}</span>
            )}
          </div>
        </div>
        {deletable && (
          <button
            type="button"
            className="absolute top-2 right-2 z-10 btn btn-danger btn-xs opacity-80 group-hover:opacity-100"
            onClick={e => { e.preventDefault(); setShowDelete(true); }}
            disabled={deleting}
            title="Zirkel löschen"
          >
            {deleting ? "…" : "Löschen"}
          </button>
        )}
      </Link>
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Zirkel wirklich löschen?</h3>
            <p className="text-sm text-arena-muted mb-4">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            {deleteError && <p className="text-red-600 text-sm mb-2">{deleteError}</p>}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-danger flex-1"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Lösche …" : "Ja, löschen"}
              </button>
              <button
                type="button"
                className="btn flex-1"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
