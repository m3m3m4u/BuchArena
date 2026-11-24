"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAccount } from "@/lib/client-account";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { ProgressiveImg } from "@/app/components/progressive-image";

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

function isFristAbgelaufen(bewerbungBis: string): boolean {
  const fristEnd = new Date(bewerbungBis);
  if (Number.isNaN(fristEnd.getTime())) return false;
  if (
    fristEnd.getUTCHours() === 0 &&
    fristEnd.getUTCMinutes() === 0 &&
    fristEnd.getUTCSeconds() === 0 &&
    fristEnd.getUTCMilliseconds() === 0
  ) {
    fristEnd.setHours(23, 59, 59, 999);
  }
  return fristEnd < new Date();
}

export default function BuchzirkelPage() {
  const [zirkel, setZirkel] = useState<Zirkel[]>([]);
  const [meine, setMeine] = useState<Zirkel[]>([]);
  const [meineAktive, setMeineAktive] = useState<Zirkel[]>([]);
  const [meineTeilnahmen, setMeineTeilnahmen] = useState<Zirkel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [typFilter, setTypFilter] = useState<"" | "testleser" | "betaleser">("");
  const [account, setAccount] = useState<ReturnType<typeof getStoredAccount>>(null);
  const [bewerbungsStatusFilter, setBewerbungsStatusFilter] = useState<string>("");

  const hasActiveFilter = typFilter !== "" || bewerbungsStatusFilter !== "";

  function resetFilters() {
    setTypFilter("");
    setBewerbungsStatusFilter("");
  }

  useEffect(() => {
    setAccount(getStoredAccount());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ status: "aktiv", limit: "0" });
    fetch(`/api/buchzirkel/list?${params}`)
      .then((r) => { if (!r.ok) throw new Error("Buchzirkel konnten nicht geladen werden."); return r.json(); })
      .then((d: { zirkel?: Zirkel[] }) => setZirkel(d.zirkel ?? []))
      .catch(() => setLoadError("Die Buchzirkel konnten nicht geladen werden. Bitte versuche es erneut."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const stored = getStoredAccount();
    if (!stored) return;
    Promise.all([
      fetch("/api/buchzirkel/list?meine=1&limit=0").then((r) => r.json()).catch(() => ({})),
      fetch("/api/buchzirkel/list?teilnehmer=1&limit=0").then((r) => r.json()).catch(() => ({})),
      fetch("/api/buchzirkel/list?status=abgeschlossen&limit=0").then((r) => r.json()).catch(() => ({})),
    ]).then(([meineRes, teilnehmerRes, abgeschlossenRes]: [
      { zirkel?: Zirkel[] },
      { zirkel?: Zirkel[] },
      { zirkel?: Zirkel[] },
    ]) => {
      const eigeneList = meineRes.zirkel ?? [];
      const teilnahmeList = teilnehmerRes.zirkel ?? [];
      const abgeschlossenPublic = (abgeschlossenRes.zirkel ?? []).filter(
        (z) => z.veranstalterUsername === stored.username || z.isTeilnehmer
      );

      setMeineAktive(
        eigeneList.filter((z) => z.status !== "abgeschlossen" && z.status !== "archiviert")
      );
      setMeineTeilnahmen(
        teilnahmeList.filter((z) => z.status !== "abgeschlossen" && z.status !== "archiviert")
      );

      const abgeschlossenMap = new Map<string, Zirkel>();
      for (const z of [...eigeneList, ...teilnahmeList, ...abgeschlossenPublic]) {
        if (z.status === "abgeschlossen" && !abgeschlossenMap.has(z._id)) {
          abgeschlossenMap.set(z._id, z);
        }
      }
      const abgeschlossenSorted = Array.from(abgeschlossenMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMeine(abgeschlossenSorted);
    });
  }, []);

  const filteredZirkel = zirkel
    .filter((z) => {
      if (typFilter && z.typ !== typFilter) return false;
      const bewerbungOffen = z.status === "bewerbung" && !isFristAbgelaufen(z.bewerbungBis);
      if (bewerbungsStatusFilter === "offen") return bewerbungOffen;
      if (bewerbungsStatusFilter === "beendet") return !bewerbungOffen;
      return true;
    })
    .sort((a, b) => {
      const aOffen = a.status === "bewerbung" && !isFristAbgelaufen(a.bewerbungBis);
      const bOffen = b.status === "bewerbung" && !isFristAbgelaufen(b.bewerbungBis);
      if (aOffen !== bOffen) return aOffen ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sichtbareTeilnahmen = meineTeilnahmen.filter(
    (z) => !meineAktive.some((m) => m._id === z._id)
  );

  return (
    <main className="top-centered-main">

      {/* Header */}
      <section className="card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-sans text-3xl font-extrabold text-arena-blue max-sm:text-2xl tracking-tight m-0">Buchzirkel</h1>
            <p className="font-sans text-arena-muted text-sm mt-1.5">
              (Test)Leser- und Betaleser-Runden – direkt von Autoren und Verlagen
            </p>
          </div>
          {account && (
            <Link href="/buchzirkel/erstellen" className="btn btn-primary font-sans">
              + Buchzirkel erstellen
            </Link>
          )}
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="card mt-3">
        <h2 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0 mb-3">So funktioniert ein Buchzirkel</h2>
        <ol className="flex flex-col gap-2 text-sm text-arena-text pl-0 list-none m-0 font-sans">
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold font-sans">1</span><span><strong>Autor erstellt einen Zirkel</strong> – mit Beschreibung, Bewerbungsfrist und optionalen Fragen an Interessenten.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold font-sans">2</span><span><strong>Leser bewerben sich</strong> – innerhalb der Bewerbungsfrist können registrierte Mitglieder eine Bewerbung einreichen.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold font-sans">3</span><span><strong>Autor wählt Teilnehmer aus</strong> – angenommene Teilnehmer erhalten Zugang zum Lesebereich mit Manuskript/Buch und Diskussion.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold font-sans">4</span><span><strong>Gemeinsames Lesen</strong> – Teilnehmer lesen nach Zeitplan, diskutieren in Themen-Bereichen und geben Feedback.</span></li>
          <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-arena-blue text-white text-xs flex items-center justify-center font-bold font-sans">5</span><span><strong>Rezensionen</strong> – nach dem Lesen tragen (Test)Leser ihre Rezensionslinks ein (Amazon, Goodreads, …).</span></li>
        </ol>
      </section>

      {/* Erklär-Karten */}
      <section className="card mt-3 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-arena-muted m-0">Zirkel-Typen</p>
        <div className="flex gap-3 items-start">
          <div>
            <p className="font-semibold m-0 text-arena-blue text-sm">Buchzirkel</p>
            <p className="text-sm text-arena-muted m-0">
              Rezensionsexemplare für bereits veröffentlichte Bücher – Feedback und Bewertungen auf Amazon, Goodreads &amp; Co.
            </p>
          </div>
        </div>
        <hr className="border-arena-border-light m-0" />
        <div className="flex gap-3 items-start">
          <div>
            <p className="font-semibold m-0 text-arena-blue text-sm">Buchzirkel (Beta)</p>
            <p className="text-sm text-arena-muted m-0">
              Unveröffentlichte Manuskripte – streng vertraulich. Alle Teilnehmer bestätigen eine Verschwiegenheitserklärung.
            </p>
          </div>
        </div>
      </section>

      {/* Meine eigenen Zirkel (Veranstalter) + aktive Teilnahmen */}
      {account && (meineAktive.length > 0 || sichtbareTeilnahmen.length > 0) && (
        <section className="card mt-3">
          <h2 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0 mb-3">Meine Buchzirkel</h2>
          {meineAktive.length > 0 && (
            <>
              {sichtbareTeilnahmen.length > 0 && (
                <p className="font-sans text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">Als Veranstalter</p>
              )}
              <div className="w-full grid grid-cols-1 gap-2">
                {meineAktive.map((z) => (
                  <ZirkelKarte
                    key={z._id}
                    zirkel={z}
                    deletable={z.veranstalterUsername === account.username}
                    onDelete={() => {
                      setMeineAktive((prev) => prev.filter((m) => m._id !== z._id));
                      setZirkel((prev) => prev.filter((m) => m._id !== z._id));
                    }}
                    showStatus
                  />
                ))}
              </div>
            </>
          )}
          {sichtbareTeilnahmen.length > 0 && (
            <>
              {meineAktive.length > 0 && <hr className="border-arena-border-light my-3" />}
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">Als Teilnehmer</p>
              <div className="w-full grid grid-cols-1 gap-2">
                {sichtbareTeilnahmen.map((z) => (
                  <ZirkelKarte key={z._id} zirkel={z} showStatus />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Filter */}
      <section className="card mt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-arena-muted m-0">
            Buchzirkel filtern {!loading && `(${filteredZirkel.length})`}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-sans text-xs font-semibold text-arena-blue hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap mb-2">
          {([
            { value: "", label: "Alle Typen" },
            { value: "testleser", label: "Buchzirkel" },
            { value: "betaleser", label: "Buchzirkel (Beta)" },
          ] as const).map((opt) => (
            <button
              key={opt.value || "alle-typen"}
              type="button"
              aria-pressed={typFilter === opt.value}
              onClick={() => setTypFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors font-sans cursor-pointer ${
                typFilter === opt.value
                  ? "bg-arena-blue text-white border-arena-blue"
                  : "border-arena-border text-arena-text hover:border-arena-blue"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap font-sans">
          {[
            { value: "", label: "Alle Status", activeClass: "bg-arena-blue text-white border-arena-blue", hoverClass: "hover:border-arena-blue" },
            { value: "offen", label: "Bewerbung möglich", activeClass: "bg-arena-blue text-white border-arena-blue", hoverClass: "hover:border-arena-blue" },
            { value: "beendet", label: "Läuft schon / Bewerbung beendet", activeClass: "bg-arena-blue text-white border-arena-blue", hoverClass: "hover:border-arena-blue" },
          ].map((opt) => (
            <button
              key={opt.value || "alle-status"}
              type="button"
              aria-pressed={bewerbungsStatusFilter === opt.value}
              onClick={() => setBewerbungsStatusFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors font-sans cursor-pointer ${
                bewerbungsStatusFilter === opt.value
                  ? opt.activeClass
                  : `border-arena-border text-arena-text ${opt.hoverClass}`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Liste */}
      {loading ? (
        <p className="font-sans text-arena-muted text-center py-8">Wird geladen…</p>
      ) : loadError ? (
        <section role="alert" className="card mt-3">
          <p className="text-sm text-arena-danger">{loadError}</p>
          <button className="btn" onClick={() => window.location.reload()}>Erneut laden</button>
        </section>
      ) : filteredZirkel.length === 0 ? (
        <section className="card mt-3 text-center py-8">
          <p className="font-sans text-arena-muted m-0">
            {hasActiveFilter
              ? "Keine Buchzirkel für die ausgewählten Filter gefunden."
              : "Aktuell keine offenen Buchzirkel."}
          </p>
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary btn-sm font-sans mt-3"
            >
              Filter zurücksetzen
            </button>
          ) : account ? (
            <p className="font-sans text-sm m-0 mt-2">
              <Link href="/buchzirkel/erstellen" className="font-sans text-arena-blue hover:underline">
                Erstelle den ersten →
              </Link>
            </p>
          ) : null}
        </section>
      ) : (
        <section className="w-full grid grid-cols-1 gap-2 mt-3">
          {filteredZirkel.map((z) => (
            <ZirkelKarte key={z._id} zirkel={z} />
          ))}
        </section>
      )}

      {/* Meine abgeschlossenen Zirkel */}
      {account && meine.length > 0 && (
        <section className="card mt-6">
          <h2 className="font-sans text-xl font-bold text-arena-blue tracking-tight m-0 mb-3">Meine abgeschlossenen Zirkel</h2>
          <div className="w-full grid grid-cols-1 gap-2">
            {meine.map((z) => (
              <ZirkelKarte
                key={z._id}
                zirkel={z}
                deletable={z.veranstalterUsername === account.username}
                onDelete={() => setMeine((prev) => prev.filter((m) => m._id !== z._id))}
                showStatus
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ZirkelKarte({ zirkel, deletable, onDelete, showStatus }: { zirkel: Zirkel; deletable?: boolean; onDelete?: () => void; showStatus?: boolean }) {
  const isBeta = zirkel.typ === "betaleser";
  const frist = new Date(zirkel.bewerbungBis);
  const expired = isFristAbgelaufen(zirkel.bewerbungBis);
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

  // Status-Badge für Bewerbungsstatus
  let statusBadge = null;
  const bewerbungOffen = zirkel.status === "bewerbung" && !expired;
  if (showStatus && zirkel.status === "entwurf") {
    statusBadge = <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-bg text-arena-muted">Entwurf</span>;
  } else if (showStatus && zirkel.status === "abgeschlossen") {
    statusBadge = <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-bg text-arena-muted">Abgeschlossen</span>;
  } else if (bewerbungOffen) {
    statusBadge = <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-blue/5 text-arena-blue">Bewerbung möglich</span>;
  } else {
    statusBadge = <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-bg text-arena-muted">Läuft schon</span>;
  }

  return (
    <div className="relative group">
      <Link
        href={`/buchzirkel/${zirkel._id}`}
        className="card-base p-3 no-underline text-inherit flex gap-3 hover:border-arena-blue transition-colors h-full overflow-hidden"
      >
        {/* Cover */}
        <div className="flex-shrink-0 w-[62px] h-[88px] rounded-lg overflow-hidden bg-arena-border-light flex items-center justify-center">
          {zirkel.coverImageUrl ? (
            <ProgressiveImg src={zirkel.coverImageUrl} alt={zirkel.titel} className="w-full h-full object-cover" />
          ) : (
            <BookOpenIcon className="h-8 w-8 text-arena-muted" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-1.5 flex-wrap">
            <span className="font-sans text-xs font-bold px-2 py-0.5 rounded-full bg-arena-bg text-arena-blue">
              {isBeta ? "Buchzirkel (Beta)" : "Buchzirkel"}
            </span>
            {zirkel.genre && (
              <span className="font-sans text-xs px-2 py-0.5 rounded-full bg-gray-100 text-arena-muted">
                {zirkel.genre}
              </span>
            )}
            {statusBadge}
            {zirkel.isTeilnehmer && (
              <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-blue/5 text-arena-blue">Teilnehmer</span>
            )}
            {!zirkel.isTeilnehmer && zirkel.isBeworben && (
              <span className="font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-arena-yellow text-arena-blue">Beworben</span>
            )}
          </div>

          <h2 className="font-sans text-base font-bold text-arena-blue m-0 mt-0.5 truncate">{zirkel.titel}</h2>
          <div className="font-sans flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-arena-muted m-0">
            <span>von {zirkel.veranstalterUsername}</span>
            <span aria-hidden>·</span>
            <span>max. {zirkel.maxTeilnehmer} Teilnehmer</span>
            <span aria-hidden>·</span>
            {expired ? (
              <span className="font-sans text-arena-muted font-semibold">Bewerbung beendet</span>
            ) : (
              <span>Frist: {frist.toLocaleDateString("de-AT")}</span>
            )}
          </div>
          <p className="font-sans text-sm text-arena-muted m-0 mt-1 line-clamp-1 flex-1">{zirkel.beschreibung}</p>

        </div>
        {deletable && (
          <button
            type="button"
            className="absolute top-2 right-2 z-10 btn btn-danger btn-xs opacity-80 group-hover:opacity-100 font-sans"
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
            <h3 className="font-sans text-lg font-bold text-arena-blue mb-2">Zirkel wirklich löschen?</h3>
            <p className="font-sans text-sm text-arena-muted mb-4">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            {deleteError && <p className="font-sans text-red-600 text-sm mb-2">{deleteError}</p>}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-danger flex-1 font-sans"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Lösche …" : "Ja, löschen"}
              </button>
              <button
                type="button"
                className="btn flex-1 font-sans"
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
