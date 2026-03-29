"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import {
  DocumentArrowDownIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  FolderOpenIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import GenrePicker from "@/app/components/genre-picker";

/* ── helpers ── */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/* convert a data-URL (user upload) to a Blob for PPTX embedding */
function dataUrlToBlob(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const raw = atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/* ── types ── */

interface SavedVorlage {
  _id: string;
  buchtitel: string;
  autorName: string;
  geschlecht?: string;
  autorTitel?: string;
  autorHerkunft?: string;
  autorBeruf?: string;
  autorStil?: string;
  autorImg?: string;
  submissionId?: string;
  updatedAt: string;
}

interface FormData {
  buchtitel: string;
  untertitel: string;
  autorName: string;
  erscheinungsjahr: string;
  genre: string;
  verlag: string;
  coverDesign: string;
  hintergrund: string;
  hauptfigur: string;
  thema: string;
  inhalte: string;
  schwerpunkt: string;
  geschlecht: "Autorin" | "Autor";
  autorTitel: string;
  autorHerkunft: string;
  autorBeruf: string;
  autorStil: string;
  zusammenfassung: string[];
  notes1: string;
  notes2: string;
  notes3: string;
  notes4: string;
  notes5: string;
  notiz: string;
}

const INITIAL: FormData = {
  buchtitel: "",
  untertitel: "",
  autorName: "",
  erscheinungsjahr: new Date().getFullYear().toString(),
  genre: "",
  verlag: "",
  coverDesign: "",
  hintergrund: "",
  hauptfigur: "",
  thema: "",
  inhalte: "",
  schwerpunkt: "",
  geschlecht: "Autorin",
  autorTitel: "",
  autorHerkunft: "",
  autorBeruf: "",
  autorStil: "",
  zusammenfassung: ["", "", "", "", ""],
  notes1: "",
  notes2: "",
  notes3: "",
  notes4: "",
  notes5: "",
  notiz: "",
};

const STEP_LABELS = [
  "Titelfolie",
  "Allgemeine Infos",
  "Worum geht’s?",
  "Über den Autor",
  "Zusammenfassung",

];

const DECO = {
  buchstapel: "/vorlage/buchstapel.png",
  offenesBuch: "/vorlage/offenes-buch.png",
  fliegendeBuecher: "/vorlage/fliegende-buecher.png",
  buchLaptop: "/vorlage/buch-laptop.png",
  buecherregal: "/vorlage/buecherregal.png",
};

export default function VorlageErstellenPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [coverImg, setCoverImg] = useState<string | null>(null);
  const [autorImg, setAutorImg] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [savedVorlagen, setSavedVorlagen] = useState<SavedVorlage[]>([]);
  const [showVorlagen, setShowVorlagen] = useState(false);
  const [submissions, setSubmissions] = useState<{_id: string; bookTitle: string; author: string; status: string; createdAt: string}[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [step, setStep] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  /* Preview follows the active step */
  const previewSlide = Math.min(step, 4);
  const [error, setError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const autorRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function sync() {
      setAccount(getStoredAccount());
      setAccountLoaded(true);
    }
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /* warn before leaving with unsaved changes */
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
  }

  /** Prüfe ob ein anderer Autor-Datensatz existiert und übernehme die Infos */
  function tryPrefillAutor(name: string) {
    const n = name.trim().toLowerCase();
    if (!n) return;
    const match = savedVorlagen.find(
      (v) =>
        v._id !== savedId &&
        v.autorName.trim().toLowerCase() === n,
    );
    if (!match) return;
    // Nur leere Felder überschreiben
    setForm((f) => ({
      ...f,
      geschlecht: match.geschlecht === "Autor" ? "Autor" : f.geschlecht,
      autorTitel: f.autorTitel || match.autorTitel || "",
      autorHerkunft: f.autorHerkunft || match.autorHerkunft || "",
      autorBeruf: f.autorBeruf || match.autorBeruf || "",
      autorStil: f.autorStil || match.autorStil || "",
    }));
    if (!autorImg && match.autorImg) {
      setAutorImg(match.autorImg);
    }
  }

  function setBullet(idx: number, val: string) {
    setForm((f) => {
      const arr = [...f.zusammenfassung];
      arr[idx] = val;
      return { ...f, zusammenfassung: arr };
    });
    setDirty(true);
  }

  function addBullet() {
    if (form.zusammenfassung.length >= 8) return;
    setForm((f) => ({ ...f, zusammenfassung: [...f.zusammenfassung, ""] }));
  }

  function removeBullet(idx: number) {
    if (form.zusammenfassung.length <= 2) return;
    setForm((f) => ({
      ...f,
      zusammenfassung: f.zusammenfassung.filter((_, i) => i !== idx),
    }));
  }

  async function handleImage(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Nur Bilddateien sind erlaubt.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Das Bild darf maximal 10 MB groß sein.");
      return;
    }
    setError("");
    const b64 = await fileToBase64(file);
    setter(b64);
    setDirty(true);
  }

  /* ═══ SAVE / LOAD / SUBMIT ═══ */

  const loadVorlagen = useCallback(async () => {
    try {
      const res = await fetch("/api/bucharena/vorlagen");
      const data = await res.json();
      if (data.success) setSavedVorlagen(data.vorlagen);
    } catch { /* ignore */ }
  }, []);

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/bucharena/submissions/my");
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions.filter((s: { status: string }) => s.status !== "withdrawn"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (account) { loadVorlagen(); loadSubmissions(); }
  }, [account, loadVorlagen, loadSubmissions]);

  async function saveVorlage() {
    setError("");
    setSuccessMsg("");
    if (!form.buchtitel.trim()) {
      setError("Buchtitel ist erforderlich zum Speichern.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, coverImg, autorImg };
      let res: Response;
      if (savedId) {
        res = await fetch(`/api/bucharena/vorlagen/${savedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/bucharena/vorlagen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Fehler beim Speichern");
        return;
      }
      if (data.id) setSavedId(data.id);
      setDirty(false);
      setSuccessMsg("Vorlage gespeichert!");
      setTimeout(() => setSuccessMsg(""), 3000);
      loadVorlagen();
    } catch {
      setError("Fehler beim Speichern der Vorlage.");
    } finally {
      setSaving(false);
    }
  }

  async function loadVorlage(id: string) {
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/bucharena/vorlagen/${id}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Fehler beim Laden");
        return;
      }
      const v = data.vorlage;
      setForm({
        buchtitel: v.buchtitel ?? "",
        untertitel: v.untertitel ?? "",
        autorName: v.autorName ?? [v.autorVorname, v.autorNachname].filter(Boolean).join(" "),
        geschlecht: v.geschlecht === "Autor" ? "Autor" : "Autorin",
        erscheinungsjahr: v.erscheinungsjahr ?? "",
        genre: v.genre ?? "",
        verlag: v.verlag ?? "",
        coverDesign: v.coverDesign ?? "",
        hintergrund: v.hintergrund ?? "",
        hauptfigur: v.hauptfigur ?? "",
        thema: v.thema ?? "",
        inhalte: v.inhalte ?? "",
        schwerpunkt: v.schwerpunkt ?? "",
        autorTitel: v.autorTitel ?? "",
        autorHerkunft: v.autorHerkunft ?? "",
        autorBeruf: v.autorBeruf ?? "",
        autorStil: v.autorStil ?? "",
        zusammenfassung: v.zusammenfassung ?? ["", "", "", "", ""],
        notes1: v.notes1 ?? "",
        notes2: v.notes2 ?? "",
        notes3: v.notes3 ?? "",
        notes4: v.notes4 ?? "",
        notes5: v.notes5 ?? "",
        notiz: v.notiz ?? "",
      });
      setCoverImg(v.coverImg || null);
      setAutorImg(v.autorImg || null);
      setSavedId(id);
      setSubmissionId(v.submissionId || null);
      setShowVorlagen(false);
      setStep(0);
      setDirty(false);
      setSuccessMsg("Vorlage geladen!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Fehler beim Laden der Vorlage.");
    }
  }

  async function deleteVorlage(id: string) {
    try {
      await fetch(`/api/bucharena/vorlagen/${id}`, { method: "DELETE" });
      if (savedId === id) {
        setSavedId(null);
        setSubmissionId(null);
      }
      loadVorlagen();
    } catch { /* ignore */ }
    setDeleteConfirmId(null);
  }

  function newVorlage() {
    const latest = savedVorlagen[0];
    setForm({
      ...INITIAL,
      autorName: latest?.autorName ?? "",
      geschlecht: latest?.geschlecht === "Autor" ? "Autor" : INITIAL.geschlecht,
      autorTitel: latest?.autorTitel ?? "",
      autorHerkunft: latest?.autorHerkunft ?? "",
      autorBeruf: latest?.autorBeruf ?? "",
      autorStil: latest?.autorStil ?? "",
    });
    setCoverImg(null);
    setAutorImg(latest?.autorImg || null);
    setSavedId(null);
    setSubmissionId(null);
    setStep(0);
    setShowVorlagen(false);
    setError("");
    setSuccessMsg("");
    setDirty(false);
  }

  const autorFull = form.autorName.trim();

  /* ═══ STEP COMPLETENESS ═══ */

  function isStepComplete(i: number): boolean {
    switch (i) {
      case 0: return !!form.buchtitel.trim() && !!form.autorName.trim() && !!form.notes1.trim();
      case 1: return !!form.erscheinungsjahr.trim() && !!form.genre.trim() && !!form.verlag.trim() && !!coverImg && !!form.notes2.trim();
      case 2: return !!form.hauptfigur.trim() && !!form.thema.trim() && !!form.inhalte.trim() && !!form.schwerpunkt.trim() && !!form.notes3.trim();
      case 3: return !!form.autorHerkunft.trim() && !!form.autorBeruf.trim() && !!form.autorStil.trim() && !!autorImg && !!form.notes4.trim();
      case 4: return form.zusammenfassung.every((b) => b.trim().length > 0) && !!form.notes5.trim();
      default: return false;
    }
  }

  const allComplete = [0, 1, 2, 3, 4].every(isStepComplete);

  /** Returns red-border class when the field is empty */
  function req(value: string): string {
    return value.trim() ? "" : " !border-red-400";
  }

  /* ═══ SLIDE PREVIEW ═══ */

  function SlideFrame({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="relative w-full aspect-[16/9] rounded-lg overflow-hidden select-none"
        style={{ background: "#F8F8F8", fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif" }}
      >
        {children}
      </div>
    );
  }

  function SlideCard({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="absolute rounded-[0.4em]"
        style={{
          left: "1.8%",
          top: "3.6%",
          width: "95.8%",
          height: "93.2%",
          background: "#FFFFFF",
          border: "1px solid #E0E0E0",
        }}
      >
        {children}
      </div>
    );
  }

  function BuchempfehlungBar() {
    return (
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: "2.5%",
          top: 0,
          width: "27.5%",
          height: "8.4%",
          background: "#333333",
          borderRadius: "0 0 0.3em 0.3em",
          color: "#FFFFFF",
          fontSize: "0.55em",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif",
        }}
      >
        BUCHEMPFEHLUNG
      </div>
    );
  }

  function Ph({ text }: { text: string }) {
    return <span className="opacity-25">{text}</span>;
  }

  function renderSlidePreview(idx: number) {
    switch (idx) {
      case 0:
        return (
          <SlideFrame>
            <SlideCard>
              <div className="absolute flex items-center justify-center text-center" style={{ left: "15%", top: "10%", width: "65%", height: "35%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "1.5em", fontWeight: 700, color: "#000", lineHeight: 1.2 }}>
                {form.buchtitel || <Ph text="Buchtitel" />}
              </div>
              <div className="absolute flex items-center justify-center text-center" style={{ left: "20%", top: "43%", width: "55%", height: "12%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "0.7em", fontWeight: 700, color: "#000" }}>
                {form.untertitel || <Ph text="Untertitel" />}
              </div>
              <div className="absolute text-center" style={{ left: "20%", top: "55%", width: "55%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "0.65em", fontWeight: 700, color: "#000" }}>
                von
              </div>
              <div className="absolute flex items-center justify-center text-center" style={{ left: "10%", top: "60%", width: "75%", height: "12%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "0.9em", fontWeight: 700, color: "#000" }}>
                {autorFull || <Ph text="Autorname" />}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DECO.buchstapel} alt="" className="absolute" style={{ left: "1%", bottom: "0%", width: "20%", height: "55%", objectFit: "contain", objectPosition: "bottom left" }} />
            </SlideCard>
            <BuchempfehlungBar />
          </SlideFrame>
        );

      case 1: {
        const infos: string[] = [];
        if (autorFull) infos.push(form.geschlecht + ": " + autorFull);
        if (form.erscheinungsjahr) infos.push("Erscheinungsjahr: " + form.erscheinungsjahr);
        if (form.genre) infos.push("Genre: " + form.genre);
        if (form.hintergrund) infos.push("Hintergrund: " + form.hintergrund);

        return (
          <SlideFrame>
            <SlideCard>
              <div className="absolute" style={{ left: "6%", top: "5%", width: "85%", fontSize: "0.85em", fontWeight: 700, color: "#000" }}>
                Allgemeine Infos
              </div>
              <div className="absolute rounded-[0.4em] p-[3%]" style={{ left: "3%", top: "18%", width: "42%", height: "75%", border: "1px solid #DDD", background: "#FAFAFA" }}>
                <ul className="space-y-[0.3em] text-[0.42em] sm:text-[0.48em] list-none p-0 m-0">
                  {infos.length > 0 ? infos.map((t, i) => (
                    <li key={i} className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">{t}</span></li>
                  )) : (
                    <li className="opacity-25 flex gap-[0.3em]"><span>■</span> Noch keine Infos</li>
                  )}
                </ul>
              </div>
              <div className="absolute flex items-center justify-center" style={{ right: "5%", top: "10%", width: "28%", height: "78%" }}>
                {coverImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImg} alt="" className="max-h-full max-w-full rounded shadow object-contain" />
                ) : (
                  <div className="w-full h-[70%] rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[0.4em]">Cover</div>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DECO.offenesBuch} alt="" className="absolute" style={{ left: "3%", bottom: "2%", width: "24%", objectFit: "contain" }} />
            </SlideCard>
            <BuchempfehlungBar />
          </SlideFrame>
        );
      }

      case 2: {
        const boxes = [
          { label: "Hauptfigur", value: form.hauptfigur },
          { label: "Thema", value: form.thema },
          { label: "Inhalte", value: form.inhalte },
          { label: "Schwerpunkt", value: form.schwerpunkt },
        ];
        return (
          <SlideFrame>
            <SlideCard>
              <div className="absolute" style={{ left: "4%", top: "4%", width: "85%", fontSize: "0.85em", fontWeight: 700, color: "#000" }}>
                Worum geht&apos;s?
              </div>
              <div className="absolute grid grid-cols-2 gap-[2%]" style={{ left: "3%", top: "17%", width: "73%", height: "78%" }}>
                {boxes.map((b, i) => (
                  <div key={i} className="rounded-[0.4em] flex items-center justify-center text-center p-[6%]" style={{ background: "#FAFAFA", border: "1px solid #B2B2B2" }}>
                    <p className="text-[0.42em] sm:text-[0.48em] font-bold leading-snug">
                      {b.value ? (b.label + ": " + b.value) : <Ph text={b.label} />}
                    </p>
                  </div>
                ))}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DECO.fliegendeBuecher} alt="" className="absolute" style={{ right: "2%", top: "25%", width: "16%", height: "58%", objectFit: "contain" }} />
            </SlideCard>
            <BuchempfehlungBar />
          </SlideFrame>
        );
      }

      case 3: {
        const items: string[] = [];
        if (autorFull) items.push(autorFull);
        if (form.autorHerkunft) items.push(form.autorHerkunft);
        if (form.autorBeruf) items.push(form.autorBeruf);
        if (form.autorStil) items.push("Stil: " + form.autorStil);

        return (
          <SlideFrame>
            <SlideCard>
              <div className="absolute" style={{ left: "5%", top: "6%", width: "85%", fontSize: "0.85em", fontWeight: 700, color: "#000" }}>
                {"Über " + (form.geschlecht === "Autor" ? "den Autor" : "die Autorin")}
              </div>
              <div className="absolute rounded-[0.4em] p-[3%]" style={{ left: "3%", top: "18%", width: "50%", height: "75%", border: "1px solid #DDD", background: "#FAFAFA" }}>
                <ul className="space-y-[0.3em] text-[0.42em] sm:text-[0.48em] list-none p-0 m-0">
                  {items.length > 0 ? items.map((t, i) => (
                    <li key={i} className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">{t}</span></li>
                  )) : (
                    <li className="opacity-25 flex gap-[0.3em]"><span>■</span> Noch keine Angaben</li>
                  )}
                </ul>
              </div>
              <div className="absolute flex items-center justify-center" style={{ right: "5%", top: "12%", width: "32%", height: "62%" }}>
                {autorImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={autorImg} alt="" className="max-h-full max-w-full rounded shadow object-contain" />
                ) : (
                  <div className="w-full h-[70%] rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[0.4em]">Autorenfoto</div>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DECO.buchLaptop} alt="" className="absolute" style={{ left: "3%", bottom: "2%", width: "23%", objectFit: "contain" }} />
            </SlideCard>
            <BuchempfehlungBar />
          </SlideFrame>
        );
      }

      case 4: {
        const bullets = form.zusammenfassung.filter((b) => b.trim());
        return (
          <SlideFrame>
            <SlideCard>
              <div className="absolute" style={{ left: "5%", top: "5%", width: "85%", fontSize: "0.85em", fontWeight: 700, color: "#000" }}>
                Zusammenfassung
              </div>
              <div className="absolute rounded-[0.4em] p-[3%]" style={{ left: "3%", top: "16%", width: "50%", height: "78%", border: "1px solid #DDD", background: "#FAFAFA" }}>
                <ul className="space-y-[0.3em] text-[0.42em] sm:text-[0.48em] list-none p-0 m-0">
                  {bullets.length > 0 ? bullets.map((t, i) => (
                    <li key={i} className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">{t}</span></li>
                  )) : (
                    <li className="opacity-25 flex gap-[0.3em]"><span>■</span> Stichpunkte</li>
                  )}
                </ul>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DECO.buecherregal} alt="" className="absolute" style={{ right: "3%", top: "28%", width: "38%", height: "55%", objectFit: "contain" }} />
            </SlideCard>
            <BuchempfehlungBar />
          </SlideFrame>
        );
      }

      default:
        return null;
    }
  }

  /* ═══ SHORTS SLIDE PREVIEW (Portrait 9:16) ═══ */

  function ShortsSlideFrame({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="relative w-full aspect-[9/16] rounded-lg overflow-hidden select-none"
        style={{ background: "#F8F8F8", fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif" }}
      >
        {children}
      </div>
    );
  }

  function ShortsBuchempfehlungBar() {
    return (
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          width: "50%",
          height: "4.5%",
          background: "#333333",
          borderRadius: "0 0 0.3em 0.3em",
          color: "#FFFFFF",
          fontSize: "0.45em",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif",
        }}
      >
        BUCHEMPFEHLUNG
      </div>
    );
  }

  function renderShortsSlidePreview(idx: number) {
    switch (idx) {
      case 0:
        return (
          <ShortsSlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute flex items-center justify-center text-center" style={{ left: "10%", top: "15%", width: "80%", height: "25%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "1.1em", fontWeight: 700, color: "#000", lineHeight: 1.2 }}>
                {form.buchtitel || <Ph text="Buchtitel" />}
              </div>
              <div className="absolute flex items-center justify-center text-center" style={{ left: "15%", top: "38%", width: "70%", height: "8%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "0.55em", fontWeight: 700, color: "#000" }}>
                {form.untertitel || <Ph text="Untertitel" />}
              </div>
              <div className="absolute text-center" style={{ left: "20%", top: "46%", width: "60%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "0.5em", fontWeight: 700, color: "#000" }}>
                von
              </div>
              <div className="absolute flex items-center justify-center text-center" style={{ left: "10%", top: "50%", width: "80%", height: "8%", fontFamily: "'Cinzel', 'Book Antiqua', Georgia, serif", fontSize: "0.7em", fontWeight: 700, color: "#000" }}>
                {autorFull || <Ph text="Autorname" />}
              </div>
            </div>
            <ShortsBuchempfehlungBar />
          </ShortsSlideFrame>
        );

      case 1: {
        const infos: string[] = [];
        if (autorFull) infos.push(form.geschlecht + ": " + autorFull);
        if (form.erscheinungsjahr) infos.push("Erscheinungsjahr: " + form.erscheinungsjahr);
        if (form.genre) infos.push("Genre: " + form.genre);
        if (form.hintergrund) infos.push("Hintergrund: " + form.hintergrund);

        return (
          <ShortsSlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "5%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#000" }}>
                Allgemeine Infos
              </div>
              <div className="absolute" style={{ left: "6%", top: "10%", width: "88%", fontSize: "0.5em", fontWeight: 700, color: "#000" }}>
                {form.buchtitel || <Ph text="Buchtitel" />}
              </div>
              <div className="absolute flex items-center justify-center" style={{ left: "15%", top: "16%", width: "70%", height: "30%" }}>
                {coverImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImg} alt="" className="max-h-full max-w-full rounded shadow object-contain" />
                ) : (
                  <div className="w-[60%] h-[80%] rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[0.35em]">Cover</div>
                )}
              </div>
              <div className="absolute rounded-[0.3em] p-[3%]" style={{ left: "6%", top: "48%", width: "88%", height: "44%", border: "1px solid #DDD", background: "#FAFAFA" }}>
                <ul className="space-y-[0.25em] text-[0.32em] sm:text-[0.38em] list-none p-0 m-0">
                  {infos.length > 0 ? infos.map((t, i) => (
                    <li key={i} className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">{t}</span></li>
                  )) : (
                    <li className="opacity-25 flex gap-[0.3em]"><span>■</span> Noch keine Infos</li>
                  )}
                  {form.verlag && <li className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">Verlag: {form.verlag}</span></li>}
                </ul>
              </div>
            </div>
            <ShortsBuchempfehlungBar />
          </ShortsSlideFrame>
        );
      }

      case 2: {
        const boxes = [
          { label: "Hauptfigur", value: form.hauptfigur },
          { label: "Thema", value: form.thema },
          { label: "Inhalte", value: form.inhalte },
          { label: "Schwerpunkt", value: form.schwerpunkt },
        ];
        return (
          <ShortsSlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "4%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#000" }}>
                Worum geht&apos;s?
              </div>
              <div className="absolute grid grid-rows-4 gap-[2%]" style={{ left: "6%", top: "10%", width: "88%", height: "85%" }}>
                {boxes.map((b, i) => (
                  <div key={i} className="rounded-[0.3em] flex items-center justify-center text-center p-[4%]" style={{ background: "#FAFAFA", border: "1px solid #B2B2B2" }}>
                    <p className="text-[0.32em] sm:text-[0.38em] font-bold leading-snug">
                      {b.value ? (b.label + ": " + b.value) : <Ph text={b.label} />}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <ShortsBuchempfehlungBar />
          </ShortsSlideFrame>
        );
      }

      case 3: {
        const items: string[] = [];
        if (autorFull) items.push(autorFull);
        if (form.autorHerkunft) items.push(form.autorHerkunft);
        if (form.autorBeruf) items.push(form.autorBeruf);
        if (form.autorStil) items.push("Stil: " + form.autorStil);

        return (
          <ShortsSlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "4%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#000" }}>
                {"Über " + (form.geschlecht === "Autor" ? "den Autor" : "die Autorin")}
              </div>
              <div className="absolute flex items-center justify-center" style={{ left: "15%", top: "10%", width: "70%", height: "35%" }}>
                {autorImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={autorImg} alt="" className="max-h-full max-w-full rounded shadow object-contain" />
                ) : (
                  <div className="w-[50%] h-[70%] rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[0.35em]">Autorenfoto</div>
                )}
              </div>
              <div className="absolute rounded-[0.3em] p-[3%]" style={{ left: "6%", top: "48%", width: "88%", height: "44%", border: "1px solid #DDD", background: "#FAFAFA" }}>
                <ul className="space-y-[0.25em] text-[0.32em] sm:text-[0.38em] list-none p-0 m-0">
                  {items.length > 0 ? items.map((t, i) => (
                    <li key={i} className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">{t}</span></li>
                  )) : (
                    <li className="opacity-25 flex gap-[0.3em]"><span>■</span> Noch keine Angaben</li>
                  )}
                </ul>
              </div>
            </div>
            <ShortsBuchempfehlungBar />
          </ShortsSlideFrame>
        );
      }

      case 4: {
        const bullets = form.zusammenfassung.filter((b) => b.trim());
        return (
          <ShortsSlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "4%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#000" }}>
                Zusammenfassung
              </div>
              <div className="absolute rounded-[0.3em] p-[3%]" style={{ left: "6%", top: "10%", width: "88%", height: "85%", border: "1px solid #DDD", background: "#FAFAFA" }}>
                <ul className="space-y-[0.25em] text-[0.32em] sm:text-[0.38em] list-none p-0 m-0">
                  {bullets.length > 0 ? bullets.map((t, i) => (
                    <li key={i} className="flex gap-[0.3em]"><span className="shrink-0 text-gray-400">■</span><span className="font-bold">{t}</span></li>
                  )) : (
                    <li className="opacity-25 flex gap-[0.3em]"><span>■</span> Stichpunkte</li>
                  )}
                </ul>
              </div>
            </div>
            <ShortsBuchempfehlungBar />
          </ShortsSlideFrame>
        );
      }

      default:
        return null;
    }
  }

  /* ═══ PPTX GENERATION ═══ */

  async function buildPptxBlob(): Promise<Blob> {
    const JSZip = (await import("jszip")).default;

    /* 1. Load template */
    const response = await fetch("/Buchempfehlung_vorlage.pptx");
    if (!response.ok) throw new Error("Vorlage-Template konnte nicht geladen werden (HTTP " + response.status + ")");
    const zip = await JSZip.loadAsync(await response.arrayBuffer());

      const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";

      /* 2. Helper: replace paragraph text in slide XML */
      function replaceParagraphTexts(
        xml: string,
        replacements: [string, string][],
      ): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        const paragraphs = doc.getElementsByTagNameNS(A_NS, "p");

        for (const para of Array.from(paragraphs)) {
          const runs = para.getElementsByTagNameNS(A_NS, "r");
          if (runs.length === 0) continue;

          let fullText = "";
          const tElements: Element[] = [];
          for (const run of Array.from(runs)) {
            const t = run.getElementsByTagNameNS(A_NS, "t")[0];
            if (t) {
              fullText += t.textContent || "";
              tElements.push(t);
            }
          }

          const leading = fullText.match(/^(\s*)/)?.[1] || "";
          const trimmed = fullText.trim();
          for (const [oldText, newText] of replacements) {
            if (trimmed === oldText) {
              if (tElements.length > 0) {
                tElements[0].textContent = leading + newText;
                for (let i = 1; i < tElements.length; i++) {
                  tElements[i].textContent = "";
                }
              }
              break;
            }
          }
        }

        return new XMLSerializer().serializeToString(doc);
      }

      /* 3. Helper: replace variable-count bullet paragraphs in a text body */
      function replaceBulletParagraphs(
        xml: string,
        firstBulletText: string,
        newTexts: string[],
      ): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        const paragraphs = doc.getElementsByTagNameNS(A_NS, "p");

        let targetBody: Element | null = null;
        let templatePara: Element | null = null;

        for (const para of Array.from(paragraphs)) {
          const runs = para.getElementsByTagNameNS(A_NS, "r");
          let text = "";
          for (const run of Array.from(runs)) {
            const t = run.getElementsByTagNameNS(A_NS, "t")[0];
            if (t) text += t.textContent || "";
          }
          if (text.trim() === firstBulletText) {
            templatePara = para;
            targetBody = para.parentElement;
            break;
          }
        }

        if (!targetBody || !templatePara) return xml;

        /* collect all <a:p> siblings in the same body */
        const bodyParas: Element[] = [];
        for (const child of Array.from(targetBody.children)) {
          if (child.localName === "p" && child.namespaceURI === A_NS) {
            bodyParas.push(child);
          }
        }

        /* remove all bullet paragraphs except template */
        for (const p of bodyParas) {
          if (p !== templatePara) targetBody.removeChild(p);
        }

        /* set text on template paragraph */
        setParaText(templatePara, newTexts[0] || "", A_NS);

        /* clone for remaining bullets */
        for (let i = 1; i < newTexts.length; i++) {
          const clone = templatePara.cloneNode(true) as Element;
          setParaText(clone, newTexts[i], A_NS);
          targetBody.appendChild(clone);
        }

        return new XMLSerializer().serializeToString(doc);
      }

      function setParaText(para: Element, text: string, ns: string): void {
        const runs = para.getElementsByTagNameNS(ns, "r");
        if (runs.length > 0) {
          const t = runs[0].getElementsByTagNameNS(ns, "t")[0];
          if (t) t.textContent = text;
          for (let i = runs.length - 1; i > 0; i--) {
            runs[i].parentElement?.removeChild(runs[i]);
          }
        }
      }

      /* 4. Helper: replace notes slide text */
      function replaceNotesText(xml: string, newNotes: string): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        const bodies = doc.getElementsByTagNameNS(A_NS, "txBody");

        for (const body of Array.from(bodies)) {
          const paras = body.getElementsByTagNameNS(A_NS, "p");
          let bodyText = "";
          for (const p of Array.from(paras)) bodyText += p.textContent || "";
          if (bodyText.trim().length > 5) {
            /* this is the notes body */
            const first = paras[0];
            const runs = first.getElementsByTagNameNS(A_NS, "r");
            if (runs.length > 0) {
              const t = runs[0].getElementsByTagNameNS(A_NS, "t")[0];
              if (t) t.textContent = newNotes;
              for (let i = runs.length - 1; i > 0; i--) {
                runs[i].parentElement?.removeChild(runs[i]);
              }
            }
            for (let i = paras.length - 1; i > 0; i--) {
              body.removeChild(paras[i]);
            }
            break;
          }
        }

        return new XMLSerializer().serializeToString(doc);
      }

      /* ────── Slide 1: Titelfolie ────── */
      let s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
      s1 = replaceParagraphTexts(s1, [
        ["Hüter in Ausbildung", form.buchtitel],
        ["Eine Episode endet. Eine neue beginnt.", form.untertitel],
        ["Martina Zöchinger", autorFull],
      ]);
      zip.file("ppt/slides/slide1.xml", s1);

      /* ────── Slide 2: Allgemeine Infos ────── */
      const coverDesignText = form.coverDesign
        ? "Coverdesign: " + form.coverDesign
        : form.geschlecht + " & Coverdesign: " + autorFull;

      let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
      s2 = replaceParagraphTexts(s2, [
        ["Autorin: Martina Zöchinger", form.geschlecht + ": " + autorFull],
        ["Erscheinungsjahr: 2025", "Erscheinungsjahr: " + form.erscheinungsjahr],
        ["Genre: Fantasy, Spiritualität", "Genre: " + form.genre],
        ["Hintergrund: basiert auf einer wahren Begebenheit", "Hintergrund: " + form.hintergrund],
        ["Hüter - Die Ausbildung beginnt", form.buchtitel],
        ["Autorin & Coverdesign: Martina Zöchinger", coverDesignText],
        ["Verlag: Independently published", "Verlag: " + form.verlag],
      ]);
      zip.file("ppt/slides/slide2.xml", s2);

      /* ────── Slide 3: Worum geht's? ────── */
      let s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
      s3 = replaceParagraphTexts(s3, [
        ["Hauptfigur: ein Verstorbener auf dem Weg zum Hüter", "Hauptfigur: " + form.hauptfigur],
        ["Thema: Tod & Jenseits", "Thema: " + form.thema],
        ["Inhalte: Wahrheitssuche, Prüfungen", "Inhalte: " + form.inhalte],
        ["Schwerpunkt: Trauerbewältigung, Leben nach dem Tod", "Schwerpunkt: " + form.schwerpunkt],
      ]);
      zip.file("ppt/slides/slide3.xml", s3);

      /* ────── Slide 4: Über den Autor ────── */
      let s4 = await zip.file("ppt/slides/slide4.xml")!.async("string");
      s4 = replaceParagraphTexts(s4, [
        ["Über die Autorin", "Über " + (form.geschlecht === "Autor" ? "den Autor" : "die Autorin")],
        ["Martina Zöchinger", autorFull],
        ["Österreich, Steiermark", form.autorHerkunft],
        ["Mutter, Medienfachfrau, Mentaltrainerin", form.autorBeruf],
        ["Stil: authentisch, autobiografisch", "Stil: " + form.autorStil],
      ]);
      zip.file("ppt/slides/slide4.xml", s4);

      /* ────── Slide 5: Zusammenfassung ────── */
      const bullets = form.zusammenfassung.filter((b) => b.trim());
      const templateBullets = [
        "Hüter in Ausbildung",
        "Fantasieroman",
        "Nach einer wahren Begebenheit",
        "Trauerbewältigung",
        "Emotional berührend",
        "Spannend",
      ];
      let s5 = await zip.file("ppt/slides/slide5.xml")!.async("string");
      s5 = replaceBulletParagraphs(s5, templateBullets[0], bullets.length > 0 ? bullets : [""]);
      zip.file("ppt/slides/slide5.xml", s5);
      zip.file("ppt/slides/slide5.xml", s5);

      /* ────── Replace images ────── */
      if (coverImg) {
        zip.file("ppt/media/image3.jpeg", dataUrlToBlob(coverImg));
      }
      if (autorImg) {
        zip.file("ppt/media/image6.jpeg", dataUrlToBlob(autorImg));
      }

      /* ────── Replace notes ────── */
      const notesMap: [string, string][] = [
        ["ppt/notesSlides/notesSlide1.xml", form.notes1],
        ["ppt/notesSlides/notesSlide2.xml", form.notes2],
        ["ppt/notesSlides/notesSlide3.xml", form.notes3],
        ["ppt/notesSlides/notesSlide4.xml", form.notes4],
        ["ppt/notesSlides/notesSlide5.xml", form.notes5],
      ];
      for (const [path, notes] of notesMap) {
        if (notes && zip.file(path)) {
          let xml = await zip.file(path)!.async("string");
          xml = replaceNotesText(xml, notes);
          zip.file(path, xml);
        }
      }

      /* ────── Return blob ────── */
      return await zip.generateAsync({ type: "blob" });
  }

  async function buildShortsPptxBlob(): Promise<Blob> {
    const JSZip = (await import("jszip")).default;

    const response = await fetch("/Shorts.pptx");
    if (!response.ok) throw new Error("Shorts-Template konnte nicht geladen werden (HTTP " + response.status + ")");
    const zip = await JSZip.loadAsync(await response.arrayBuffer());

    const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";

    function replacePlaceholders(xml: string, replacements: [string, string][]): string {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const paragraphs = doc.getElementsByTagNameNS(A_NS, "p");

      for (const para of Array.from(paragraphs)) {
        const runs = para.getElementsByTagNameNS(A_NS, "r");
        if (runs.length === 0) continue;

        let fullText = "";
        const tElements: Element[] = [];
        for (const run of Array.from(runs)) {
          const t = run.getElementsByTagNameNS(A_NS, "t")[0];
          if (t) {
            fullText += t.textContent || "";
            tElements.push(t);
          }
        }

        const trimmed = fullText.trim();
        for (const [oldText, newText] of replacements) {
          if (trimmed === oldText) {
            if (tElements.length > 0) {
              tElements[0].textContent = newText;
              for (let i = 1; i < tElements.length; i++) {
                tElements[i].textContent = "";
              }
            }
            break;
          }
        }
      }

      return new XMLSerializer().serializeToString(doc);
    }

    function replaceNotesText(xml: string, newNotes: string): string {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const bodies = doc.getElementsByTagNameNS(A_NS, "txBody");

      for (const body of Array.from(bodies)) {
        const paras = body.getElementsByTagNameNS(A_NS, "p");
        let bodyText = "";
        for (const p of Array.from(paras)) bodyText += p.textContent || "";
        if (bodyText.trim().length > 5) {
          const first = paras[0];
          const runs = first.getElementsByTagNameNS(A_NS, "r");
          if (runs.length > 0) {
            const t = runs[0].getElementsByTagNameNS(A_NS, "t")[0];
            if (t) t.textContent = newNotes;
            for (let i = runs.length - 1; i > 0; i--) {
              runs[i].parentElement?.removeChild(runs[i]);
            }
          }
          for (let i = paras.length - 1; i > 0; i--) {
            body.removeChild(paras[i]);
          }
          break;
        }
      }

      return new XMLSerializer().serializeToString(doc);
    }

    /* ────── Slide 1: Titelfolie ────── */
    let s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
    s1 = replacePlaceholders(s1, [
      ["#Titel", form.buchtitel],
      ["#Untertitel", form.untertitel],
      ["#Autor", autorFull],
    ]);
    zip.file("ppt/slides/slide1.xml", s1);

    /* ────── Slide 2: Allgemeine Infos ────── */
    let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
    s2 = replacePlaceholders(s2, [
      ["#1", form.geschlecht + ": " + autorFull],
      ["#2", "Erscheinungsjahr: " + form.erscheinungsjahr],
      ["#3", "Genre: " + form.genre],
      ["#4", "Hintergrund: " + form.hintergrund],
      ["#Titel", form.buchtitel],
      ["Cover: #Cover", "Cover: " + (form.coverDesign || autorFull)],
      ["#Verlag", form.verlag],
      ["Verlag: #Verlag", "Verlag: " + form.verlag],
    ]);
    zip.file("ppt/slides/slide2.xml", s2);

    /* ────── Slide 3: Worum geht's? ────── */
    let s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
    s3 = replacePlaceholders(s3, [
      ["#1", "Hauptfigur: " + form.hauptfigur],
      ["#2", "Thema: " + form.thema],
      ["#3", "Inhalte: " + form.inhalte],
      ["#4", "Schwerpunkt: " + form.schwerpunkt],
    ]);
    zip.file("ppt/slides/slide3.xml", s3);

    /* ────── Slide 4: Über den Autor ────── */
    let s4 = await zip.file("ppt/slides/slide4.xml")!.async("string");
    s4 = replacePlaceholders(s4, [
      ["Über die Autorin", "Über " + (form.geschlecht === "Autor" ? "den Autor" : "die Autorin")],
      ["#1", autorFull],
      ["#2", form.autorHerkunft],
      ["#3", form.autorBeruf],
      ["#4", "Stil: " + form.autorStil],
    ]);
    zip.file("ppt/slides/slide4.xml", s4);

    /* ────── Slide 5: Zusammenfassung ────── */
    const bullets = form.zusammenfassung.filter((b) => b.trim());
    const s5replacements: [string, string][] = [];
    for (let i = 0; i < 5; i++) {
      s5replacements.push([`#${i + 1}`, bullets[i] || ""]);
    }
    let s5 = await zip.file("ppt/slides/slide5.xml")!.async("string");
    s5 = replacePlaceholders(s5, s5replacements);
    zip.file("ppt/slides/slide5.xml", s5);

    /* ────── Replace images ────── */
    if (coverImg) {
      zip.file("ppt/media/image3.jpeg", dataUrlToBlob(coverImg));
    }
    if (autorImg) {
      zip.file("ppt/media/image5.jpeg", dataUrlToBlob(autorImg));
    }

    /* ────── Replace notes ────── */
    const notesMap: [string, string][] = [
      ["ppt/notesSlides/notesSlide1.xml", form.notes1],
      ["ppt/notesSlides/notesSlide2.xml", form.notes2],
      ["ppt/notesSlides/notesSlide3.xml", form.notes3],
      ["ppt/notesSlides/notesSlide4.xml", form.notes4],
      ["ppt/notesSlides/notesSlide5.xml", form.notes5],
    ];
    for (const [path, notes] of notesMap) {
      if (notes && zip.file(path)) {
        let xml = await zip.file(path)!.async("string");
        xml = replaceNotesText(xml, notes);
        zip.file(path, xml);
      }
    }

    return await zip.generateAsync({ type: "blob" });
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function generatePptx(format: "querformat" | "hochformat") {
    setError("");
    if (!form.buchtitel.trim() || !form.autorName.trim()) {
      setError("Buchtitel und Autorname sind Pflichtfelder.");
      return;
    }
    setGenerating(true);
    try {
      const safeTitel = form.buchtitel
        .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      const safeAutor = autorFull
        .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 40);

      if (format === "querformat") {
        const blob = await buildPptxBlob();
        triggerDownload(blob, `${safeTitel}_von_${safeAutor}.pptx`);
      } else {
        const blob = await buildShortsPptxBlob();
        triggerDownload(blob, `${safeTitel}_von_${safeAutor}_short.pptx`);
      }
    } catch (err) {
      console.error(err);
      setError(
        "Fehler beim Erstellen der Datei: " +
          (err instanceof Error ? err.message : "Unbekannter Fehler"),
      );
    } finally {
      setGenerating(false);
    }
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  async function submitVorlage() {
    setError("");
    setSuccessMsg("");
    if (!form.buchtitel.trim() || !form.autorName.trim()) {
      showError("Buchtitel und Autorname sind Pflichtfelder.");
      return;
    }
    if (submissionId) {
      showError("Diese Vorlage wurde bereits eingereicht.");
      return;
    }

    setSubmitting(true);
    try {
      // Auto-save if not yet saved
      let currentId = savedId;
      const payload = { ...form, coverImg, autorImg };
      if (!currentId) {
        const saveRes = await fetch("/api/bucharena/vorlagen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!saveRes.ok) {
          showError("Fehler beim Speichern (HTTP " + saveRes.status + ")");
          return;
        }
        const saveData = await saveRes.json();
        if (!saveData.success) {
          showError(saveData.error || "Fehler beim Speichern");
          return;
        }
        currentId = saveData.id;
        setSavedId(currentId);
      } else {
        // Save latest changes
        const putRes = await fetch(`/api/bucharena/vorlagen/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!putRes.ok) {
          showError("Fehler beim Aktualisieren der Vorlage (HTTP " + putRes.status + ")");
          return;
        }
      }

      // Generate PPTX (both formats)
      const blobQuer = await buildPptxBlob();
      const blobHoch = await buildShortsPptxBlob();

      // Upload as submission
      const fd = new window.FormData();
      const safeTitel = form.buchtitel
        .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      const safeAutor = autorFull
        .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 40);
      fd.append("file", blobQuer, `${safeTitel}_von_${safeAutor}.pptx`);
      fd.append("file", blobHoch, `Shorts_${safeTitel}_von_${safeAutor}.pptx`);

      const res = await fetch(`/api/bucharena/vorlagen/${currentId}/submit`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let errMsg = "Fehler beim Einreichen (HTTP " + res.status + ")";
        try {
          const data = await res.json();
          if (data.error) errMsg = data.error;
        } catch { /* response not JSON */ }
        showError(errMsg);
        return;
      }
      const data = await res.json();
      if (!data.success) {
        showError(data.error || "Fehler beim Einreichen");
        return;
      }
      setSubmissionId(data.submissionId);
      setDirty(false);
      showSuccess("Vorlage erfolgreich eingereicht! 🎉");
      loadVorlagen();
      loadSubmissions();
    } catch (err) {
      console.error("Submit-Fehler:", err);
      showError("Fehler beim Einreichen: " + (err instanceof Error ? err.message : "Unbekannter Fehler"));
    } finally {
      setSubmitting(false);
    }
  }

  async function withdrawSubmission(vorlageId?: string) {
    const targetId = vorlageId || savedId;
    if (!targetId) return;
    if (!confirm("Einreichung wirklich zurückziehen?")) return;
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bucharena/vorlagen/${targetId}/submit`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Fehler beim Zurückziehen");
        return;
      }
      if (!vorlageId || vorlageId === savedId) setSubmissionId(null);
      setSuccessMsg("Einreichung wurde zurückgezogen.");
      loadVorlagen();
      loadSubmissions();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Zurückziehen: " + (err instanceof Error ? err.message : "Unbekannter Fehler"));
    } finally {
      setSubmitting(false);
    }
  }

    /* ═══ AUTH GUARDS ═══ */

  if (!accountLoaded) {
    return (
      <main className="top-centered-main">
        <section className="card"><p className="text-arena-muted text-center">Lade …</p></section>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1 className="text-xl font-bold">Anmeldung erforderlich</h1>
          <p className="text-arena-muted text-[0.95rem]">Um eine Vorlage zu erstellen, musst du eingeloggt sein.</p>
          <div className="flex gap-3 pt-2">
            <Link href="/auth" className="btn btn-primary">Jetzt einloggen</Link>
            <Link href="/social-media" className="btn">← Zurück</Link>
          </div>
        </section>
      </main>
    );
  }

  /* ═══ FORM STEPS ═══ */

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 1 – Titelfolie</h2>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Buchtitel <span className="text-red-500">*</span></span>
              <input className={"input-base" + req(form.buchtitel)} placeholder="z. B. Hüter in Ausbildung" value={form.buchtitel} onChange={(e) => set("buchtitel", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Untertitel</span>
              <input className="input-base" placeholder="z. B. Eine Episode endet. Eine neue beginnt." value={form.untertitel} onChange={(e) => set("untertitel", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Name des Autors/der Autorin <span className="text-red-500">*</span></span>
              <input className={"input-base" + req(form.autorName)} placeholder="z. B. Martina Zöchinger" value={form.autorName} onChange={(e) => { set("autorName", e.target.value); tryPrefillAutor(e.target.value); }} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie – dieser Text wird während des Videos von den Sprechern gesprochen. Fass dich kurz: 2 bis 3 kurze Sätze sind ideal.)</span></span>
              <textarea className={"input-base" + req(form.notes1)} rows={3} placeholder="z. B. In diesem Video erzähle ich dir vom Buch Hüter in Ausbildung - Eine Episode endet. Eine neue beginnt. - von Martina Zöchinger. Du erfährst von mir die wichtigsten Informationen, ohne dass ich zu viel verrate oder spoiler." value={form.notes1} onChange={(e) => set("notes1", e.target.value)} />
            </label>
          </div>
        );

      case 1:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 2 – Allgemeine Infos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-[0.95rem]">
                <span className="font-medium">Erscheinungsjahr</span>
                <input className={"input-base" + req(form.erscheinungsjahr)} placeholder="z. B. 2025" value={form.erscheinungsjahr} onChange={(e) => set("erscheinungsjahr", e.target.value)} />
              </label>
              <label className="grid gap-1 text-[0.95rem]">
                <span className="font-medium">Genre</span>
                <input className={"input-base" + req(form.genre)} placeholder="z. B. Fantasy, Spiritualität" value={form.genre} onChange={(e) => set("genre", e.target.value)} />
              </label>
            </div>
            <div className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Geschlecht</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="geschlecht" value="Autorin" checked={form.geschlecht === "Autorin"} onChange={() => set("geschlecht", "Autorin")} />
                  <span>Autorin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="geschlecht" value="Autor" checked={form.geschlecht === "Autor"} onChange={() => set("geschlecht", "Autor")} />
                  <span>Autor</span>
                </label>
              </div>
            </div>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Verlag <span className="text-arena-muted text-sm font-normal">(oder &quot;Selfpublisher&quot;)</span></span>
              <input className={"input-base" + req(form.verlag)} placeholder="z. B. Independently published" value={form.verlag} onChange={(e) => set("verlag", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Cover-Design von</span>
              <input className="input-base" placeholder="z. B. Name des Designers" value={form.coverDesign} onChange={(e) => set("coverDesign", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Hintergrund / Besonderheit</span>
              <textarea className="input-base" rows={2} placeholder="z. B. basiert auf einer wahren Begebenheit" value={form.hintergrund} onChange={(e) => set("hintergrund", e.target.value)} />
            </label>
            <div className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Buchcover (Bild)</span>
              {coverImg ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImg} alt="Cover" className="h-28 rounded-lg border border-arena-border object-contain" />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { setCoverImg(null); setDirty(true); if (coverRef.current) coverRef.current.value = ""; }}>
                    <TrashIcon className="size-4" /> Entfernen
                  </button>
                </div>
              ) : (
                <button type="button" className="flex items-center gap-2 rounded-lg border-2 border-dashed p-4 text-arena-muted hover:border-gray-400 transition-colors cursor-pointer border-red-400" onClick={() => coverRef.current?.click()}>
                  <PhotoIcon className="size-6" /><span>Cover-Bild auswählen *</span>
                </button>
              )}
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e, setCoverImg)} />
            </div>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie – dieser Text wird während des Videos von den Sprechern gesprochen. Fass dich kurz: 2 bis 3 kurze Sätze sind ideal.)</span></span>
              <textarea className={"input-base" + req(form.notes2)} rows={3} placeholder="z. B. Das Buch wurde von Martina Zöchinger geschrieben und erschien 2025. Sie hat den Roman als Selfpublisher veröffentlicht und es gehört zum Genre Fantasy. Das Buch ist schön illustriert und verschiedene Zeichnungen stellen einzelne Szenen dar. Die Entstehungsgeschichte des Buches ist spannend: Die Autorin schrieb es in tiefer Trauer nach dem Tod ihres Vaters, um den Verlust zu verarbeiten. Sie schreibt über das Leben nach dem Tod und machte ihren Vater zum Helden der Geschichte." value={form.notes2} onChange={(e) => set("notes2", e.target.value)} />
            </label>
          </div>
        );

      case 2:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 3 – Worum geht&apos;s?</h2>
            <p className="text-arena-muted text-sm">Diese 4 Punkte werden in der Vorlage als 4 Kacheln (2×2) dargestellt.</p>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Hauptfigur</span>
              <input className={"input-base" + req(form.hauptfigur)} placeholder="z. B. ein Verstorbener auf dem Weg zum Hüter" value={form.hauptfigur} onChange={(e) => set("hauptfigur", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Thema</span>
              <input className={"input-base" + req(form.thema)} placeholder="z. B. Tod & Jenseits" value={form.thema} onChange={(e) => set("thema", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Inhalte</span>
              <textarea className={"input-base" + req(form.inhalte)} rows={2} placeholder="z. B. Wahrheitssuche, Prüfungen" value={form.inhalte} onChange={(e) => set("inhalte", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Schwerpunkt</span>
              <input className={"input-base" + req(form.schwerpunkt)} placeholder="z. B. Trauerbewältigung, Leben nach dem Tod" value={form.schwerpunkt} onChange={(e) => set("schwerpunkt", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie – dieser Text wird während des Videos von den Sprechern gesprochen. Fass dich kurz: 2 bis 3 kurze Sätze sind ideal.)</span></span>
              <textarea className={"input-base" + req(form.notes3)} rows={3} placeholder="z. B. Die Handlung dreht sich um eine Hauptfigur, die sich nach dem Tod in einer neuen Existenz wiederfindet, nachdem er gestorben ist. In dieser Geschichte mischen sich Realität, Erinnerung und Magie. Die Erzählung behandelt, wie man mit Trauer umgeht, wie sich Bewusstsein und Erkenntnis des Lebens öffnen, wenn eine Episode endet und etwas Neues beginnt." value={form.notes3} onChange={(e) => set("notes3", e.target.value)} />
            </label>
          </div>
        );

      case 3:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 4 – {form.geschlecht === "Autor" ? "Über den Autor" : "Über die Autorin"}</h2>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Herkunft / Land</span>
              <input className={"input-base" + req(form.autorHerkunft)} placeholder="z. B. Österreich, Steiermark" value={form.autorHerkunft} onChange={(e) => set("autorHerkunft", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Beruf / Beschreibung</span>
              <input className={"input-base" + req(form.autorBeruf)} placeholder="z. B. Mutter, Medienfachfrau, Mentaltrainerin" value={form.autorBeruf} onChange={(e) => set("autorBeruf", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Schreibstil</span>
              <input className={"input-base" + req(form.autorStil)} placeholder="z. B. authentisch, autobiografisch" value={form.autorStil} onChange={(e) => set("autorStil", e.target.value)} />
            </label>
            <div className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Autorenfoto</span>
              {autorImg ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={autorImg} alt="Autor" className="h-28 rounded-lg border border-arena-border object-contain" />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { setAutorImg(null); setDirty(true); if (autorRef.current) autorRef.current.value = ""; }}>
                    <TrashIcon className="size-4" /> Entfernen
                  </button>
                </div>
              ) : (
                <button type="button" className="flex items-center gap-2 rounded-lg border-2 border-dashed p-4 text-arena-muted hover:border-gray-400 transition-colors cursor-pointer border-red-400" onClick={() => autorRef.current?.click()}>
                  <PhotoIcon className="size-6" /><span>Autorenfoto auswählen *</span>
                </button>
              )}
              <input ref={autorRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e, setAutorImg)} />
            </div>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie – dieser Text wird während des Videos von den Sprechern gesprochen. Fass dich kurz: 2 bis 3 kurze Sätze sind ideal.)</span></span>
              <textarea className={"input-base" + req(form.notes4)} rows={3} placeholder="z. B. Martina Zöchinger ist eine österreichische Autorin, Medienfachfrau und Mentaltrainerin. Sie ist Mutter und hat sich schon früh mit Themen wie Bewusstsein, Leben und Spiritualität beschäftigt – sowohl beruflich als auch persönlich. Mit Hüter in Ausbildung legt sie ein Werk vor, das stark mit ihrem Leben und ihren Erfahrungen verbunden ist." value={form.notes4} onChange={(e) => set("notes4", e.target.value)} />
            </label>
          </div>
        );

      case 4:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 5 – Zusammenfassung</h2>
            <p className="text-arena-muted text-sm">Gib die 5 wichtigsten Stichpunkte für die letzte Folie ein.</p>
            {form.zusammenfassung.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-arena-muted text-sm w-5 shrink-0 text-right">{i + 1}.</span>
                <input className={"input-base flex-1" + req(b)} placeholder={"Stichpunkt " + (i + 1)} value={b} onChange={(e) => setBullet(i, e.target.value)} />
              </div>
            ))}
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie – dieser Text wird während des Videos von den Sprechern gesprochen. Fass dich kurz: 2 bis 3 kurze Sätze sind ideal.)</span></span>
              <textarea className={"input-base" + req(form.notes5)} rows={3} placeholder="z. B. Ich empfehle dir dieses Buch, weil es nicht nur Trost spendet, sondern auch Mut macht, nach Verlust und Schmerz eine neue Perspektive zu finden. Es verbindet magische Elemente mit sehr menschlichen Themen – ideal, wenn du Geschichten magst, die emotional berühren und zum Nachdenken anregen." value={form.notes5} onChange={(e) => set("notes5", e.target.value)} />
            </label>
          </div>
        );
    }
  }

  /* ═══ RENDER ═══ */

  return (
    <main className="top-centered-main overflow-x-hidden">
      <section className="card">
        <h1 className="text-xl font-bold">Vorlage online erstellen</h1>
        <p className="text-[0.95rem]">
          Fülle alle Informationen aus und reiche die Vorlage direkt ein.
        </p>

        {/* ── Toolbar: Öffnen / Speichern / Herunterladen / Einreichen ── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm" onClick={() => setShowVorlagen((v) => !v)}>
            <FolderOpenIcon className="size-4" />
            <span className="truncate">{showVorlagen ? "Ausblenden" : "Öffnen"}</span>
            {savedVorlagen.length > 0 && <span className="ml-1 rounded-full bg-arena-yellow text-arena-blue px-1.5 text-xs font-bold">{savedVorlagen.length}</span>}
          </button>
          <button type="button" className="btn btn-sm" onClick={newVorlage}>
            <PlusIcon className="size-4" /> Neu
          </button>

          <span className="hidden sm:inline text-arena-border">|</span>

          <button type="button" className="btn btn-sm" onClick={saveVorlage} disabled={saving}>
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : <CloudArrowUpIcon className="size-4" />}
            <span className="truncate">{saving ? "Speichern …" : "Speichern"}</span>
          </button>
          <button type="button" className="btn btn-sm" onClick={() => generatePptx("querformat")} disabled={generating}>
            <DocumentArrowDownIcon className="size-4" />
            <span className="hidden sm:inline">Querformat</span><span className="sm:hidden">Quer</span>
          </button>
          <button type="button" className="btn btn-sm" onClick={() => generatePptx("hochformat")} disabled={generating}>
            <DocumentArrowDownIcon className="size-4" />
            <span className="hidden sm:inline">Hochformat</span><span className="sm:hidden">Hoch</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary col-span-2 sm:col-span-1"
            onClick={() => setShowSubmitDialog(true)}
            disabled={submitting || !!submissionId}
            title={submissionId ? "Bereits eingereicht" : "PPTX generieren und bei BuchArena einreichen"}
          >
            {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PaperAirplaneIcon className="size-4" />}
            {submitting ? "Einreichen …" : submissionId ? "Eingereicht ✓" : "Einreichen"}
          </button>
          {submissionId && (
            <button
              type="button"
              className="btn btn-sm btn-danger col-span-2 sm:col-span-1"
              onClick={() => withdrawSubmission()}
              disabled={submitting}
              title="Einreichung zurückziehen"
            >
              Zurückziehen
            </button>
          )}

          {savedId && (
            <span className="text-xs text-arena-muted col-span-2 sm:col-span-1 sm:ml-auto truncate">
              <strong>{form.buchtitel || "Unbenannt"}</strong>
              {submissionId && <span className="ml-1 text-green-600">(eingereicht)</span>}
            </span>
          )}
        </div>

        {showVorlagen && (
          <div className="rounded-lg border border-arena-border bg-gray-50 p-3">
            {savedVorlagen.length === 0 ? (
              <p className="text-arena-muted text-sm">Noch keine Vorlagen gespeichert.</p>
            ) : (
              <div className="grid gap-2">
                {savedVorlagen.map((v) => (
                  <div key={v._id} className="flex items-center gap-3 rounded-lg border border-arena-border bg-white px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{v.buchtitel || "Unbenannt"}</p>
                      <p className="text-xs text-arena-muted truncate">
                        {v.autorName || "–"}
                        {" · "}
                        {new Date(v.updatedAt).toLocaleDateString("de-DE")}
                        {v.submissionId && <span className="ml-1 text-green-600">(eingereicht)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                    <button type="button" className="btn btn-sm" onClick={() => loadVorlage(v._id)}>Laden</button>
                    {v.submissionId && (
                      <button type="button" className="btn btn-sm text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => withdrawSubmission(v._id)}><span className="hidden sm:inline">Zurückziehen</span><span className="sm:hidden text-xs">✕</span></button>
                    )}
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteConfirmId(v._id)}>
                      <TrashIcon className="size-4" />
                    </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Löschen bestätigen ═══ */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <p className="font-semibold mb-2">Vorlage löschen?</p>
              <p className="text-sm text-gray-600 mb-4">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-sm" onClick={() => setDeleteConfirmId(null)}>Abbrechen</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteVorlage(deleteConfirmId)}>Löschen</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Meine Einreichungen ═══ */}
        {submissions.length > 0 && (
          <div className="rounded-lg border border-arena-border bg-gray-50 p-3">
            <p className="text-sm font-medium mb-2">Meine Einreichungen</p>
            <div className="grid gap-2">
              {submissions.map((sub) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  pending: { label: "Ausstehend", cls: "bg-yellow-100 text-yellow-800" },
                  approved: { label: "Genehmigt", cls: "bg-green-100 text-green-800" },
                  rejected: { label: "Abgelehnt", cls: "bg-red-100 text-red-800" },
                  done: { label: "Erledigt", cls: "bg-blue-100 text-blue-800" },
                };
                const st = statusMap[sub.status] || statusMap.pending;
                const linkedVorlage = savedVorlagen.find((v) => v.submissionId === sub._id);
                return (
                  <div key={sub._id} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-arena-border bg-white px-3 py-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{sub.bookTitle}</p>
                      <p className="text-xs text-arena-muted truncate">
                        von {sub.author} · {new Date(sub.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      {sub.status === "pending" && linkedVorlage && (
                        <button
                          type="button"
                          className="btn btn-sm text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => withdrawSubmission(linkedVorlage._id)}
                          disabled={submitting}
                        >
                          <span className="hidden sm:inline">Zurückziehen</span><span className="sm:hidden text-xs">✕</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {STEP_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={"shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer " + (
                isStepComplete(i)
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-gray-100 text-arena-muted border-arena-border"
              ) + (
                i === step
                  ? " ring-2 ring-arena-blue"
                  : " border"
              )}
            >
              {truncate(label, 18)}
            </button>
          ))}
        </div>

        {renderStep()}

        <div className="grid gap-2 pt-1">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-arena-muted hover:text-arena-blue transition-colors cursor-pointer w-fit"
            onClick={() => setShowPreview((v) => !v)}
          >
            <EyeIcon className="size-4" />
            {showPreview ? "Vorschau ausblenden" : "Vorschau einblenden"}
          </button>

          {showPreview && (
            <div className="grid gap-2">
              <div className="rounded-xl border border-arena-border bg-gray-50 p-2 sm:p-3">
                <div className="mx-auto flex flex-col sm:flex-row gap-3 items-start justify-center" style={{ maxWidth: 800 }}>
                  <div className="flex-1 min-w-0 w-full">
                    {renderSlidePreview(previewSlide)}
                    <p className="text-center text-[10px] text-arena-muted mt-1">Querformat</p>
                  </div>
                  <div className="w-[55%] max-w-[200px] mx-auto sm:w-[28%] sm:max-w-none sm:mx-0 shrink-0">
                    {renderShortsSlidePreview(previewSlide)}
                    <p className="text-center text-[10px] text-arena-muted mt-1">Hochformat (Shorts)</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-arena-muted">
                Folie {previewSlide + 1} von 5 –{" "}
                {["Titelfolie", "Allgemeine Infos", "Worum geht’s?", "Über den Autor", "Zusammenfassung"][previewSlide]}
              </p>
            </div>
          )}
        </div>

        <div ref={feedbackRef}>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {successMsg && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
              <CheckCircleIcon className="size-4" /> {successMsg}
            </p>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center gap-3 pt-1">
          {step > 0 && (
            <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeftIcon className="size-4" /> Zurück
            </button>
          )}

          {step < STEP_LABELS.length - 1 && (
            <button type="button" className="btn btn-primary ml-auto" onClick={() => setStep((s) => s + 1)}>
              Weiter <ChevronRightIcon className="size-4" />
            </button>
          )}
        </div>

        {!allComplete && (
          <p className="text-xs text-arena-muted">Tipp: Fülle alle Pflichtfelder aus (inkl. Bilder und Sprechertexte) für ein optimales Ergebnis.</p>
        )}

        <Link href="/social-media" className="text-arena-link text-sm no-underline hover:underline">
          ← Zurück zu Social Media
        </Link>
      </section>

      {/* ── Einreichen-Overlay ── */}
      {showSubmitDialog && (
        <div className="overlay-backdrop" onClick={() => setShowSubmitDialog(false)}>
          <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Vorlage einreichen</h2>
            <p className="text-sm text-arena-muted">Beide Formate (Querformat + Shorts) werden generiert und an die BuchArena gesendet.</p>
            {!allComplete && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                Hinweis: Nicht alle Felder sind ausgefüllt. Leere Felder erscheinen als Platzhalter in der Vorlage.
              </p>
            )}
            <GenrePicker value={form.genre} onChange={(v) => set("genre", v)} label="Genre" />
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Hinweis an die BuchArena <span className="text-arena-muted text-sm font-normal">(optional)</span></span>
              <textarea className="input-base" rows={3} placeholder="z. B. Buch wird erst im Mai veröffentlicht, bitte erst dann posten …" value={form.notiz} onChange={(e) => set("notiz", e.target.value)} />
            </label>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" className="btn" onClick={() => setShowSubmitDialog(false)}>Abbrechen</button>
              <button
                type="button"
                className="btn btn-primary ml-auto"
                disabled={submitting}
                onClick={async () => { setShowSubmitDialog(false); await submitVorlage(); }}
              >
                {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PaperAirplaneIcon className="size-4" />}
                {submitting ? "Einreichen …" : "Jetzt einreichen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
