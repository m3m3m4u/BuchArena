"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import GenrePicker from "@/app/components/genre-picker";
import {
  Cog6ToothIcon,
  BookOpenIcon,
  PencilSquareIcon,
  MusicalNoteIcon,
  MicrophoneIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  FilmIcon,
  ChevronLeftIcon,
  PlayIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

type Submission = {
  _id: string;
  bookTitle: string;
  author: string;
  genre: string;
  ageRange: string;
  notes?: string;
  contact: string;
  instagram?: string;
  fileName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Ausstehend", cls: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Genehmigt", cls: "bg-green-100 text-green-800" },
  rejected: { label: "Abgelehnt", cls: "bg-red-100 text-red-800" },
};

type WizardStep = "start" | "video-tools" | "content-tools" | "admin";

export default function SocialMediaPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showDownloadOverlay, setShowDownloadOverlay] = useState(false);
  const [showUploadOverlay, setShowUploadOverlay] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("start");

  useEffect(() => {
    function sync() {
      setAccount(getStoredAccount());
    }
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/bucharena/submissions/my");
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions);
    } catch {
      /* ignore */
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    if (account) loadSubmissions();
  }, [account, loadSubmissions]);

  async function handleDelete(id: string) {
    if (!confirm("Möchtest du diese Einreichung wirklich löschen?")) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/bucharena/submissions/my/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setActionLoading(false);
    }
  }

  function startEdit(sub: Submission) {
    setEditingId(sub._id);
    setEditForm({
      bookTitle: sub.bookTitle,
      author: sub.author,
      genre: sub.genre,
      ageRange: sub.ageRange,
      notes: sub.notes || "",
      contact: sub.contact,
      instagram: sub.instagram || "",
    });
    setActionError("");
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/bucharena/submissions/my/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: editForm.bookTitle,
          author: editForm.author,
          genre: editForm.genre,
          ageRange: editForm.ageRange,
          notes: editForm.notes,
          email: editForm.contact,
          instagram: editForm.instagram,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSubmissions((prev) =>
        prev.map((s) => (s._id === editingId ? { ...s, ...data.submission } : s)),
      );
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setActionLoading(false);
    }
  }

  /* ── shared card class ── */
  const optionCls =
    "flex items-start gap-4 rounded-xl border border-arena-border bg-white p-4 text-left transition-colors hover:border-arena-blue hover:bg-[#f0f7ff] cursor-pointer w-full";

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold">BuchArena – Social Media</h1>

        {wizardStep !== "start" && (
          <button
            type="button"
            onClick={() => setWizardStep("start")}
            className="flex items-center gap-1 text-sm text-arena-muted hover:text-arena-blue transition-colors -mt-1"
          >
            <ChevronLeftIcon className="size-4" /> Zurück zur Übersicht
          </button>
        )}

        {/* ═══ SCHRITT 1: Was möchtest du tun? ═══ */}
        {wizardStep === "start" && (
          <div className="grid gap-4">
            <p className="text-arena-muted text-[0.95rem]">
              Was möchtest du heute tun? Wähle eine Option:
            </p>

            <div className="grid gap-2.5">
              {/* a) Reel / Video-Vorlage */}
              <button
                type="button"
                className={optionCls}
                onClick={() => setWizardStep("video-tools")}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-arena-blue">
                  <FilmIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Vorlage für Reels oder Videos zu meinen Büchern</strong>
                  <span className="text-sm text-arena-muted">Reiche dein Buch für ein Kurzvideo oder ein vollständiges Video mit Sprecher ein.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </button>

              {/* b) Rezensionen / Schnipsel */}
              <button
                type="button"
                className={optionCls}
                onClick={() => setWizardStep("content-tools")}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                  <PencilSquareIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Vorlage für Rezensionen oder Schnipsel</strong>
                  <span className="text-sm text-arena-muted">Reiche Rezensionen, Textausschnitte oder kurze Antworten für Social-Media-Beiträge ein.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </button>

              {/* c) Beitrag-Tool */}
              <Link
                href="/social-media/beitrag-tool"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                  <PhotoIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Beitrags-Tool – selbst Beiträge oder Reels erstellen</strong>
                  <span className="text-sm text-arena-muted">Gestalte Instagram-Posts und Reels selbst mit Bild, Text, Rahmen, Animationen und Musik – als PNG oder MP4 herunterladen.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>

              <Link
                href="/social-media/fertige-inhalte"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-700">
                  <ArrowDownTrayIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Fertige Inhalte für Social Media (Beiträge und Reels)</strong>
                  <span className="text-sm text-arena-muted">Lade vorbereitete Bilder und Videos herunter und nutze passende Caption-Vorschläge, wenn dir eigener Content fehlt.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>

              {/* d) Fertiges Video kontrollieren */}
              <Link
                href="/social-media/videos"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">
                  <PlayIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Fertiges Video kontrollieren und freigeben</strong>
                  <span className="text-sm text-arena-muted">Sieh dir die fertig produzierten Videos zu deinem Buch an und gib sie frei.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>

              {/* e) Sprecher */}
              <Link
                href="/sprecher-texte"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                  <MicrophoneIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Ich bin Sprecher und möchte Texte lesen</strong>
                  <span className="text-sm text-arena-muted">Wähle einen Text, trage deinen Namen ein und lade deine Aufnahme als MP3 hoch.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>

              {/* f) Admin – nur für Admins */}
              {account?.role === "SUPERADMIN" && (
                <button
                  type="button"
                  className={`${optionCls} border-amber-300 bg-amber-50 hover:border-amber-500 hover:bg-amber-50`}
                  onClick={() => setWizardStep("admin")}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Cog6ToothIcon className="size-6" />
                  </div>
                  <div className="grid gap-0.5 flex-1">
                    <strong className="text-[0.95rem]">Admin-Bereich</strong>
                    <span className="text-sm text-amber-700">Einreichungen, Reels, Rezensionen und Schnipsel verwalten.</span>
                  </div>
                  <span className="text-amber-600 self-center shrink-0">→</span>
                </button>
              )}
            </div>

            <div className="rounded-lg border border-arena-border bg-[#f8fafc] p-4 text-[0.85rem] leading-relaxed grid gap-1.5 text-arena-muted mt-1">
              <p className="m-0 font-medium text-arena-text">Wie funktioniert die BuchArena?</p>
              <p className="m-0">
                Wir veröffentlichen auf Instagram, Facebook, Reddit, YouTube, TikTok, Pinterest und LinkedIn.
                Die Texte werden von{" "}
                <Link href="/sprecher" className="text-arena-blue hover:underline">Hörbuchsprechern</Link>{" "}
                gesprochen, die ehrenamtlich für die BuchArena arbeiten.
              </p>
              <p className="m-0">
                Deine Eingaben (Bücher, Rezensionen, Schnipsel, Umfragen) werden öfter verwendet –
                du wirst immer wieder erwähnt und kannst deine Reichweite vergrößern.{" "}
                <Link href="/tipps" className="text-arena-blue hover:underline font-medium">Mehr Infos hier.</Link>
              </p>
            </div>
          </div>
        )}

        {/* ═══ SCHRITT 2a: Reel- oder Video-Tool ═══ */}
        {wizardStep === "video-tools" && (
          <div className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">Welches Tool möchtest du verwenden?</h2>
              <p className="text-sm text-arena-muted mt-1">
                Beide Tools findest du direkt hier im Browser – keine Software nötig.
              </p>
            </div>

            <div className="grid gap-3">
              {/* Reel-Tool */}
              <Link
                href="/social-media/reel-erstellen"
                className="grid gap-2 rounded-xl border-2 border-arena-border p-4 no-underline text-inherit hover:border-arena-blue hover:bg-[#f0f7ff] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-arena-blue">
                    <FilmIcon className="size-6" />
                  </div>
                  <strong className="text-[0.95rem]">Reel-Tool – Kurzvideo</strong>
                  <span className="ml-auto text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5 font-medium">Schnell</span>
                </div>
                <ul className="text-sm text-arena-muted grid gap-1 pl-1">
                  <li>📄 <strong>3 Seiten</strong> mit Buchinformationen ausfüllen</li>
                  <li>🎵 Musik im Hintergrund</li>
                  <li>📐 Format: 9:16 (Instagram Reels, YouTube Shorts, TikTok)</li>
                  <li>⏱ Bearbeitung dauert aktuell <strong>wenige Tage</strong></li>
                </ul>
              </Link>

              {/* Reel + Video-Tool */}
              <Link
                href="/social-media/shorts-erstellen"
                className="grid gap-2 rounded-xl border-2 border-arena-border p-4 no-underline text-inherit hover:border-arena-blue hover:bg-[#f0f7ff] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                    <StarIcon className="size-6" />
                  </div>
                  <strong className="text-[0.95rem]">Reel- und Video-Tool – Kurzvideo + längere Version</strong>
                  <span className="ml-auto text-xs rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 font-medium">Aufwendig</span>
                </div>
                <ul className="text-sm text-arena-muted grid gap-1 pl-1">
                  <li>📄 <strong>5 Seiten</strong> mit Buchinformationen und Sprechertext</li>
                  <li>🎙 Professioneller Sprecher liest den Text vor</li>
                  <li>🎬 Kurzvideo (Reel) <strong>und</strong> längere Version</li>
                  <li>⏱ Bearbeitung dauert aktuell <strong>einige Wochen</strong></li>
                </ul>
              </Link>

            </div>
          </div>
        )}

        {/* ═══ SCHRITT 2b: Inhalte für Social Media ═══ */}
        {wizardStep === "content-tools" && (
          <div className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">Was möchtest du einreichen?</h2>
              <p className="text-sm text-arena-muted mt-1">
                Diese Inhalte werden in regelmäßigen Abständen zu Social-Media-Beiträgen verarbeitet.
              </p>
            </div>

            <div className="grid gap-2.5">
              <Link
                href="/rezensionen"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                  <PencilSquareIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Rezension einreichen</strong>
                  <span className="text-sm text-arena-muted">Teile eine Rezension zu einem Buch – wir veröffentlichen Ausschnitte auf Social Media.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>

              <Link
                href="/schnipsel"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <MusicalNoteIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Schnipsel einreichen</strong>
                  <span className="text-sm text-arena-muted">Teile einen Lieblings-Textabschnitt – optional mit eigener Vorlesung als MP3.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>

              <Link
                href="/social-media/kurz-gefragt"
                className={`${optionCls} no-underline text-inherit`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <ChatBubbleLeftRightIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1">
                  <strong className="text-[0.95rem]">Kurz gefragt – Autorenfragen</strong>
                  <span className="text-sm text-arena-muted">Beantworte kurze Fragen zu dir und deinem Schreibstil – wir machen daraus Social-Media-Beiträge.</span>
                </div>
                <span className="text-arena-muted self-center shrink-0">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* ═══ SCHRITT 2f: Admin-Bereich ═══ */}
        {wizardStep === "admin" && account?.role === "SUPERADMIN" && (
          <div className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">Admin-Bereich</h2>
              <p className="text-sm text-arena-muted mt-1">Verwaltung aller Einreichungen und Inhalte.</p>
            </div>

            <div className="grid gap-2.5">
              <Link
                href="/admin/einreichungen"
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 no-underline text-inherit hover:border-amber-500 transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Cog6ToothIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1 text-[0.95rem]">
                  <strong>Einreichungen verwalten</strong>
                  <span className="text-sm text-arena-muted">Alle eingesendeten Buchvorstellungen – herunterladen, bearbeiten, genehmigen.</span>
                </div>
                <span className="text-amber-600 shrink-0">→</span>
              </Link>

              <Link
                href="/admin/reel-einreichungen"
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 no-underline text-inherit hover:border-amber-500 transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <FilmIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1 text-[0.95rem]">
                  <strong>Reel-Einreichungen verwalten</strong>
                  <span className="text-sm text-arena-muted">Alle eingereichten Kurzvideos (9:16) – Dateien herunterladen und Status verwalten.</span>
                </div>
                <span className="text-amber-600 shrink-0">→</span>
              </Link>

              <Link
                href="/rezensionen/admin"
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 no-underline text-inherit hover:border-amber-500 transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <PencilSquareIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1 text-[0.95rem]">
                  <strong>Rezensionen verwalten</strong>
                  <span className="text-sm text-arena-muted">Alle eingereichten Rezensionen – als bearbeitet markieren, löschen, als XLSX exportieren.</span>
                </div>
                <span className="text-amber-600 shrink-0">→</span>
              </Link>

              <Link
                href="/schnipsel/admin"
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 no-underline text-inherit hover:border-amber-500 transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <MusicalNoteIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1 text-[0.95rem]">
                  <strong>Schnipsel verwalten</strong>
                  <span className="text-sm text-arena-muted">Alle eingereichten Schnipsel – Audio herunterladen, löschen, als XLSX exportieren.</span>
                </div>
                <span className="text-amber-600 shrink-0">→</span>
              </Link>

              <Link
                href="/admin/social-media-content"
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 no-underline text-inherit hover:border-amber-500 transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <ArrowDownTrayIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 flex-1 text-[0.95rem]">
                  <strong>Fertige Inhalte für Social Media</strong>
                  <span className="text-sm text-arena-muted">Bilder und Videos hochladen, die Mitglieder später inklusive Caption-Vorschlägen herunterladen können.</span>
                </div>
                <span className="text-amber-600 shrink-0">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* ═══ OVERLAYS ═══ */}

        {/* Overlay: Sprechertext-Hinweis (Upload / Einreichen) */}
        {showUploadOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl grid gap-4">
              <h2 className="text-lg font-bold">Wichtiger Hinweis</h2>
              <p className="text-[0.95rem] leading-relaxed">
                Wichtig: Schreibe in die Notizen jeder Folie der PowerPoint-Datei
                den jeweiligen Sprechertext. Melde dich via Instagram bei Andrea
                (<strong>@Lernen-mit-YoshiHeart</strong>) wenn du dabei Hilfe brauchst.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn"
                  onClick={() => setShowUploadOverlay(false)}
                >
                  Abbrechen
                </button>
                <Link
                  href="/social-media/upload"
                  className="btn btn-primary no-underline"
                  onClick={() => setShowUploadOverlay(false)}
                >
                  Verstanden &amp; Weiter
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Overlay: Sprechertext-Hinweis (Download) */}
        {showDownloadOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl grid gap-4">
              <h2 className="text-lg font-bold">Wichtiger Hinweis</h2>
              <p className="text-[0.95rem] leading-relaxed">
                Wichtig: Schreibe in die Notizen jeder Folie der PowerPoint-Datei
                den jeweiligen Sprechertext. Melde dich via Instagram bei Andrea
                (<strong>@Lernen-mit-YoshiHeart</strong>) wenn du dabei Hilfe brauchst.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn"
                  onClick={() => setShowDownloadOverlay(false)}
                >
                  Abbrechen
                </button>
                <a
                  href="/Buchempfehlung_vorlage.pptx"
                  download
                  className="btn btn-primary no-underline"
                  onClick={() => setShowDownloadOverlay(false)}
                >
                  Verstanden &amp; Herunterladen
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MEINE EINREICHUNGEN (immer sichtbar, wenn eingeloggt) ═══ */}
        {account && (
          <div className="grid gap-3 pt-2 border-t border-arena-border mt-2">
            <h2 className="text-lg font-bold">Meine Einreichungen</h2>

            {actionError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </p>
            )}

            {loadingSubs ? (
              <p className="text-arena-muted text-sm">Lade Einreichungen …</p>
            ) : submissions.length === 0 ? (
              <p className="text-arena-muted text-sm">
                Du hast noch keine Einreichungen. Reiche deine erste Buchvorstellung ein!
              </p>
            ) : (
              <div className="grid gap-2">
                {submissions.map((sub) => {
                  const statusInfo = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
                  const isEditing = editingId === sub._id;

                  return (
                    <div
                      key={sub._id}
                      className="rounded-lg border border-arena-border p-3 text-[0.95rem]"
                    >
                      {isEditing ? (
                        /* ── Edit-Modus ── */
                        <div className="grid gap-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-sm font-medium">Buchtitel</span>
                              <input
                                className="input-base"
                                value={editForm.bookTitle || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, bookTitle: e.target.value }))
                                }
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-sm font-medium">Autor</span>
                              <input
                                className="input-base"
                                value={editForm.author || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, author: e.target.value }))
                                }
                              />
                            </label>
                            <GenrePicker
                              compact
                              value={editForm.genre || ""}
                              onChange={(v) => setEditForm((f) => ({ ...f, genre: v }))}
                            />
                            <label className="grid gap-1">
                              <span className="text-sm font-medium">Altersempfehlung</span>
                              <input
                                className="input-base"
                                value={editForm.ageRange || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, ageRange: e.target.value }))
                                }
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-sm font-medium">E-Mail</span>
                              <input
                                type="email"
                                className="input-base"
                                value={editForm.contact || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, contact: e.target.value }))
                                }
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-sm font-medium">Instagram</span>
                              <input
                                className="input-base"
                                value={editForm.instagram || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, instagram: e.target.value }))
                                }
                              />
                            </label>
                          </div>
                          <label className="grid gap-1">
                            <span className="text-sm font-medium">Anmerkungen</span>
                            <textarea
                              className="input-base"
                              rows={2}
                              value={editForm.notes || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, notes: e.target.value }))
                              }
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={actionLoading}
                              onClick={handleSaveEdit}
                            >
                              <CheckIcon className="size-4" /> Speichern
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => setEditingId(null)}
                              disabled={actionLoading}
                            >
                              <XMarkIcon className="size-4" /> Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Anzeige-Modus ── */
                        <div className="flex items-start gap-3">
                          <DocumentIcon className="mt-0.5 size-8 shrink-0 text-arena-blue" />
                          <div className="min-w-0 flex-1 grid gap-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="truncate">{sub.bookTitle}</strong>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <span className="text-sm text-arena-muted">
                              von {sub.author} · {sub.genre} · {sub.ageRange}
                            </span>
                            <span className="text-xs text-arena-muted">
                              Datei: {sub.fileName} · Eingereicht am{" "}
                              {new Date(sub.createdAt).toLocaleDateString("de-AT")}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {sub.status === "pending" && (
                              <button
                                className="btn btn-sm"
                                title="Bearbeiten"
                                onClick={() => startEdit(sub)}
                                disabled={actionLoading}
                              >
                                <PencilSquareIcon className="size-4" />
                              </button>
                            )}
                            <button
                              className="btn btn-sm text-red-600 hover:bg-red-50"
                              title="Löschen"
                              onClick={() => handleDelete(sub._id)}
                              disabled={actionLoading}
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <Link href="/" className="text-arena-link text-sm no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
