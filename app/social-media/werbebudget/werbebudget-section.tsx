"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getAdBudgetCycle, type AdBudgetData } from "@/lib/werbebudget";

const statusLabels = { pending: "Prüfung ausstehend", approved: "Für die Ziehung freigegeben", rejected: "Teilnahmebedingungen nicht erfüllt" };

export default function WerbebudgetSection({ signedIn, admin = false }: { signedIn: boolean; admin?: boolean }) {
  const [data, setData] = useState<AdBudgetData | null>(null);
  const [month, setMonth] = useState("");
  const [bookId, setBookId] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/social-media/werbebudget${admin && month ? `?month=${month}` : ""}`, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fehler beim Laden.");
      if (!signal?.aborted) setData(result);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [admin, month]);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    load(controller.signal).catch((err) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Fehler beim Laden.");
    });
    return () => controller.abort();
  }, [load]);

  async function mutate(method: "POST" | "PUT" | "PATCH", body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/social-media/werbebudget", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fehler beim Speichern.");
      setMessage(success);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function apply(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    const saved = await mutate(editing ? "PUT" : "POST", { month: data.cycle.month, bookId, socialHandle, notes, conditionsAccepted: accepted }, "Deine Bewerbung ist gespeichert. Viel Glück bei der Ziehung!");
    if (saved) setEditing(false);
  }

  return (
    <div className="grid gap-5">
      {!admin && <>
        <p className="text-arena-muted leading-relaxed m-0">
          Jeden Monat gewinnt ein Autor oder eine Autorin <strong className="text-arena-blue">100 € Werbebudget</strong>.
          Die BuchArena bewirbt damit ein Reel zu deinem Buch – mit einer Verlinkung zu deinem Buch in der BuchArena.
          Das Budget wird von der BuchArena für Werbung eingesetzt; es gibt keine Barauszahlung.
        </p>
        <div className="card-info grid gap-3">
          <h2 className="text-lg font-bold text-arena-blue m-0">So bist du dabei</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm m-0">
            <li>Kommentiere im jeweiligen Teilnahmezeitraum mindestens <strong>10-mal sinnvoll bei der BuchArena auf Social Media</strong>.</li>
            <li>Teile im selben Zeitraum mindestens <strong>3-mal Inhalte der BuchArena in deiner Story</strong>.</li>
            <li>Bewirb dich hier mit einem deiner Bücher aus der BuchArena. Pro Person und Monat ist eine Bewerbung möglich.</li>
          </ul>
          <p className="text-sm text-arena-muted m-0"><strong>Die Dezember-Runde beginnt schon jetzt, am 24. November 2026.</strong> Du kannst dich ab sofort bewerben. Auch deine Kommentare und Story-Teilungen ab diesem Tag zählen bereits für Dezember. Die Ziehung ist am 31. Dezember.</p>
          <p className="text-sm text-arena-muted m-0">Ab 1. Januar beginnt die Januar-Runde, danach jeweils am Monatsersten die nächste. Bewerbungen und Aktivitäten werden nicht übertragen: Bewirb dich jeden Monat neu.</p>
          <p className="text-sm text-arena-muted m-0">Erfülle die Voraussetzungen bis zur Ziehung und bewahre Nachweise deiner Storys auf. Die BuchArena prüft die Teilnahmebedingungen und lost unter allen freigegebenen Bewerbungen genau eine Person aus. Alle haben die gleiche Gewinnchance.</p>
        </div>
      </>}

      {error && <p role="alert" className="text-sm text-red-700 m-0">{error}</p>}
      {message && <p role="status" className="text-sm text-green-800 m-0">{message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {admin && data?.months && <label className="grid gap-1 text-sm font-semibold">Monatsrunde
          <select className="input-base" value={month || data.cycle.month} disabled={busy || loading} onChange={(e) => { setMonth(e.target.value); setMessage(""); }}>
            {data.months.map((value) => <option key={value} value={value}>{getAdBudgetCycle(value).label}</option>)}
          </select>
        </label>}
        <button type="button" className="btn btn-sm" disabled={busy || loading} onClick={() => {
          setError("");
          void load().catch((err) => setError(err instanceof Error ? err.message : "Fehler beim Laden."));
        }}>Neu laden</button>
      </div>
      {loading ? <p role="status" className="text-sm text-arena-muted">Monatsrunde wird geladen …</p> : data && <>
        <div className="rounded-xl border border-arena-yellow bg-arena-yellow/10 p-4 grid gap-2">
          <h2 className="text-xl font-bold text-arena-blue m-0">{data.cycle.label}</h2>
          <p className="text-sm m-0"><strong>Ziehung: {data.cycle.drawDate}</strong> · {data.closed ? "Bewerbungszeitraum beendet" : "Bewerbungen offen"}</p>
          <p className="text-sm text-arena-muted m-0"><strong>Aktivitäten zählen: {data.cycle.activityPeriod}.</strong> Danach startet am Monatsersten die nächste Bewerbungsrunde. Es gilt die Ortszeit Wien.</p>
        </div>

        {!admin && <>
          {data.myApplication && !editing ? <div className="card-base grid gap-2">
            <h3 className="font-bold text-arena-blue m-0">Deine Bewerbung für {data.cycle.label}</h3>
            <Link href={`/buch/${data.myApplication.bookId}`} className="text-arena-link underline">{data.myApplication.bookTitle}</Link>
            <p className="text-sm m-0">{statusLabels[data.myApplication.status]}</p>
            {!data.closed && <p className="text-sm text-arena-muted m-0">Du bist für diesen Monat vorgemerkt. Die BuchArena prüft deine Kommentare und Storys vor der Ziehung.</p>}
            {!data.closed && <button type="button" className="btn btn-sm justify-self-start" disabled={busy} onClick={() => {
              const application = data.myApplication!;
              setBookId(application.bookId);
              setSocialHandle(application.socialHandle);
              setNotes(application.notes);
              setAccepted(false);
              setEditing(true);
              setMessage("");
            }}>Bewerbung bearbeiten / Nachweise ergänzen</button>}
          </div> : data.closed ? <p className="text-sm text-arena-muted">Diese Runde ist abgeschlossen. Ab dem nächsten Monat kannst du dich wieder bewerben.</p>
            : !signedIn ? <p className="text-sm"><Link href="/auth" className="text-arena-link underline font-bold">Melde dich an</Link>, um dich mit deinem Buch zu bewerben.</p>
              : !data.myBooks.length ? <p className="text-sm">Für die Bewerbung brauchst du ein eigenes Buch in der BuchArena. <Link href="/meine-buecher" className="text-arena-link underline">Zu meinen Büchern</Link></p>
                : <form onSubmit={apply} className="card-base grid gap-4">
                  <h3 className="text-lg font-bold text-arena-blue m-0">{editing ? "Bewerbung bearbeiten" : `Für ${data.cycle.label} bewerben`}</h3>
                  {editing && <p className="text-sm text-arena-muted m-0">Du kannst Nachweise ergänzen. Nach dem Speichern wird deine Bewerbung erneut geprüft.</p>}
                  <label className="grid gap-1 text-sm font-semibold">Dein Buch
                    <select required className="input-base w-full" value={bookId} onChange={(e) => setBookId(e.target.value)} disabled={busy}>
                      <option value="">Buch auswählen</option>
                      {data.myBooks.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Dein Social-Media-Profil
                    <input required maxLength={200} className="input-base w-full" placeholder="z. B. Instagram: @deinname" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} disabled={busy} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Hinweise und Nachweise (optional)
                    <textarea maxLength={2000} rows={3} className="input-base w-full" placeholder="Weitere Profile, Links zu Kommentaren oder zu Story-Nachweisen. Bewahre spätere Story-Nachweise ebenfalls auf." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} />
                  </label>
                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input type="checkbox" required className="mt-1 shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={busy} />
                    <span>Ich bin Autor oder Autorin des ausgewählten Buches und erfülle bis zur Ziehung im Teilnahmezeitraum dieser Runde mindestens 10 sinnvolle Kommentare und 3 Story-Teilungen bei der BuchArena. Ich akzeptiere die oben genannten Teilnahmebedingungen und die Prüfung meiner Angaben durch die BuchArena.</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-primary" disabled={busy || !accepted || !bookId}>{busy ? "Wird gespeichert …" : editing ? "Änderungen speichern" : "Jetzt für 100 € Werbebudget bewerben"}</button>
                    {editing && <button type="button" className="btn" disabled={busy} onClick={() => setEditing(false)}>Abbrechen</button>}
                  </div>
                </form>}
          {data.isAdmin && <Link href="/admin/werbebudget" className="text-sm text-arena-link underline">Monatliche Bewerbungen verwalten →</Link>}
        </>}

        {admin && data.isAdmin && <div className="grid gap-4">
          <p className="text-sm text-arena-muted m-0">Prüfe für jede Person mindestens 10 sinnvolle Kommentare und 3 Story-Teilungen im angezeigten Teilnahmezeitraum. Für die erste Dezember-Runde zählen bereits Aktivitäten ab dem 24. November 2026. Die abschließende Freigabe ist ab dem letzten Tag des Monats möglich.</p>
          <p className="text-sm font-semibold m-0">{data.applications?.length ?? 0} Bewerbungen · {data.applications?.filter((a) => a.status === "approved").length ?? 0} freigegeben · {data.applications?.filter((a) => a.status === "pending").length ?? 0} ungeprüft</p>
          {data.applications?.map((application) => <article key={application.id} className="card-base grid gap-2">
            <div className="flex flex-wrap justify-between gap-2"><strong>{application.username}</strong><span className="text-xs">{statusLabels[application.status]}</span></div>
            <Link href={`/buch/${application.bookId}`} className="text-arena-link underline">{application.bookTitle}</Link>
            <p className="text-sm break-words m-0">Social Media: {application.socialHandle}</p>
            {application.notes && <p className="text-sm whitespace-pre-wrap break-words m-0">{application.notes}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-primary" disabled={busy || !data.cycle.canReview || application.status === "approved"} onClick={() => void mutate("PATCH", { month: data.cycle.month, action: "review", applicationId: application.id, status: "approved" }, "Teilnahme freigegeben.")}>10 Kommentare &amp; 3 Storys geprüft: Freigeben</button>
              <button type="button" className="btn btn-sm" disabled={busy || !data.cycle.canReview || application.status === "rejected"} onClick={() => void mutate("PATCH", { month: data.cycle.month, action: "review", applicationId: application.id, status: "rejected" }, "Bewerbung abgelehnt.")}>Voraussetzungen nicht erfüllt</button>
            </div>
          </article>)}
          {!data.applications?.length && <p className="text-sm text-arena-muted">Noch keine Bewerbungen für diesen Monat.</p>}
        </div>}
      </>}
    </div>
  );
}
