"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AD_BUDGET_COUNTRIES, getAdBudgetCycle, type AdBudgetApplication, type AdBudgetData } from "@/lib/werbebudget";
import { AD_BUDGET_TERMS_PATH, AD_BUDGET_TERMS_VERSION } from "@/lib/werbebudget-terms";

const statusLabels = { pending: "Prüfung ausstehend", approved: "Für die Ziehung freigegeben", rejected: "Teilnahmebedingungen nicht erfüllt", withdrawn: "Bewerbung zurückgezogen" };

export default function WerbebudgetSection({ signedIn, admin = false }: { signedIn: boolean; admin?: boolean }) {
  const [data, setData] = useState<AdBudgetData | null>(null);
  const [month, setMonth] = useState("");
  const [bookId, setBookId] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [country, setCountry] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [eligibility, setEligibility] = useState(false);
  const [rights, setRights] = useState(false);
  const [publication, setPublication] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});

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

  async function mutate(method: "POST" | "PUT" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
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
    const saved = await mutate(editing ? "PUT" : "POST", {
      month: data.cycle.month, bookId, socialHandle, notes, country,
      conditionsAccepted: accepted, termsVersion: AD_BUDGET_TERMS_VERSION,
      eligibilityConfirmed: eligibility, rightsConfirmed: rights, publicationConsent: publication,
    }, "Deine Bewerbung und Bestätigungen sind gespeichert. Viel Glück!");
    if (saved) setEditing(false);
  }

  function edit(application: AdBudgetApplication) {
    setBookId(application.bookId);
    setSocialHandle(application.socialHandle);
    setNotes(application.notes);
    setCountry(application.country ?? "");
    setPublication(application.publicationConsent?.granted ?? false);
    setAccepted(false);
    setEligibility(false);
    setRights(false);
    setEditing(true);
    setMessage("");
  }

  function applicationActions(application: AdBudgetApplication, applicationMonth: string) {
    return <div className="flex flex-wrap gap-2">
      {application.status !== "withdrawn" && <button type="button" className="btn btn-sm" disabled={busy} onClick={() => {
        if (window.confirm("Bewerbung zurückziehen? Du nimmst dann für diese Runde nicht an der Ziehung teil. Profilangaben und Nachweise werden aus der Bewerbung entfernt.")) {
          void mutate("DELETE", { month: applicationMonth }, "Deine Bewerbung wurde zurückgezogen. Profilangaben und Nachweise wurden entfernt.");
        }
      }}>Bewerbung zurückziehen</button>}
      {application.publicationConsent?.granted && <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void mutate("PATCH", { month: applicationMonth, action: "revoke-publication" }, "Die freiwillige Einwilligung zur Gewinnernennung ist widerrufen. Deine Bewerbung bleibt bestehen.")}>Einwilligung zur Gewinnernennung widerrufen</button>}
    </div>;
  }

  return <div className="grid gap-5">
    {!admin && <>
      <p className="text-arena-muted leading-relaxed m-0">Jeden Monat gewinnt eine Autorin oder ein Autor <strong className="text-arena-blue">100 € Werbebudget</strong> für ein BuchArena-Reel zum eigenen Buch – mit Link zur Buchdetailseite. Das Budget wird vollständig für Anzeigen inklusive etwaiger Plattformgebühren und Steuern eingesetzt. Es gibt keine Barauszahlung und keine garantierten Aufrufe oder Verkäufe.</p>
      <div className="card-info grid gap-3">
        <h2 className="text-lg font-bold text-arena-blue m-0">So bist du dabei</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm m-0">
          <li>Mindestens <strong>10 eigene, sinnvolle Kommentare unter 10 unterschiedlichen Beiträgen oder Reels</strong> von <a href="https://www.instagram.com/bucharena365/" target="_blank" rel="noopener noreferrer" className="text-arena-link underline">@bucharena365 auf Instagram</a> im Teilnahmezeitraum. Sachliche Kritik zählt genauso wie Lob; reine Emojis, kopierte Texte und Spam zählen nicht.</li>
          <li><strong>Story-Teilungen sind freiwillig.</strong> Sie erhöhen die Gewinnchance nicht. Auch Likes, Folgen oder Freundesmarkierungen sind keine Voraussetzung.</li>
          <li>Kostenlos bewerben: ab 18 Jahren, Wohnsitz in Österreich, Deutschland oder der Schweiz, ein eigenes Buch in der BuchArena und eine aktive Bewerbung pro Person und Monat.</li>
          <li>Die zehn Beitragslinks und gegebenenfalls Nachweise bis zum Bewerbungsschluss ergänzen. Bei privaten Profilen geeignete Screenshots bereitstellen und Angaben unbeteiligter Personen schwärzen.</li>
        </ul>
        <p className="text-sm text-arena-muted m-0"><strong>Die erste Dezember-Runde beginnt bereits am 24. November 2026.</strong> Kommentare ab diesem Tag zählen für Dezember. Danach beginnt am Monatsersten jeweils eine neue Runde; Bewerbungen und Aktivitäten werden nicht übertragen.</p>
        <p className="text-sm text-arena-muted m-0">Je Monatsrunde wird unter den gültigen Bewerbungen eine Person zufällig ausgewählt. Alle haben dieselbe Gewinnchance. Einzelheiten zu Nachweisen, Gewinnabwicklung und Rechten stehen in den vollständigen Bedingungen.</p>
      </div>
    </>}

    <nav className="flex flex-wrap gap-3 text-sm" aria-label="Teilnahmebedingungen und Datenschutz">
      <Link href={AD_BUDGET_TERMS_PATH} target="_blank" rel="noopener noreferrer" className="text-arena-link underline font-semibold">Vollständige Teilnahmebedingungen</Link>
      <Link href={`${AD_BUDGET_TERMS_PATH}#datenschutz`} target="_blank" rel="noopener noreferrer" className="text-arena-link underline">Datenschutzhinweise zur Aktion</Link>
      <Link href="/impressum" className="text-arena-link underline">Veranstalter / Impressum</Link>
    </nav>
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
        <p className="text-sm m-0"><strong>Bewerbungs- und Nachweisschluss: {data.cycle.drawDate}, 18:00 Uhr</strong></p>
        <p className="text-sm m-0">Geplante Ziehung: {data.cycle.drawDate}, 20:00 Uhr · {data.closed ? "Bewerbungszeitraum beendet" : "Bewerbungen offen"}</p>
        <p className="text-sm text-arena-muted m-0">Aktivitäten zählen: {data.cycle.activityPeriod}, bis zum Bewerbungsschluss. Alle Zeiten gelten in Wien (Europe/Vienna, einschließlich Sommerzeit).</p>
      </div>

      {!admin && <>
        {data.myApplication && !editing ? <div className="card-base grid gap-2">
          <h3 className="font-bold text-arena-blue m-0">Deine Bewerbung für {data.cycle.label}</h3>
          <Link href={`/buch/${data.myApplication.bookId}`} className="text-arena-link underline">{data.myApplication.bookTitle}</Link>
          <p className="text-sm m-0">{statusLabels[data.myApplication.status]}</p>
          {data.myApplication.reviewReason && <p className="text-sm m-0">Begründung: {data.myApplication.reviewReason}</p>}
          {data.myApplication.acceptance && <p className="text-xs text-arena-muted m-0">Bestätigte Fassung: <Link href={`/social-media/werbebudget/teilnahmebedingungen/${data.myApplication.acceptance.version}`} className="underline">{data.myApplication.acceptance.version}</Link></p>}
          {!data.closed && <button type="button" className="btn btn-sm justify-self-start" disabled={busy} onClick={() => edit(data.myApplication!)}>{data.myApplication.status === "withdrawn" ? "Erneut für diese Runde bewerben" : "Bewerbung bearbeiten / Nachweise ergänzen"}</button>}
          {applicationActions(data.myApplication, data.cycle.month)}
        </div> : data.closed ? <p className="text-sm text-arena-muted">Die Bewerbungsfrist dieser Runde ist beendet. Ab dem nächsten Monat kannst du dich wieder bewerben.</p>
          : !signedIn ? <p className="text-sm"><Link href="/auth" className="text-arena-link underline font-bold">Melde dich an</Link>, um dich mit deinem Buch zu bewerben.</p>
            : data.isAdmin ? <p className="text-sm text-arena-muted">An der Verwaltung beteiligte Personen sind von der Teilnahme ausgeschlossen.</p>
              : !data.myBooks.length ? <p className="text-sm">Für die Bewerbung brauchst du ein eigenes Buch in der BuchArena. <Link href="/meine-buecher" className="text-arena-link underline">Zu meinen Büchern</Link></p>
                : <form onSubmit={apply} className="card-base grid gap-4">
                  <h3 className="text-lg font-bold text-arena-blue m-0">{editing ? "Bewerbung bearbeiten" : `Für ${data.cycle.label} bewerben`}</h3>
                  {editing && <p className="text-sm text-arena-muted m-0">Nach dem Speichern wird deine Bewerbung erneut geprüft. Die freiwillige Gewinnernennung kannst du unabhängig davon widerrufen.</p>}
                  <label className="grid gap-1 text-sm font-semibold">Dein Buch
                    <select required className="input-base w-full" value={bookId} onChange={(e) => setBookId(e.target.value)} disabled={busy}>
                      <option value="">Buch auswählen</option>
                      {data.myBooks.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Dein Instagram-Profil
                    <input required maxLength={200} className="input-base w-full" placeholder="Instagram: @deinname" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} disabled={busy} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Wohnsitzland
                    <select required className="input-base w-full" value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy}>
                      <option value="">Land auswählen</option>
                      {Object.entries(AD_BUDGET_COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Beitragslinks, Nachweise und Hinweise
                    <textarea maxLength={2000} rows={5} className="input-base w-full" placeholder="Trage die zehn Beitragslinks und bei Bedarf Links zu geschwärzten Screenshots ein. Du kannst sie bis zum Bewerbungsschluss ergänzen." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} />
                  </label>
                  <p className="text-xs text-arena-muted m-0">Für eine frühe Bewerbung dürfen die Nachweise noch fehlen. Ergänze sie bis zum Bewerbungsschluss. Bitte keine privaten Nachrichten oder unnötigen Daten anderer Personen übermitteln.</p>
                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input type="checkbox" required className="mt-1 shrink-0" checked={eligibility} onChange={(e) => setEligibility(e.target.checked)} disabled={busy} />
                    <span>Ich bin mindestens 18 Jahre alt, wohne im angegebenen Land und bin Autor oder bestätigter Mitautor des Buches. Ich bin weder Veranstalter noch an Prüfung oder Ziehung beteiligt und nehme pro Monatsrunde nur einmal teil.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input type="checkbox" required className="mt-1 shrink-0" checked={rights} onChange={(e) => setRights(e.target.checked)} disabled={busy} />
                    <span>Ich darf die eingereichten Buchmaterialien für die in Abschnitt 8 beschriebenen Zwecke verwenden lassen und räume der BuchArena im Gewinnfall die dort begrenzten Nutzungsrechte für das Reel einschließlich bezahlter Werbung ein.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input type="checkbox" required className="mt-1 shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={busy} />
                    <span>Ich akzeptiere die <Link href={AD_BUDGET_TERMS_PATH} target="_blank" rel="noopener noreferrer" className="text-arena-link underline">Teilnahmebedingungen ({AD_BUDGET_TERMS_VERSION})</Link>. Ich habe die <Link href={`${AD_BUDGET_TERMS_PATH}#datenschutz`} target="_blank" rel="noopener noreferrer" className="text-arena-link underline">Datenschutzhinweise zur Aktion</Link> zur Kenntnis genommen. Die beschriebenen Kommentarvoraussetzungen erfülle ich bis zum Bewerbungsschluss.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input type="checkbox" className="mt-1 shrink-0" checked={publication} onChange={(e) => setPublication(e.target.checked)} disabled={busy} />
                    <span><strong>Freiwillig:</strong> Die BuchArena darf mich im Gewinnfall mit meinem Benutzernamen auf der BuchArena sowie ihren Instagram- und Facebook-Kanälen als Gewinner nennen. Diese Einwilligung ist jederzeit für die Zukunft widerrufbar und beeinflusst weder Gewinnchance noch Gewinn. Keine Newsletter-Anmeldung.</span>
                  </label>
                  <p className="text-xs text-arena-muted m-0">Bewerbungsdaten werden 180 Tage nach dem Bewerbungsschluss automatisch gelöscht. Für die notwendige Abwicklung ist keine zusätzliche Datenschutz-Einwilligung erforderlich.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-primary" disabled={busy || !accepted || !eligibility || !rights || !country || !bookId}>{busy ? "Wird gespeichert …" : editing ? "Änderungen speichern" : "Kostenlos für 100 € Werbebudget bewerben"}</button>
                    {editing && <button type="button" className="btn" disabled={busy} onClick={() => setEditing(false)}>Abbrechen</button>}
                  </div>
                </form>}
        {!!data.myPreviousApplications.length && <details className="card-base">
          <summary className="font-semibold cursor-pointer">Frühere Bewerbungen und Einwilligungen</summary>
          <div className="grid gap-4 mt-3">{data.myPreviousApplications.map(({ month: previousMonth, application }) => <article key={previousMonth} className="grid gap-2">
            <strong>{getAdBudgetCycle(previousMonth).label}: {application.bookTitle}</strong>
            <p className="text-sm m-0">{statusLabels[application.status]}</p>
            {applicationActions(application, previousMonth)}
          </article>)}</div>
        </details>}
        {data.isAdmin && <Link href="/admin/werbebudget" className="text-sm text-arena-link underline">Monatliche Bewerbungen verwalten →</Link>}
      </>}

      {admin && data.isAdmin && <div className="grid gap-4">
        <p className="text-sm text-arena-muted m-0">Prüfe zehn sinnvolle Kommentare unter zehn unterschiedlichen Beiträgen von @bucharena365 innerhalb des Teilnahmezeitraums sowie Nachweise, Teilnahmeberechtigung und Bestätigungen. Story-Teilungen sind freiwillig. Eine Freigabe ist erst nach Bewerbungsschluss möglich. Für das spätere Gewinner-Reel müssen auch Musik und Sprecheraufnahme für bezahlte Werbung freigegeben sein.</p>
        <p className="text-sm text-arena-muted m-0">Für die steuerliche Prüfung die ausgelobten Gewinnwerte aller Aktionen desselben Veranstalters je Kalenderjahr zusammenführen. Weitere Informationen: <a href="https://www.wko.at/information-consulting/werbung-marktkommunikation/leitfaden-gewinnspiele-preisausschreiben-gluecksspiele" target="_blank" rel="noopener noreferrer" className="text-arena-link underline">WKO-Leitfaden zu Gewinnspielen und Glücksspielabgabe</a>.</p>
        <p className="text-sm font-semibold m-0">{data.applications?.filter((a) => a.status !== "withdrawn").length ?? 0} aktive Bewerbungen · {data.applications?.filter((a) => a.status === "approved").length ?? 0} freigegeben · {data.applications?.filter((a) => a.status === "pending").length ?? 0} ungeprüft</p>
        {data.applications?.map((application) => <article key={application.id} className="card-base grid gap-2">
          <div className="flex flex-wrap justify-between gap-2"><strong>{application.username}</strong><span className="text-xs">{statusLabels[application.status]}</span></div>
          <Link href={`/buch/${application.bookId}`} className="text-arena-link underline">{application.bookTitle}</Link>
          {application.socialHandle && <p className="text-sm break-words m-0">Instagram: {application.socialHandle}</p>}
          {application.notes && <p className="text-sm whitespace-pre-wrap break-words m-0">{application.notes}</p>}
          <p className="text-xs text-arena-muted m-0">Fassung: {application.acceptance?.version ?? "Altbewerbung ohne gespeicherte Fassung – Angaben und Rechte individuell klären"} · Gewinnernennung: {application.publicationConsent?.granted ? "freiwillig erlaubt" : "nicht erlaubt"}</p>
          {application.acceptance && <p className="text-xs text-arena-muted m-0">Land: {application.country ? AD_BUDGET_COUNTRIES[application.country] : "zurückgezogen"} · Volljährigkeit und Materialrechte bestätigt am {new Date(application.acceptance.acceptedAt).toLocaleString("de-AT", { timeZone: "Europe/Vienna" })} (Wien).</p>}
          {application.status !== "withdrawn" && <>
            <label className="grid gap-1 text-sm">Prüfhinweis / Grund einer Ablehnung
              <input className="input-base w-full" maxLength={500} value={reviewReasons[application.id] ?? application.reviewReason ?? ""} disabled={busy || !data.cycle.canReview} onChange={(e) => setReviewReasons((previous) => ({ ...previous, [application.id]: e.target.value }))} placeholder="z. B. nur 7 unterschiedliche Kommentare im Teilnahmezeitraum nachgewiesen" />
            </label>
            <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-primary" disabled={busy || !data.cycle.canReview || application.status === "approved"} onClick={() => void mutate("PATCH", { month: data.cycle.month, action: "review", applicationId: application.id, status: "approved" }, "Teilnahme freigegeben.")}>Voraussetzungen geprüft: Freigeben</button>
            <button type="button" className="btn btn-sm" disabled={busy || !data.cycle.canReview || !(reviewReasons[application.id] ?? application.reviewReason ?? "").trim()} onClick={() => void mutate("PATCH", { month: data.cycle.month, action: "review", applicationId: application.id, status: "rejected", reason: reviewReasons[application.id] ?? application.reviewReason ?? "" }, "Bewerbung mit Begründung abgelehnt.")}>Voraussetzungen nicht erfüllt</button>
            </div>
          </>}
        </article>)}
        {!data.applications?.length && <p className="text-sm text-arena-muted">Noch keine Bewerbungen für diesen Monat.</p>}
      </div>}
    </>}
    <p className="text-xs text-arena-muted m-0">Diese Aktion steht in keiner Verbindung zu Instagram oder Facebook und wird von diesen weder gesponsert noch unterstützt oder organisiert. Veranstalter und Ansprechpartner ist Matthias Gmeiner / BuchArena. Die Freistellung der Plattformen im gesetzlich zulässigen Umfang ist in den Teilnahmebedingungen geregelt.</p>
  </div>;
}
