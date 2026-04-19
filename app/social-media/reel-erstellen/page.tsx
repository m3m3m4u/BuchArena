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
  CloudArrowUpIcon,
  ArrowPathIcon,
  FolderOpenIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

/* ── helpers ── */

function compressImage(file: File, maxDim = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas nicht verfügbar")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht geladen werden")); };
    img.src = url;
  });
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, b64] = dataUrl.split(",");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/* ── types ── */

interface SavedReel {
  _id: string;
  buchtitel: string;
  autorName: string;
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
  geschlecht: string;
  geschlechtCustom: string;
  hauptfigur: string;
  thema: string;
  inhalte: string;
  beschreibung: string;
  autorHerkunft: string;
  autorBeruf: string;
  autorStil: string;
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
  geschlecht: "Autorin",
  geschlechtCustom: "",
  hauptfigur: "",
  thema: "",
  inhalte: "",
  beschreibung: "",
  autorHerkunft: "",
  autorBeruf: "",
  autorStil: "",
  notiz: "",
};

const STEP_LABELS = ["Allgemeine Infos", "Worum geht's?", "Über den Autor"];

const CHAR_LIMITS: Record<string, number> = {
  buchtitel: 40,
  untertitel: 50,
  autorName: 35,
  genre: 40,
  verlag: 40,
  coverDesign: 40,
  hintergrund: 50,
  hauptfigur: 50,
  thema: 50,
  inhalte: 50,
  autorHerkunft: 40,
  autorBeruf: 45,
  autorStil: 40,
};

function CharWarn({ value, field }: { value: string; field: string }) {
  const limit = CHAR_LIMITS[field];
  if (!limit || value.length <= limit) return null;
  return (
    <span className="text-orange-600 text-xs mt-0.5">
      ⚠️ Wenn möglich kürzer ({value.length}/{limit} Zeichen)
    </span>
  );
}

const CACHE_KEY = "bucharena_reel_vorlagen_cache";

export default function ReelErstellenPage() {
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
  const [savedReels, setSavedReels] = useState<SavedReel[]>([]);
  const [showReels, setShowReels] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [step, setStep] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const coverRef = useRef<HTMLInputElement>(null);
  const autorRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function sync() { setAccount(getStoredAccount()); setAccountLoaded(true); }
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

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

  /* ── save / load ── */

  const saveReel = useCallback(async (silent = false) => {
    if (!account) return;
    setSaving(true);
    setError("");
    try {
      const effectiveGeschlecht = form.geschlecht === "custom" ? (form.geschlechtCustom || "Autorin") : (form.geschlecht || "Autorin");
      const body = { ...form, geschlecht: effectiveGeschlecht, coverImg: coverImg ?? undefined, autorImg: autorImg ?? undefined };
      let res;
      if (savedId) {
        res = await fetch(`/api/bucharena/reel-vorlagen/${savedId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/bucharena/reel-vorlagen", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.id) setSavedId(json.id);
      }
      if (!silent) setSuccessMsg("Gespeichert!");
      setDirty(false);
      setTimeout(() => setSuccessMsg(""), 3000);
      // invalidate cache
      try { sessionStorage.removeItem(CACHE_KEY); } catch { /**/ }
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }, [account, form, coverImg, autorImg, savedId]);

  async function loadReels() {
    setError("");
    try {
      const res = await fetch("/api/bucharena/reel-vorlagen");
      const json = await res.json();
      if (json.success) setSavedReels(json.vorlagen || []);
    } catch {
      setError("Laden fehlgeschlagen.");
    }
  }

  async function loadReel(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/bucharena/reel-vorlagen/${id}`);
      const json = await res.json();
      if (!json.success) { setError("Nicht gefunden."); return; }
      const v = json.vorlage;
      setForm({
        buchtitel: v.buchtitel || "",
        untertitel: v.untertitel || "",
        autorName: v.autorName || "",
        erscheinungsjahr: v.erscheinungsjahr || "",
        genre: v.genre || "",
        verlag: v.verlag || "",
        coverDesign: v.coverDesign || "",
        hintergrund: v.hintergrund || "",
        geschlecht: ["Autorin", "Autor"].includes(v.geschlecht) ? v.geschlecht : "custom",
        geschlechtCustom: !["Autorin", "Autor"].includes(v.geschlecht) ? (v.geschlecht || "") : "",
        hauptfigur: v.hauptfigur || "",
        thema: v.thema || "",
        inhalte: v.inhalte || "",
        beschreibung: v.beschreibung || "",
        autorHerkunft: v.autorHerkunft || "",
        autorBeruf: v.autorBeruf || "",
        autorStil: v.autorStil || "",
        notiz: v.notiz || "",
      });
      if (v.coverImg) setCoverImg(v.coverImg);
      if (v.autorImg) setAutorImg(v.autorImg);
      setSavedId(id);
      if (v.submissionId) setSubmissionId(v.submissionId);
      setShowReels(false);
      setDirty(false);
    } catch {
      setError("Laden fehlgeschlagen.");
    }
  }

  async function deleteReel(id: string) {
    try {
      await fetch(`/api/bucharena/reel-vorlagen/${id}`, { method: "DELETE" });
      setSavedReels((r) => r.filter((x) => x._id !== id));
      if (savedId === id) { setForm(INITIAL); setCoverImg(null); setAutorImg(null); setSavedId(null); setSubmissionId(null); }
    } catch { /**/ }
  }

  /* ── client-side PPTX download ── */

  async function downloadPptx() {
    setGenerating(true);
    setError("");
    try {
      const [JSZipModule, xmldomModule] = await Promise.all([
        import("jszip"),
        import("@xmldom/xmldom"),
      ]);
      const JSZip = JSZipModule.default;
      const { DOMParser, XMLSerializer } = xmldomModule;

      const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";

      function nodeList(nl: unknown): unknown[] {
        const r: unknown[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const any = nl as any;
        for (let i = 0; i < any.length; i++) r.push(any.item(i));
        return r;
      }

      function replaceParagraphTexts(xml: string, replacements: [string, string][]): string {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc: any = new DOMParser().parseFromString(xml, "application/xml");
        const paragraphs = nodeList(doc.getElementsByTagNameNS(A_NS, "p"));
        for (const para of paragraphs) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const runs = nodeList((para as any).getElementsByTagNameNS(A_NS, "r"));
          if (runs.length === 0) continue;
          let fullText = "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tElements: any[] = [];
          for (const run of runs) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ts = nodeList((run as any).getElementsByTagNameNS(A_NS, "t"));
            if (ts.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fullText += (ts[0] as any).textContent || "";
              tElements.push(ts[0]);
            }
          }
          const leading = fullText.match(/^(\s*)/)?.[1] || "";
          const trimmed = fullText.trim();
          for (const [oldText, newText] of replacements) {
            if (trimmed === oldText) {
              if (tElements.length > 0) {
                tElements[0].textContent = leading + newText;
                for (let i = 1; i < tElements.length; i++) tElements[i].textContent = "";
              }
              break;
            }
          }
        }
        return new XMLSerializer().serializeToString(doc);
      }

      const resp = await fetch("/Kurzvideo.pptx");
      const arrayBuffer = await resp.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const autorFull = form.autorName?.trim() || "Unbekannt";
      const geschlecht = form.geschlecht === "custom" ? (form.geschlechtCustom || "Autorin") : (form.geschlecht || "Autorin");
      const coverDesignText = form.coverDesign?.trim()
        ? "Coverdesign: " + form.coverDesign
        : geschlecht + " & Coverdesign: " + autorFull;

      let s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
      s1 = replaceParagraphTexts(s1, [
        ["Autorin: Martina Zöchinger", geschlecht + ": " + autorFull],
        ["Erscheinungsjahr: 2025", "Erscheinungsjahr: " + form.erscheinungsjahr],
        ["Genre: Fantasy, Spiritualität", form.genre?.trim() ? "Genre: " + form.genre : ""],
        ["Hintergrund: basiert auf einer wahren Begebenheit", form.hintergrund?.trim() ? "Hintergrund: " + form.hintergrund : ""],
        ["Hüter - Die Ausbildung beginnt", form.buchtitel],
        ["Autorin & Coverdesign: Martina Zöchinger", coverDesignText],
        ["Verlag: Independently published", form.verlag?.trim() ? "Verlag: " + form.verlag : ""],
      ]);
      zip.file("ppt/slides/slide1.xml", s1);

      let s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
      s2 = replaceParagraphTexts(s2, [
        ["Thema: Tod & Jenseits", form.thema?.trim() ? "Thema: " + form.thema : ""],
        ["Hauptfigur: ein Verstorbener auf dem Weg zum Hüter", form.hauptfigur?.trim() ? "Hauptfigur: " + form.hauptfigur : ""],
        ["Inhalte: Wahrheitssuche, Prüfungen", form.inhalte?.trim() ? "Inhalte: " + form.inhalte : ""],
      ]);
      zip.file("ppt/slides/slide2.xml", s2);

      let s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
      s3 = replaceParagraphTexts(s3, [
        ["Über die Autorin", "Über " + (geschlecht === "Autorin" ? "die Autorin" : geschlecht === "Autor" ? "den Autor" : (form.autorName.trim() || "die Autorin"))],
        ["Martina Zöchinger", autorFull],
        ["Österreich, Steiermark", form.autorHerkunft || ""],
        ["Mutter, Medienfachfrau, Mentaltrainerin", form.autorBeruf || ""],
        ["Stil: authentisch, autobiografisch", form.autorStil?.trim() ? "Stil: " + form.autorStil : ""],
      ]);
      zip.file("ppt/slides/slide3.xml", s3);

      if (coverImg) zip.file("ppt/media/image2.jpeg", dataUrlToBytes(coverImg));
      if (autorImg) zip.file("ppt/media/image6.jpeg", dataUrlToBytes(autorImg));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reel ${truncate(form.buchtitel || "Mein Buch", 40)}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Erstellen der Datei.");
    } finally {
      setGenerating(false);
    }
  }

  /* ── submit (server-side) ── */

  async function submitReel() {
    if (!savedId) { setError("Bitte zuerst speichern."); return; }
    setSubmitting(true);
    setError("");
    try {
      // make sure latest data is saved first
      await saveReel(true);
      const res = await fetch(`/api/bucharena/reel-vorlagen/${savedId}/submit`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSubmissionId(json.submissionId);
        setShowSubmitDialog(false);
        setShowThankYou(true);
      } else {
        setError(json.error || "Fehler beim Einreichen.");
      }
    } catch {
      setError("Fehler beim Einreichen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function withdrawReel(reelId?: string) {
    const targetId = reelId || savedId;
    if (!targetId) return;
    if (!confirm("Einreichung wirklich zurückziehen?")) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/bucharena/reel-vorlagen/${targetId}/submit`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Fehler beim Zurückziehen."); return; }
      if (!reelId || reelId === savedId) setSubmissionId(null);
      setSavedReels((prev) => prev.map((r) => r._id === targetId ? { ...r, submissionId: undefined } : r));
      setSuccessMsg("Einreichung wurde zurückgezogen.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Fehler beim Zurückziehen.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── step completeness ── */

  function isStepComplete(s: number) {
    switch (s) {
      case 0: return !!form.buchtitel.trim() && !!form.autorName.trim();
      case 1: return !!form.thema.trim() && !!form.hauptfigur.trim() && !!form.inhalte.trim() && !!form.beschreibung.trim();
      case 2: return !!form.autorHerkunft.trim() && !!form.autorBeruf.trim() && !!form.autorStil.trim() && !!autorImg;
      default: return false;
    }
  }

  const allComplete = [0, 1, 2].every(isStepComplete);

  function req(value: string): string {
    return value.trim() ? "" : " !border-red-400";
  }

  /* ═══ SLIDE PREVIEW (Portrait 9:16) ═══ */

  function Ph({ text }: { text: string }) {
    return <span className="opacity-25">{text}</span>;
  }

  function KurzvideoBar() {
    return (
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: "50%", transform: "translateX(-50%)", top: 0,
          width: "55%", height: "4.5%",
          background: "#8B0000",
          borderRadius: "0 0 0.3em 0.3em",
          color: "#FFFFFF", fontSize: "0.42em", fontWeight: 700,
          letterSpacing: "0.07em",
          fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif",
        }}
      >
        BUCHVORSTELLUNG
      </div>
    );
  }

  function SlideFrame({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="relative w-full aspect-[9/16] rounded-lg overflow-hidden select-none shadow-md"
        style={{ background: "#F5F0E8", fontFamily: "'Book Antiqua', 'Palatino Linotype', Georgia, serif" }}
      >
        {children}
        <KurzvideoBar />
      </div>
    );
  }

  function renderSlidePreview(idx: number) {
    const autorFull = form.autorName?.trim() || "";
    const geschlecht = form.geschlecht === "custom" ? (form.geschlechtCustom || "Autorin") : (form.geschlecht || "Autorin");

    switch (idx) {
      case 0: {
        const coverDesignText = form.coverDesign?.trim()
          ? "Coverdesign: " + truncate(form.coverDesign, 40)
          : geschlecht + " & Coverdesign: " + truncate(autorFull, 30);
        return (
          <SlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              {/* Cover image */}
              <div className="absolute flex items-center justify-center" style={{ left: "15%", top: "8%", width: "70%", height: "35%" }}>
                {coverImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImg} alt="" className="max-h-full max-w-full rounded shadow object-contain" />
                ) : (
                  <div className="w-[65%] h-[80%] rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[0.35em]">Cover</div>
                )}
              </div>
              {/* Buchtitel */}
              <div className="absolute flex items-center justify-center text-center" style={{ left: "6%", top: "46%", width: "88%", height: "10%", fontSize: "0.75em", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2 }}>
                {form.buchtitel ? truncate(form.buchtitel, 40) : <Ph text="Buchtitel" />}
              </div>
              {/* Infos */}
              <div className="absolute" style={{ left: "6%", top: "58%", width: "88%", fontSize: "0.38em", color: "#333", lineHeight: 1.6 }}>
                {autorFull && <div><b>{geschlecht}: {truncate(autorFull, 30)}</b></div>}
                {form.erscheinungsjahr && <div>Erscheinungsjahr: {form.erscheinungsjahr}</div>}
                {form.genre && <div>Genre: {truncate(form.genre, 35)}</div>}
                {form.hintergrund && <div>Hintergrund: {truncate(form.hintergrund, 45)}</div>}
                {form.buchtitel && <div className="mt-[0.4em] opacity-70">{truncate(coverDesignText, 45)}</div>}
                {form.verlag && <div className="opacity-70">Verlag: {truncate(form.verlag, 35)}</div>}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case 1:
        return (
          <SlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "6%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#1a1a1a" }}>
                Worum geht&apos;s?
              </div>
              <div className="absolute" style={{ left: "6%", top: "14%", width: "88%", fontSize: "0.45em", fontWeight: 600, color: "#555" }}>
                {form.buchtitel ? truncate(form.buchtitel, 40) : <Ph text="Buchtitel" />}
              </div>
              <div className="absolute space-y-[0.6em]" style={{ left: "6%", top: "24%", width: "88%" }}>
                {[
                  { label: "Thema", value: form.thema },
                  { label: "Hauptfigur", value: form.hauptfigur },
                  { label: "Inhalte", value: form.inhalte },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-[0.3em] p-[2.5%] border border-gray-200 bg-gray-50" style={{ fontSize: "0.38em" }}>
                    <div className="font-bold text-gray-700">{label}</div>
                    <div className="text-gray-900">{value ? truncate(value, 50) : <Ph text={label + " eingeben"} />}</div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );

      case 2:
        return (
          <SlideFrame>
            <div className="absolute inset-[3%] rounded-[0.4em] bg-white border border-gray-200">
              <div className="absolute" style={{ left: "6%", top: "6%", width: "88%", fontSize: "0.65em", fontWeight: 700, color: "#1a1a1a" }}>
                Über {geschlecht === "Autorin" ? "die Autorin" : geschlecht === "Autor" ? "den Autor" : (form.autorName.trim() || "die Autorin")}
              </div>
              {/* Author photo */}
              <div className="absolute flex items-center justify-center" style={{ left: "25%", top: "14%", width: "50%", height: "30%" }}>
                {autorImg ? (
                  <div className="rounded-full overflow-hidden shadow" style={{ width: "min(100%, calc(100% * 30 / 50))", aspectRatio: "1" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={autorImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                  </div>
                ) : (
                  <div className="w-[70%] h-[70%] rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[0.35em]">Foto</div>
                )}
              </div>
              <div className="absolute text-center" style={{ left: "6%", top: "46%", width: "88%", fontSize: "0.6em", fontWeight: 700, color: "#1a1a1a" }}>
                {autorFull ? truncate(autorFull, 35) : <Ph text="Autorname" />}
              </div>
              <div className="absolute" style={{ left: "6%", top: "55%", width: "88%", fontSize: "0.38em", color: "#333", lineHeight: 1.7 }}>
                {form.autorHerkunft && <div>{truncate(form.autorHerkunft, 40)}</div>}
                {form.autorBeruf && <div>{truncate(form.autorBeruf, 45)}</div>}
                {form.autorStil && <div>Stil: {truncate(form.autorStil, 40)}</div>}
              </div>
            </div>
          </SlideFrame>
        );

      default: return null;
    }
  }

  /* ── image upload handlers ── */

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setCoverImg(await compressImage(file)); setDirty(true); } catch { /**/ }
    e.target.value = "";
  }

  async function handleAutorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setAutorImg(await compressImage(file)); setDirty(true); } catch { /**/ }
    e.target.value = "";
  }

  /* ── helpers ── */

  function newReel() {
    if (dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setForm(INITIAL);
    setCoverImg(null);
    setAutorImg(null);
    setSavedId(null);
    setSubmissionId(null);
    setStep(0);
    setDirty(false);
  }

  function renderStep() {
    switch (step) {
      case 0: return (
        <div className="grid gap-4">
          <h2 className="text-lg font-bold">Folie 1 – Allgemeine Infos</h2>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Buchtitel</span>
            <input className={"input-base" + req(form.buchtitel)} value={form.buchtitel} onChange={(e) => set("buchtitel", e.target.value)} placeholder="z. B. Hüter - Die Ausbildung beginnt" />
            <CharWarn value={form.buchtitel} field="buchtitel" />
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Untertitel <span className="text-arena-muted text-sm font-normal">(optional)</span></span>
            <input className="input-base" value={form.untertitel} onChange={(e) => set("untertitel", e.target.value)} placeholder="Optionaler Untertitel" />
            <CharWarn value={form.untertitel} field="untertitel" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Autorin / Autor</span>
              <input className={"input-base" + req(form.autorName)} value={form.autorName} onChange={(e) => set("autorName", e.target.value)} placeholder="Vollständiger Name" />
              <CharWarn value={form.autorName} field="autorName" />
            </label>
            <div className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Bezeichnung</span>
              <div className="flex flex-wrap gap-4 pt-1">
                {(["Autorin", "Autor"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="geschlecht" value={v} checked={form.geschlecht === v} onChange={() => set("geschlecht", v)} className="accent-arena-blue" />
                    <span>{v}</span>
                  </label>
                ))}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="geschlecht" value="custom" checked={form.geschlecht === "custom"} onChange={() => set("geschlecht", "custom")} className="accent-arena-blue" />
                  <span>Eigener Begriff</span>
                </label>
              </div>
              {form.geschlecht === "custom" && (
                <label className="grid gap-0.5 mt-1">
                  <span className="text-xs text-arena-muted">Wie lautet die Bezeichnung? (z.&nbsp;B. Schriftstellerin)</span>
                  <input className="input-base" value={form.geschlechtCustom} onChange={(e) => set("geschlechtCustom", e.target.value)} placeholder="z.&nbsp;B. Schriftstellerin" autoFocus />
                </label>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Erscheinungsjahr</span>
              <input className="input-base" value={form.erscheinungsjahr} onChange={(e) => set("erscheinungsjahr", e.target.value)} placeholder="2025" />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Verlag</span>
              <input className="input-base" value={form.verlag} onChange={(e) => set("verlag", e.target.value)} placeholder="z. B. Independently published" />
              <CharWarn value={form.verlag} field="verlag" />
            </label>
          </div>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Genre</span>
            <input className="input-base" value={form.genre} onChange={(e) => set("genre", e.target.value)} placeholder="z. B. Fantasy, Spiritualität" />
            <CharWarn value={form.genre} field="genre" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Coverdesign <span className="text-arena-muted text-sm font-normal">(falls abweichend)</span></span>
              <input className="input-base" value={form.coverDesign} onChange={(e) => set("coverDesign", e.target.value)} placeholder="z. B. Name des Designers" />
              <CharWarn value={form.coverDesign} field="coverDesign" />
            </label>
            <label className="grid gap-1 text-[0.95rem]">
              <span className="font-medium">Hintergrund</span>
              <input className="input-base" value={form.hintergrund} onChange={(e) => set("hintergrund", e.target.value)} placeholder="z. B. basiert auf einer wahren Begebenheit" />
              <CharWarn value={form.hintergrund} field="hintergrund" />
            </label>
          </div>
          <div className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Cover-Bild</span>
            <div className="flex gap-3 items-center">
              {coverImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImg} alt="Cover" className="h-20 rounded shadow object-contain border border-arena-border" />
              ) : (
                <div className="h-20 w-14 bg-gray-50 border-2 border-dashed border-arena-border rounded flex items-center justify-center text-arena-muted text-xs">Cover</div>
              )}
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => coverRef.current?.click()} className="btn btn-sm">
                  <PhotoIcon className="size-4" /> {coverImg ? "Ändern" : "Hochladen"}
                </button>
                {coverImg && (
                  <button type="button" onClick={() => { setCoverImg(null); setDirty(true); }} className="btn btn-sm text-red-500">
                    <TrashIcon className="size-4" /> Entfernen
                  </button>
                )}
              </div>
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>
        </div>
      );

      case 1: return (
        <div className="grid gap-4">
          <h2 className="text-lg font-bold">Folie 2 – Worum geht&apos;s?</h2>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Thema</span>
            <input className={"input-base" + req(form.thema)} value={form.thema} onChange={(e) => set("thema", e.target.value)} placeholder="z. B. Tod & Jenseits" />
            <CharWarn value={form.thema} field="thema" />
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Hauptfigur</span>
            <input className={"input-base" + req(form.hauptfigur)} value={form.hauptfigur} onChange={(e) => set("hauptfigur", e.target.value)} placeholder="z. B. ein Verstorbener auf dem Weg zum Hüter" />
            <CharWarn value={form.hauptfigur} field="hauptfigur" />
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Inhalte</span>
            <input className={"input-base" + req(form.inhalte)} value={form.inhalte} onChange={(e) => set("inhalte", e.target.value)} placeholder="z. B. Wahrheitssuche, Prüfungen" />
            <CharWarn value={form.inhalte} field="inhalte" />
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Buchbeschreibung für die Videobeschreibung</span>
            <textarea className={"input-base" + req(form.beschreibung)} rows={4} value={form.beschreibung} onChange={(e) => set("beschreibung", e.target.value)} placeholder="Beschreibe dein Buch in 2 bis 4 Sätzen. Verwende möglichst viele Stichwörter, unter denen das Buch gefunden werden soll – wir nutzen diesen Text als Videobeschreibung." />
          </label>
        </div>
      );

      case 2: return (
        <div className="grid gap-4">
          <h2 className="text-lg font-bold">Folie 3 – Über den Autor</h2>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Herkunft</span>
            <input className={"input-base" + req(form.autorHerkunft)} value={form.autorHerkunft} onChange={(e) => set("autorHerkunft", e.target.value)} placeholder="z. B. Österreich, Steiermark" />
            <CharWarn value={form.autorHerkunft} field="autorHerkunft" />
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Beruf / Tätigkeit</span>
            <input className={"input-base" + req(form.autorBeruf)} value={form.autorBeruf} onChange={(e) => set("autorBeruf", e.target.value)} placeholder="z. B. Mutter, Medienfachfrau, Mentaltrainerin" />
            <CharWarn value={form.autorBeruf} field="autorBeruf" />
          </label>
          <label className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Schreibstil</span>
            <input className={"input-base" + req(form.autorStil)} value={form.autorStil} onChange={(e) => set("autorStil", e.target.value)} placeholder="z. B. authentisch, autobiografisch" />
            <CharWarn value={form.autorStil} field="autorStil" />
          </label>
          <div className="grid gap-1 text-[0.95rem]">
            <span className="font-medium">Autorfoto</span>
            <div className="flex gap-3 items-center">
              {autorImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={autorImg} alt="Autorfoto" className="h-20 w-20 rounded-full shadow border border-arena-border" style={{ objectFit: "cover", objectPosition: "center", display: "block" }} />
              ) : (
                <div className={"h-20 w-20 rounded-full bg-gray-50 border-2 border-dashed flex items-center justify-center text-arena-muted text-xs " + (req(autorImg ?? "") ? "border-red-400" : "border-arena-border")}>Foto</div>
              )}
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => autorRef.current?.click()} className="btn btn-sm">
                  <PhotoIcon className="size-4" /> {autorImg ? "Ändern" : "Hochladen"}
                </button>
                {autorImg && (
                  <button type="button" onClick={() => { setAutorImg(null); setDirty(true); }} className="btn btn-sm text-red-500">
                    <TrashIcon className="size-4" /> Entfernen
                  </button>
                )}
              </div>
            </div>
            <input ref={autorRef} type="file" accept="image/*" className="hidden" onChange={handleAutorChange} />
          </div>
        </div>
      );

      default: return null;
    }
  }

  /* ── render ── */

  if (!accountLoaded) return (
    <main className="top-centered-main">
      <section className="card">
        <p className="text-arena-muted text-center">Lade …</p>
      </section>
    </main>
  );

  if (!account) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1 className="text-xl font-bold">Reel erstellen</h1>
          <p className="text-arena-muted text-[0.95rem]">Melde dich an, um ein Portrait-Kurzvideo für YouTube Shorts, Instagram, TikTok &amp; Facebook zu erstellen.</p>
          <div className="flex gap-3 pt-2">
            <Link href="/auth" className="btn btn-primary">Jetzt einloggen</Link>
            <Link href="/social-media" className="btn">← Zurück</Link>
          </div>
        </section>
      </main>
    );
  }

  if (showThankYou) { /* handled as overlay below */ }

  return (
    <main className="top-centered-main overflow-x-hidden">
      <section className="card">
        <h1 className="text-xl font-bold">Reel erstellen</h1>
        <p className="text-[0.95rem]">
          Erstelle ein Portrait-Kurzvideo (9:16) für YouTube Shorts, Instagram, TikTok &amp; Facebook.
        </p>

        {/* ── Toolbar ── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm" onClick={() => { setShowReels((v) => !v); if (!showReels) loadReels(); }}>
            <FolderOpenIcon className="size-4" />
            <span className="truncate">{showReels ? "Ausblenden" : "Öffnen"}</span>
            {savedReels.length > 0 && <span className="ml-1 rounded-full bg-arena-yellow text-arena-blue px-1.5 text-xs font-bold">{savedReels.length}</span>}
          </button>
          <button type="button" className="btn btn-sm" onClick={newReel}>
            <PlusIcon className="size-4" /> Neu
          </button>

          <span className="hidden sm:inline text-arena-border">|</span>

          <button type="button" className="btn btn-sm" onClick={() => saveReel()} disabled={saving}>
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : <CloudArrowUpIcon className="size-4" />}
            <span className="truncate">{saving ? "Speichern …" : "Speichern"}</span>
          </button>
          <button type="button" className="btn btn-sm" onClick={downloadPptx} disabled={generating}>
            <DocumentArrowDownIcon className="size-4" />
            <span className="truncate">{generating ? "Erstelle …" : "Herunterladen"}</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary col-span-2 sm:col-span-1"
            onClick={() => setShowSubmitDialog(true)}
            disabled={submitting || !!submissionId}
          >
            {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PaperAirplaneIcon className="size-4" />}
            {submitting ? "Einreichen …" : submissionId ? "Eingereicht ✓" : "Einreichen"}
          </button>
          {submissionId && (
            <button
              type="button"
              className="btn btn-sm text-orange-600 border-orange-300 hover:bg-orange-50 col-span-2 sm:col-span-1"
              onClick={withdrawReel}
              disabled={submitting}
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

        {/* ── Gespeicherte Reels ── */}
        {showReels && (
          <div className="rounded-lg border border-arena-border bg-gray-50 p-3">
            {savedReels.length === 0 ? (
              <p className="text-arena-muted text-sm">Noch keine Reels gespeichert.</p>
            ) : (
              <div className="grid gap-2">
                {savedReels.map((r) => {
                  const isActive = r._id === savedId;
                  return (
                    <div key={r._id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${isActive ? "border-arena-blue bg-blue-50" : "border-arena-border bg-white"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {isActive && <span className="inline-block w-2 h-2 rounded-full bg-arena-blue mr-1.5 align-middle" />}
                          {r.buchtitel || "Unbenannt"}
                        </p>
                        <p className="text-xs text-arena-muted truncate">
                          {r.autorName || "–"}{" · "}{new Date(r.updatedAt).toLocaleDateString("de-DE")}
                          {r.submissionId && <span className="ml-1 text-green-600">(eingereicht)</span>}
                          {isActive && <span className="ml-1 font-medium text-arena-blue">· geöffnet</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive && <button type="button" className="btn btn-sm" onClick={() => loadReel(r._id)}>Laden</button>}
                        {r.submissionId && (
                          <button type="button" className="btn btn-sm text-orange-600 border-orange-300 hover:bg-orange-50" disabled={submitting} onClick={() => withdrawReel(r._id)}>
                            <span className="hidden sm:inline">Zurückziehen</span><span className="sm:hidden text-xs">✕</span>
                          </button>
                        )}
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteConfirmId(r._id)}>
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Löschen bestätigen ── */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <p className="font-semibold mb-2">Reel löschen?</p>
              <p className="text-sm text-gray-600 mb-4">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-sm" onClick={() => setDeleteConfirmId(null)}>Abbrechen</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteReel(deleteConfirmId)}>Löschen</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step-Tabs ── */}
        <div className="grid grid-cols-3 gap-1 py-1.5 px-1.5 rounded-lg border border-gray-300 bg-gray-100">
          {STEP_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={"rounded-lg px-1 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-sm text-center truncate " + (
                i === step
                  ? "bg-arena-blue text-white border border-arena-blue"
                  : isStepComplete(i)
                    ? "bg-green-200 text-green-900 border border-green-400 hover:bg-green-300"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Hauptlayout: Formular + Vorschau ── */}
        <div className="grid gap-6 md:grid-cols-[1fr_200px] items-start">
          {renderStep()}

          {/* Vorschau-Sidebar */}
          <div className="sticky top-4">
            <p className="text-xs text-arena-muted mb-1 text-center">Vorschau – Folie {step + 1}/3</p>
            {renderSlidePreview(step)}
            <p className="text-center text-[10px] text-arena-muted mt-1">Hochformat (Shorts)</p>
          </div>
        </div>

        {/* ── Feedback ── */}
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

        <Link href="/social-media" className="text-arena-link text-sm no-underline hover:underline">
          ← Zurück zu Social Media
        </Link>
      </section>

      {/* ── Einreichen-Overlay ── */}
      {showSubmitDialog && (
        <div className="overlay-backdrop" onClick={() => setShowSubmitDialog(false)}>
          <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Reel einreichen</h2>
            <p className="text-sm text-arena-muted">Das Reel wird als PPTX-Datei generiert und an unser Team weitergeleitet. Wir veröffentlichen es dann auf YouTube Shorts, Instagram, TikTok und Facebook.</p>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" className="btn" onClick={() => setShowSubmitDialog(false)}>Abbrechen</button>
              <button
                type="button"
                className="btn btn-primary ml-auto"
                disabled={submitting}
                onClick={async () => { setShowSubmitDialog(false); await submitReel(); }}
              >
                {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PaperAirplaneIcon className="size-4" />}
                {submitting ? "Einreichen …" : "Jetzt einreichen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Danke-Overlay ── */}
      {showThankYou && (
        <div className="overlay-backdrop" onClick={() => setShowThankYou(false)}>
          <div className="card w-full max-w-lg text-center" onClick={(e) => e.stopPropagation()}>
            <CheckCircleIcon className="size-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold mt-3">Danke für deine Einreichung!</h2>
            <p className="text-[0.95rem] text-arena-muted mt-2">
              Wir melden uns bei dir, sobald das Reel fertig ist – oder wenn wir Fragen an dich haben.
            </p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => setShowThankYou(false)}>Alles klar</button>
          </div>
        </div>
      )}
    </main>
  );
}
