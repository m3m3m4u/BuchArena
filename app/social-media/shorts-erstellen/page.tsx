"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import GenrePicker from "@/app/components/genre-picker";
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
  autorVorname: string;
  autorNachname: string;
  submissionId?: string;
  updatedAt: string;
}

interface FormData {
  buchtitel: string;
  untertitel: string;
  autorVorname: string;
  autorNachname: string;
  erscheinungsjahr: string;
  genre: string;
  verlag: string;
  coverDesign: string;
  hintergrund: string;
  hauptfigur: string;
  thema: string;
  inhalte: string;
  schwerpunkt: string;
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
  autorVorname: "",
  autorNachname: "",
  erscheinungsjahr: new Date().getFullYear().toString(),
  genre: "",
  verlag: "",
  coverDesign: "",
  hintergrund: "",
  hauptfigur: "",
  thema: "",
  inhalte: "",
  schwerpunkt: "",
  autorTitel: "Über die Autorin",
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
  "Worum geht's?",
  "Über den Autor",
  "Zusammenfassung",
];

export default function ShortsErstellenPage() {
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
  const [successMsg, setSuccessMsg] = useState("");
  const [step, setStep] = useState(0);
  const [showPreview, setShowPreview] = useState(true);

  const previewSlide = Math.min(step, 4);
  const [error, setError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const autorRef = useRef<HTMLInputElement>(null);

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

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setBullet(idx: number, val: string) {
    setForm((f) => {
      const arr = [...f.zusammenfassung];
      arr[idx] = val;
      return { ...f, zusammenfassung: arr };
    });
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
  }

  /* ═══ SAVE / LOAD / SUBMIT ═══ */

  const loadVorlagen = useCallback(async () => {
    try {
      const res = await fetch("/api/bucharena/vorlagen");
      const data = await res.json();
      if (data.success) setSavedVorlagen(data.vorlagen);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (account) loadVorlagen();
  }, [account, loadVorlagen]);

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
        autorVorname: v.autorVorname ?? "",
        autorNachname: v.autorNachname ?? "",
        erscheinungsjahr: v.erscheinungsjahr ?? "",
        genre: v.genre ?? "",
        verlag: v.verlag ?? "",
        coverDesign: v.coverDesign ?? "",
        hintergrund: v.hintergrund ?? "",
        hauptfigur: v.hauptfigur ?? "",
        thema: v.thema ?? "",
        inhalte: v.inhalte ?? "",
        schwerpunkt: v.schwerpunkt ?? "",
        autorTitel: v.autorTitel ?? "Über die Autorin",
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
  }

  function newVorlage() {
    setForm(INITIAL);
    setCoverImg(null);
    setAutorImg(null);
    setSavedId(null);
    setSubmissionId(null);
    setStep(0);
    setShowVorlagen(false);
    setError("");
    setSuccessMsg("");
  }

  const autorFull = `${form.autorVorname} ${form.autorNachname}`.trim();

  /* ═══ STEP COMPLETENESS ═══ */

  function isStepComplete(i: number): boolean {
    switch (i) {
      case 0: return !!form.buchtitel.trim() && !!form.autorVorname.trim() && !!form.notes1.trim();
      case 1: return !!form.erscheinungsjahr.trim() && !!form.genre.trim() && !!form.verlag.trim() && !!coverImg && !!form.notes2.trim();
      case 2: return !!form.hauptfigur.trim() && !!form.thema.trim() && !!form.inhalte.trim() && !!form.schwerpunkt.trim() && !!form.notes3.trim();
      case 3: return !!form.autorTitel.trim() && !!form.autorHerkunft.trim() && !!form.autorBeruf.trim() && !!form.autorStil.trim() && !!autorImg && !!form.notes4.trim();
      case 4: return form.zusammenfassung.filter((b) => b.trim()).length >= 2 && !!form.notes5.trim();
      default: return false;
    }
  }

  const allComplete = [0, 1, 2, 3, 4].every(isStepComplete);

  function req(value: string): string {
    return value.trim() ? "" : " !border-red-400";
  }

  /* ═══ SLIDE PREVIEW (Portrait 9:16) ═══ */

  function SlideFrame({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="relative w-full aspect-[9/16] rounded-lg overflow-hidden select-none"
        style={{ background: "#F8F8F8", fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif" }}
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

  function Ph({ text }: { text: string }) {
    return <span className="opacity-25">{text}</span>;
  }

  function renderSlidePreview(idx: number) {
    switch (idx) {
      case 0:
        return (
          <SlideFrame>
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
            <BuchempfehlungBar />
          </SlideFrame>
        );

      case 1: {
        const infos: string[] = [];
        if (autorFull) infos.push("Autorin: " + autorFull);
        if (form.erscheinungsjahr) infos.push("Erscheinungsjahr: " + form.erscheinungsjahr);
        if (form.genre) infos.push("Genre: " + form.genre);
        if (form.hintergrund) infos.push("Hintergrund: " + form.hintergrund);

        return (
          <SlideFrame>
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
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "4%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#000" }}>
                {form.autorTitel || "Über die Autorin"}
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
            <BuchempfehlungBar />
          </SlideFrame>
        );
      }

      case 4: {
        const bullets = form.zusammenfassung.filter((b) => b.trim());
        return (
          <SlideFrame>
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
            <BuchempfehlungBar />
          </SlideFrame>
        );
      }

      default:
        return null;
    }
  }

  /* ═══ PPTX GENERATION (Shorts template) ═══ */

  async function buildPptxBlob(): Promise<Blob> {
    const JSZip = (await import("jszip")).default;

    const response = await fetch("/Shorts.pptx");
    const zip = await JSZip.loadAsync(await response.arrayBuffer());

    const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";

    /** Replace #placeholder texts in slide XML */
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

    /** Replace notes slide text */
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
    const coverDesignText = form.coverDesign
      ? " Cover: " + form.coverDesign
      : " Autorin & Coverdesign: " + autorFull;

    let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
    s2 = replacePlaceholders(s2, [
      ["#1", "Autorin: " + autorFull],
      ["#2", "Erscheinungsjahr: " + form.erscheinungsjahr],
      ["#3", "Genre: " + form.genre],
      ["#4", "Hintergrund: " + form.hintergrund],
      ["#Titel", form.buchtitel],
      ["Cover: #Cover", "Cover: " + (form.coverDesign || autorFull)],
      ["#Verlag", form.verlag],
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
      ["Über die Autorin", form.autorTitel || "Über die Autorin"],
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

  async function generatePptx() {
    setError("");
    if (!form.buchtitel.trim() || !form.autorVorname.trim()) {
      setError("Buchtitel und Autor-Vorname sind Pflichtfelder.");
      return;
    }
    setGenerating(true);
    try {
      const blob = await buildPptxBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = form.buchtitel
        .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      a.download = `Shorts_${safeName}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

  async function submitVorlage() {
    setError("");
    setSuccessMsg("");
    if (!form.buchtitel.trim() || !form.autorVorname.trim()) {
      setError("Buchtitel und Autor-Vorname sind Pflichtfelder.");
      return;
    }

    if (!savedId) {
      setError("Bitte speichere die Vorlage zuerst, bevor du sie einreichst.");
      return;
    }
    if (submissionId) {
      setError("Diese Vorlage wurde bereits eingereicht.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, coverImg, autorImg };
      await fetch(`/api/bucharena/vorlagen/${savedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const blob = await buildPptxBlob();

      const fd = new window.FormData();
      const safeName = form.buchtitel
        .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      fd.append("file", blob, `Shorts_${safeName}.pptx`);

      const res = await fetch(`/api/bucharena/vorlagen/${savedId}/submit`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Fehler beim Einreichen");
        return;
      }
      setSubmissionId(data.submissionId);
      setSuccessMsg("Shorts-Vorlage erfolgreich eingereicht! 🎉");
      loadVorlagen();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Einreichen: " + (err instanceof Error ? err.message : "Unbekannter Fehler"));
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
          <p className="text-arena-muted text-[0.95rem]">Um eine Shorts-Vorlage zu erstellen, musst du eingeloggt sein.</p>
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
              <input className={"input-base" + req(form.buchtitel)} placeholder="z.&nbsp;B. Hüter in Ausbildung" value={form.buchtitel} onChange={(e) => set("buchtitel", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Untertitel</span>
              <input className="input-base" placeholder="z.&nbsp;B. Eine Episode endet. Eine neue beginnt." value={form.untertitel} onChange={(e) => set("untertitel", e.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-[0.95rem]">
                <span className="font-medium">Vorname des Autors/der Autorin <span className="text-red-500">*</span></span>
                <input className={"input-base" + req(form.autorVorname)} placeholder="z.&nbsp;B. Martina" value={form.autorVorname} onChange={(e) => set("autorVorname", e.target.value)} />
              </label>
              <label className="grid gap-1 text-[0.95rem]">
                <span className="font-medium">Nachname</span>
                <input className="input-base" placeholder="z.&nbsp;B. Zöchinger" value={form.autorNachname} onChange={(e) => set("autorNachname", e.target.value)} />
              </label>
            </div>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie)</span></span>
              <textarea className={"input-base" + req(form.notes1)} rows={3} placeholder="z.&nbsp;B. Willkommen zu unserer Buchempfehlung! Heute möchte ich euch ein ganz besonderes Buch vorstellen." value={form.notes1} onChange={(e) => set("notes1", e.target.value)} />
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
                <input className={"input-base" + req(form.erscheinungsjahr)} placeholder="z.&nbsp;B. 2025" value={form.erscheinungsjahr} onChange={(e) => set("erscheinungsjahr", e.target.value)} />
              </label>
              <GenrePicker compact value={form.genre} onChange={(v) => set("genre", v)} />
            </div>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Verlag <span className="text-arena-muted text-sm font-normal">(oder &quot;Selfpublisher&quot;)</span></span>
              <input className={"input-base" + req(form.verlag)} placeholder="z.&nbsp;B. Independently published" value={form.verlag} onChange={(e) => set("verlag", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Cover-Design von</span>
              <input className="input-base" placeholder="z.&nbsp;B. Name des Designers" value={form.coverDesign} onChange={(e) => set("coverDesign", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Hintergrund / Besonderheit</span>
              <textarea className="input-base" rows={2} placeholder="z.&nbsp;B. basiert auf einer wahren Begebenheit" value={form.hintergrund} onChange={(e) => set("hintergrund", e.target.value)} />
            </label>
            <div className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Buchcover (Bild)</span>
              {coverImg ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImg} alt="Cover" className="h-28 rounded-lg border border-arena-border object-contain" />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { setCoverImg(null); if (coverRef.current) coverRef.current.value = ""; }}>
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
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie)</span></span>
              <textarea className={"input-base" + req(form.notes2)} rows={3} placeholder="z.&nbsp;B. Hier seht ihr die wichtigsten Eckdaten zum Buch – Erscheinungsjahr, Genre und Verlag." value={form.notes2} onChange={(e) => set("notes2", e.target.value)} />
            </label>
          </div>
        );

      case 2:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 3 – Worum geht&apos;s?</h2>
            <p className="text-arena-muted text-sm">Diese 4 Punkte werden in der Vorlage als 4 Kacheln dargestellt.</p>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Hauptfigur</span>
              <input className={"input-base" + req(form.hauptfigur)} placeholder="z.&nbsp;B. ein Verstorbener auf dem Weg zum Hüter" value={form.hauptfigur} onChange={(e) => set("hauptfigur", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Thema</span>
              <input className={"input-base" + req(form.thema)} placeholder="z.&nbsp;B. Tod & Jenseits" value={form.thema} onChange={(e) => set("thema", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Inhalte</span>
              <textarea className={"input-base" + req(form.inhalte)} rows={2} placeholder="z.&nbsp;B. Wahrheitssuche, Prüfungen" value={form.inhalte} onChange={(e) => set("inhalte", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Schwerpunkt</span>
              <input className={"input-base" + req(form.schwerpunkt)} placeholder="z.&nbsp;B. Trauerbewältigung, Leben nach dem Tod" value={form.schwerpunkt} onChange={(e) => set("schwerpunkt", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie)</span></span>
              <textarea className={"input-base" + req(form.notes3)} rows={3} placeholder="z.&nbsp;B. Worum geht es in dem Buch? Hier erfahrt ihr mehr über die Hauptfigur, das Thema und die zentralen Inhalte." value={form.notes3} onChange={(e) => set("notes3", e.target.value)} />
            </label>
          </div>
        );

      case 3:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 4 – Über die Autorin / den Autor</h2>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Folientitel</span>
              <input className={"input-base" + req(form.autorTitel)} placeholder="z.&nbsp;B. Über die Autorin" value={form.autorTitel} onChange={(e) => set("autorTitel", e.target.value)} />
              <span className="text-arena-muted text-xs">z.&nbsp;B. &quot;Über die Autorin&quot; oder &quot;Über den Autor&quot;</span>
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Herkunft / Land</span>
              <input className={"input-base" + req(form.autorHerkunft)} placeholder="z.&nbsp;B. Österreich, Steiermark" value={form.autorHerkunft} onChange={(e) => set("autorHerkunft", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Beruf / Beschreibung</span>
              <input className={"input-base" + req(form.autorBeruf)} placeholder="z.&nbsp;B. Mutter, Medienfachfrau, Mentaltrainerin" value={form.autorBeruf} onChange={(e) => set("autorBeruf", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Schreibstil</span>
              <input className={"input-base" + req(form.autorStil)} placeholder="z.&nbsp;B. authentisch, autobiografisch" value={form.autorStil} onChange={(e) => set("autorStil", e.target.value)} />
            </label>
            <div className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Autorenfoto</span>
              {autorImg ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={autorImg} alt="Autor" className="h-28 rounded-lg border border-arena-border object-contain" />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { setAutorImg(null); if (autorRef.current) autorRef.current.value = ""; }}>
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
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie)</span></span>
              <textarea className={"input-base" + req(form.notes4)} rows={3} placeholder="z.&nbsp;B. Lernt die Autorin bzw. den Autor kennen – woher sie kommt, was sie macht und wie sie schreibt." value={form.notes4} onChange={(e) => set("notes4", e.target.value)} />
            </label>
          </div>
        );

      case 4:
        return (
          <div className="grid gap-4">
            <h2 className="text-lg font-bold">Folie 5 – Zusammenfassung</h2>
            <p className="text-arena-muted text-sm">Gib die wichtigsten Stichpunkte für die letzte Folie ein (max.&nbsp;5 Platzhalter in der Shorts-Vorlage).</p>
            {form.zusammenfassung.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-arena-muted text-sm w-5 shrink-0 text-right">{i + 1}.</span>
                <input className="input-base flex-1" placeholder={"Stichpunkt " + (i + 1)} value={b} onChange={(e) => setBullet(i, e.target.value)} />
                {form.zusammenfassung.length > 2 && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => removeBullet(i)} title="Entfernen">
                    <TrashIcon className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {form.zusammenfassung.length < 8 && (
              <button type="button" className="btn btn-sm w-fit" onClick={addBullet}>
                <PlusIcon className="size-4" /> Stichpunkt hinzufügen
              </button>
            )}
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Sprechertext <span className="text-arena-muted text-sm font-normal">(erscheint in den PowerPoint-Notizen unter der Folie)</span></span>
              <textarea className={"input-base" + req(form.notes5)} rows={3} placeholder="z.&nbsp;B. Zum Schluss eine kurze Zusammenfassung: Das sind die wichtigsten Punkte, die ihr euch merken solltet." value={form.notes5} onChange={(e) => set("notes5", e.target.value)} />
            </label>
          </div>
        );
    }
  }

  /* ═══ RENDER ═══ */

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold">Shorts-Vorlage erstellen</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Erstelle eine Buchempfehlung im Hochformat (Shorts / Reels). Gleiche Inhalte, anderes Format.
        </p>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm" onClick={() => setShowVorlagen((v) => !v)}>
            <FolderOpenIcon className="size-4" />
            {showVorlagen ? "Liste ausblenden" : "Öffnen"}
            {savedVorlagen.length > 0 && <span className="ml-1 rounded-full bg-arena-yellow text-arena-blue px-1.5 text-xs font-bold">{savedVorlagen.length}</span>}
          </button>
          <button type="button" className="btn btn-sm" onClick={newVorlage}>
            <PlusIcon className="size-4" /> Neu
          </button>

          <span className="hidden sm:inline text-arena-border">|</span>

          <button type="button" className="btn btn-sm" onClick={saveVorlage} disabled={saving}>
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : <CloudArrowUpIcon className="size-4" />}
            {saving ? "Speichern …" : "Speichern"}
          </button>
          <button type="button" className="btn btn-sm" onClick={generatePptx} disabled={generating}>
            <DocumentArrowDownIcon className="size-4" />
            {generating ? "Erstellen …" : "Herunterladen"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={submitVorlage}
            disabled={submitting || !!submissionId || !allComplete}
            title={submissionId ? "Bereits eingereicht" : !allComplete ? "Bitte fülle erst alle Pflichtfelder aus" : "PPTX generieren und bei BuchArena einreichen"}
          >
            {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PaperAirplaneIcon className="size-4" />}
            {submitting ? "Einreichen …" : submissionId ? "Eingereicht ✓" : "Einreichen"}
          </button>

          {savedId && (
            <span className="text-xs text-arena-muted ml-auto">
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
                  <div key={v._id} className="flex items-center gap-2 text-sm">
                    <button type="button" className="btn btn-sm flex-1 justify-start text-left" onClick={() => loadVorlage(v._id)}>
                      <strong>{truncate(v.buchtitel, 30)}</strong>
                      <span className="text-arena-muted ml-1">– {v.autorVorname} {v.autorNachname}</span>
                      {v.submissionId && <span className="text-green-600 ml-1">✓</span>}
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteVorlage(v._id)} title="Löschen">
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step Indicator ── */}
        <div className="flex items-center gap-1 py-1">
          {STEP_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              className={"flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                (i === step
                  ? "bg-arena-blue text-white"
                  : isStepComplete(i)
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-arena-muted hover:bg-gray-200")}
              onClick={() => setStep(i)}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {/* ── Preview toggle (mobile) ── */}
        <button type="button" className="btn btn-sm sm:hidden w-fit" onClick={() => setShowPreview((v) => !v)}>
          <EyeIcon className="size-4" /> {showPreview ? "Vorschau ausblenden" : "Vorschau einblenden"}
        </button>

        {/* ── Main layout: Form + Preview ── */}
        <div className="grid gap-6 sm:grid-cols-[1fr_200px]">
          <div className="grid gap-4 content-start">
            {renderStep()}
          </div>

          {showPreview && (
            <div className="grid gap-2 content-start">
              <span className="text-xs text-arena-muted font-medium">Vorschau – Folie {previewSlide + 1}</span>
              <div className="max-w-[200px]">
                {renderSlidePreview(previewSlide)}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {successMsg && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
            <CheckCircleIcon className="size-4" /> {successMsg}
          </p>
        )}

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

        {/* ── Hinweis ── */}
        <label className="grid gap-1 text-[0.95rem]">
          <span className="font-medium">Hinweis an die BuchArena <span className="text-arena-muted text-sm font-normal">(wird beim Einreichen mitgeschickt, z.&nbsp;B. Veröffentlichungsdatum, besondere Wünsche)</span></span>
          <textarea className="input-base" rows={2} placeholder="z.&nbsp;B. Buch wird erst im Mai veröffentlicht, bitte erst dann posten …" value={form.notiz} onChange={(e) => set("notiz", e.target.value)} />
        </label>

        {!allComplete && (
          <p className="text-xs text-arena-muted">Tipp: Fülle alle Pflichtfelder aus (inkl. Bilder und Sprechertexte), um die Vorlage einreichen zu können. Herunterladen ist jederzeit möglich.</p>
        )}

        <div className="border-t border-arena-border pt-3">
          <Link href="/social-media" className="btn btn-sm">← Zurück zu Social Media</Link>
        </div>
      </section>
    </main>
  );
}
