"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GenrePicker from "@/app/components/genre-picker";
import { STANDARD_AGB_TEXT, STANDARD_TOPICS } from "@/lib/buchzirkel";

type Leseabschnitt = { id: string; titel: string; deadline?: string; beschreibung: string };
type Topic = { id: string; titel: string; typ: string };
type Frage = { id: string; frage: string };
type MeinBuch = { id: string; title: string; genre?: string; coverImageUrl?: string; description?: string };

export default function BuchzirkelErstellenPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [typ, setTyp] = useState<"testleser" | "betaleser">("testleser");
  const [meineBuecher, setMeineBuecher] = useState<MeinBuch[]>([]);
  const [gewaehlteBuchId, setGewaehlteBuchId] = useState<string>("");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [genre, setGenre] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bewerbungBis, setBewerbungBis] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [maxTeilnehmer, setMaxTeilnehmer] = useState(10);
  const [bewerbungsFragen, setBewerbungsFragen] = useState<string[]>(["Erzähle etwas über dich und deine Leseliebe."]);
  const [agbPflicht, setAgbPflicht] = useState(false);
  const [agbText, setAgbText] = useState(STANDARD_AGB_TEXT);
  const [leseabschnitte, setLeseabschnitte] = useState<Leseabschnitt[]>([]);
  const [topics, setTopics] = useState<Topic[]>([...STANDARD_TOPICS]);
  const [fragebogen, setFragebogen] = useState<Frage[]>([]);
  const [buchformateAngebot, setBuchformateAngebot] = useState<string[]>([]);
  const [neuerAbschnittTitel, setNeuerAbschnittTitel] = useState("");
  const [neuerAbschnittDeadline, setNeuerAbschnittDeadline] = useState("");
  const [neueFrage, setNeueFrage] = useState("");

  // Bei Betaleser: AGB immer Pflicht
  const effectiveAgbPflicht = typ === "betaleser" ? true : agbPflicht;

  // Eigene Bücher laden (nur für Testleser relevant)
  useEffect(() => {
    fetch("/api/books/list", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((d: { books?: MeinBuch[] }) => { if (d.books) setMeineBuecher(d.books); })
      .catch(() => {});
  }, []);

  function handleBuchWaehlen(id: string) {
    setGewaehlteBuchId(id);
    if (!id) return;
    const buch = meineBuecher.find((b) => b.id === id);
    if (!buch) return;
    setTitel(buch.title);
    if (buch.genre) setGenre(buch.genre);
    if (buch.description) setBeschreibung(buch.description);
    if (buch.coverImageUrl) setCoverImageUrl(buch.coverImageUrl);
  }

  async function handleSubmit(e: React.FormEvent, status: "entwurf" | "bewerbung") {
    e.preventDefault();
    if (!titel.trim()) { setError("Titel ist erforderlich."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/buchzirkel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typ,
          titel,
          beschreibung,
          genre,
          buchformateAngebot,
          coverImageUrl: coverImageUrl.trim() || undefined,
          bewerbungBis: new Date(bewerbungBis).toISOString(),
          maxTeilnehmer,
          bewerbungsFragen: bewerbungsFragen.filter(Boolean),
          genreFilter: [],
          agbPflicht: effectiveAgbPflicht,
          agbText: effectiveAgbPflicht ? agbText : undefined,
          leseabschnitte: leseabschnitte.map((a) => ({ ...a, deadline: a.deadline ? new Date(a.deadline).toISOString() : undefined })),
          diskussionsTopics: topics,
          fragebogen,
        }),
      });
      const data = await res.json() as { id?: string; message?: string };
      if (!res.ok) { setError(data.message ?? "Fehler beim Erstellen."); return; }

      // Status setzen (entwurf bleibt, bewerbung direkt aktivieren)
      if (status === "bewerbung" && data.id) {
        await fetch(`/api/buchzirkel/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "bewerbung" }),
        });
      }

      router.push(`/buchzirkel/${data.id}/dashboard`);
    } catch {
      setError("Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  function addAbschnitt() {
    if (!neuerAbschnittTitel.trim()) return;
    setLeseabschnitte((prev) => [
      ...prev,
      { id: crypto.randomUUID(), titel: neuerAbschnittTitel.trim(), deadline: neuerAbschnittDeadline, beschreibung: "" },
    ]);
    setNeuerAbschnittTitel("");
    setNeuerAbschnittDeadline("");
  }

  function addFrage() {
    if (!neueFrage.trim()) return;
    setFragebogen((prev) => [...prev, { id: crypto.randomUUID(), frage: neueFrage.trim() }]);
    setNeueFrage("");
  }

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold m-0">Buchzirkel erstellen</h1>
        <p className="text-arena-muted text-sm m-0 mt-1">
          Starte eine Testleser- oder Betaleser-Runde für dein Buch.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 max-sm:grid-cols-1 text-sm text-arena-muted">
          <div className="flex gap-2 items-start"><span>1.</span><span>Erstelle den Zirkel und lege Bewerbungsfragen sowie einen Zeitplan fest.</span></div>
          <div className="flex gap-2 items-start"><span>2.</span><span>Leser bewerben sich – du entscheidest, wer teilnimmt.</span></div>
          <div className="flex gap-2 items-start"><span>3.</span><span>Teilnehmer lesen, diskutieren und geben Feedback im geschlossenen Bereich.</span></div>
        </div>
      </section>

      <form className="w-full flex flex-col gap-4 mt-3" onSubmit={(e) => e.preventDefault()}>
        {/* Typ */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-3">Art des Buchzirkels</h2>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <button
              type="button"
              onClick={() => setTyp("testleser")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                typ === "testleser" ? "border-arena-blue bg-blue-50" : "border-arena-border hover:border-arena-blue"
              }`}
            >
              <p className="font-bold m-0">(Test)Leser-Zirkel</p>
              <p className="text-sm text-arena-muted m-0 mt-1">
                Für bereits veröffentlichte Bücher – Rezensionen auf Amazon, Goodreads & Co.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTyp("betaleser")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                typ === "betaleser" ? "border-red-400 bg-red-50" : "border-arena-border hover:border-red-400"
              }`}
            >
              <p className="font-bold m-0 text-red-800">🔒 Betaleser-Zirkel</p>
              <p className="text-sm text-red-700 m-0 mt-1">
                Für unveröffentlichte Manuskripte – Verschwiegenheitspflicht automatisch aktiv.
              </p>
            </button>
          </div>
        </section>

        {/* Basis-Info */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-3">Buch-Informationen</h2>
          <div className="flex flex-col gap-3">
            {typ === "testleser" && meineBuecher.length > 0 && (
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Aus meinen Büchern übernehmen (optional)</label>
                <select
                  className="input-base w-full"
                  value={gewaehlteBuchId}
                  onChange={(e) => handleBuchWaehlen(e.target.value)}
                >
                  <option value="">– Buch auswählen –</option>
                  {meineBuecher.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}{b.genre ? ` (${b.genre})` : ""}</option>
                  ))}
                </select>
                <p className="text-xs text-arena-muted">Felder werden automatisch aus dem Buch befüllt und können angepasst werden.</p>
              </div>
            )}
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="titel">Titel *</label>
              <input id="titel" className="input-base w-full" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Buchtitel oder Arbeitstitel" required />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="beschreibung">Beschreibung</label>
              <textarea id="beschreibung" className="input-base w-full" rows={3} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Kurzbeschreibung des Buches / Projekts" />
            </div>
            <div className="grid gap-1">
              <GenrePicker label="Genre" value={genre} onChange={setGenre} />
            </div>
            <div className="grid gap-1">
              <span className="text-sm font-semibold">Bereitgestellte Formate</span>
              <div className="flex flex-wrap gap-3 mt-1">
                {(["gedruckt", "epub", "pdf"] as const).map((fmt) => {
                  const label = fmt === "gedruckt" ? "Gedrucktes Buch" : fmt.toUpperCase();
                  return (
                    <label key={fmt} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={buchformateAngebot.includes(fmt)}
                        onChange={(e) => setBuchformateAngebot((prev) =>
                          e.target.checked ? [...prev, fmt] : prev.filter((f) => f !== fmt)
                        )}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-arena-muted">Was erhalten die Teilnehmer? Mehrfachwahl möglich.</p>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="coverImageUrl">Cover-URL (optional)</label>
              <input id="coverImageUrl" className="input-base w-full" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
        </section>

        {/* Bewerbungsphase */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-1">Bewerbungsphase</h2>
          <p className="text-sm text-arena-muted m-0 mb-3">Setze eine Frist, bis wann sich Leser bewerben können. Danach wählst du im Dashboard aus, wer teilnimmt. Mit Bewerbungsfragen kannst du gezielt nach Vorwissen, Verfügbarkeit oder Rezensionsbereitschaft fragen.</p>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="bewerbungBis">Bewerbungsfrist</label>
              <input id="bewerbungBis" type="date" className="input-base w-full" value={bewerbungBis} onChange={(e) => setBewerbungBis(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="maxTeilnehmer">Max. Teilnehmer</label>
              <input id="maxTeilnehmer" type="number" className="input-base w-full" min={1} max={200} value={maxTeilnehmer} onChange={(e) => setMaxTeilnehmer(Number(e.target.value))} />
            </div>
          </div>

          <div className="mt-3 grid gap-1">
            <label className="text-sm font-semibold">Bewerbungsfragen</label>
            {bewerbungsFragen.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input-base flex-1"
                  value={f}
                  onChange={(e) => setBewerbungsFragen((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Frage ${i + 1}`}
                />
                <button type="button" onClick={() => setBewerbungsFragen((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 px-2">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => setBewerbungsFragen((prev) => [...prev, ""])} className="text-arena-blue text-sm mt-1 hover:underline">
              + Frage hinzufügen
            </button>
          </div>
        </section>

        {/* AGB */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-1">Verschwiegenheitserklärung</h2>
          {typ === "betaleser" ? (
            <p className="text-sm text-red-700 m-0 mb-3">Bei Betaleser-Zirkeln ist die Verschwiegenheitserklärung Pflicht.</p>
          ) : (
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input type="checkbox" checked={agbPflicht} onChange={(e) => setAgbPflicht(e.target.checked)} />
              Verschwiegenheitserklärung aktivieren
            </label>
          )}
          {effectiveAgbPflicht && (
            <textarea
              className="input-base w-full text-sm"
              rows={8}
              value={agbText}
              onChange={(e) => setAgbText(e.target.value)}
            />
          )}
        </section>

        {/* Leseabschnitte */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-1">Leseabschnitte & Deadlines</h2>
          <p className="text-sm text-arena-muted m-0 mb-3">Teile das Buch in Abschnitte auf und lege Lesedeadlines fest. Teilnehmer markieren jeden Abschnitt als gelesen und erhalten bei nahender Deadline eine Erinnerungs-E-Mail. Abschnitte sind optional – du kannst den Zirkel auch ohne Zeitplan betreiben.</p>
          {leseabschnitte.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2 mb-2 text-sm border border-arena-border rounded-lg p-2">
              <span className="flex-1 font-medium">{a.titel}</span>
              <span className="text-arena-muted">{a.deadline ? new Date(a.deadline).toLocaleDateString("de-AT") : "Kein Datum"}</span>
              <button type="button" onClick={() => setLeseabschnitte((prev) => prev.filter((_, j) => j !== i))} className="text-red-500">✕</button>
            </div>
          ))}
          <div className="flex gap-2 mt-2 flex-wrap">
            <input className="input-base flex-1" placeholder="z.B. Kapitel 1–10" value={neuerAbschnittTitel} onChange={(e) => setNeuerAbschnittTitel(e.target.value)} />
            <input type="date" className="input-base w-40" value={neuerAbschnittDeadline} onChange={(e) => setNeuerAbschnittDeadline(e.target.value)} />
            <button type="button" onClick={addAbschnitt} className="btn btn-secondary">Hinzufügen</button>
          </div>
        </section>

        {/* Diskussions-Topics */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-1">Diskussions-Bereiche</h2>
          <p className="text-sm text-arena-muted m-0 mb-2">Gliedere die Diskussion in Themenbereiche (z.B. „Handlung", „Figuren", „Stil"). Teilnehmer können gezielt in einem Bereich posten. Standard-Topics werden automatisch angelegt – benenne sie nach deinen Wünschen.</p>
          {topics.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 mb-2">
              <input
                className="input-base flex-1"
                value={t.titel}
                onChange={(e) => setTopics((prev) => prev.map((x, j) => j === i ? { ...x, titel: e.target.value } : x))}
              />
              <button type="button" onClick={() => setTopics((prev) => prev.filter((_, j) => j !== i))} className="text-red-500">✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTopics((prev) => [...prev, { id: crypto.randomUUID(), titel: "Neues Topic", typ: "allgemein" }])}
            className="text-arena-blue text-sm hover:underline mt-1"
          >
            + Topic hinzufügen
          </button>
        </section>

        {/* Fragebogen */}
        <section className="card">
          <h2 className="text-base font-semibold m-0 mb-1">Abschluss-Fragebogen</h2>
          <p className="text-sm text-arena-muted m-0 mb-2">Optionale Fragen, die Teilnehmer am Ende des Zirkels beantworten sollen – z.B. zu Charakteren, Handlungsbogen oder Schreibstil. Die Antworten siehst du im Dashboard.</p>
          {fragebogen.map((f, i) => (
            <div key={f.id} className="flex items-center gap-2 mb-2">
              <span className="flex-1 text-sm">{f.frage}</span>
              <button type="button" onClick={() => setFragebogen((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 text-sm">✕</button>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <input className="input-base flex-1" placeholder="z.B. War das Ende glaubwürdig?" value={neueFrage} onChange={(e) => setNeueFrage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFrage(); } }} />
            <button type="button" onClick={addFrage} className="btn btn-secondary">Hinzufügen</button>
          </div>
        </section>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Haftungshinweis */}
        <div className="rounded-lg bg-gray-50 border border-arena-border p-3 text-xs text-arena-muted">
          <strong className="text-arena-text">Hinweis:</strong> BuchArena übernimmt keine Haftung für Inhalte, die im Rahmen eines Buchzirkels an Dritte weitergegeben werden oder nach außen dringen. Die Weitergabe von Manuskripten und unveröffentlichten Texten erfolgt auf eigene Gefahr des Autors. Wir empfehlen, ausschließlich Personen zuzulassen, denen du vertraust, und die Verschwiegenheitserklärung zu aktivieren.
        </div>

        {/* Aktionen */}
        <div className="flex gap-3 justify-end flex-wrap">
          <button type="button" disabled={saving} onClick={(e) => handleSubmit(e, "entwurf")} className="btn btn-secondary">
            Als Entwurf speichern
          </button>
          <button type="submit" disabled={saving} onClick={(e) => handleSubmit(e, "bewerbung")} className="btn btn-primary">
            {saving ? "Wird gespeichert…" : "Veröffentlichen & Bewerbungen öffnen"}
          </button>
        </div>
      </form>
    </main>
  );
}
