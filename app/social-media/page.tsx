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

  const isAdmin = account?.role === "SUPERADMIN";

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

  const videoSections = [
    {
      title: "Vorlage online erstellen",
      description:
        "Erstelle deine Buchvorstellung direkt im Browser – wir generieren automatisch eine fertige PowerPoint-Datei.",
      icon: DocumentArrowDownIcon,
      href: "/social-media/vorlage-erstellen",
    },
    {
      title: "Buchvorstellung einreichen",
      description:
        "Lade eine fertige PowerPoint-Datei hoch. Wir machen daraus Videos und Posts für Social Media.",
      icon: ArrowUpTrayIcon,
      href: "/social-media/upload",
      intercept: true,
    },
    {
      title: "Anleitung für Autoren",
      description:
        "Alle Informationen zur Buchvorstellung auf der Webseite von meridianbooks.",
      icon: BookOpenIcon,
      href: "https://www.meridianbooks.at/autorenvorstellung/",
      external: true,
    },
    {
      title: "Sprecher-Texte",
      description:
        "Das Tool für unsere freiwilligen Sprecher. Wähle einen Text, trage deinen Namen ein und lade deine Aufnahme als MP3 hoch.",
      icon: MicrophoneIcon,
      href: "/sprecher-texte",
    },
  ];

  const weitereAktionen = [
    {
      title: "Beitrag-Tool (Instagram)",
      description:
        "Erstelle schnell einen Social-Media-Post im Format 4:5 oder 1:1 mit Bildvorlage, Text und PNG-Export.",
      icon: PhotoIcon,
      href: "/social-media/beitrag-tool",
    },
    {
      title: "Rezensionen",
      description:
        "Lade hier Rezensionen zu deinem Buch vor. Wir veröffentlichen Ausschnitte davon auf Social Media.",
      icon: PencilSquareIcon,
      href: "/rezensionen",
    },
    {
      title: "Schnipsel",
      description:
        "Teile einen Lieblings-Textabschnitt aus einem Buch – optional mit deiner eigenen Vorlesung als MP3! Wir machen draus Beiträge für Social Media.",
      icon: MusicalNoteIcon,
      href: "/schnipsel",
    },
    {
      title: "Kurz gefragt",
      description:
        "Beantworte kurze Fragen zu dir und deinem Schreibstil – wir machen daraus Social-Media-Beiträge.",
      icon: ChatBubbleLeftRightIcon,
      href: "/social-media/kurz-gefragt",
    },
  ];

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold">BuchArena – Social Media</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Hier findest du alle Werkzeuge rund um deine Buchvorstellung und weitere Aktionen der BuchArena.
        </p>

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

        {/* ═══ SECTION 1: Buch für Video vorbereiten ═══ */}
        <div className="grid gap-3 pt-1">
          <div>
            <h2 className="text-lg font-bold">Buch für Video vorbereiten</h2>
            <p className="text-arena-muted text-sm">
              Um dein Buch als Video auf Social Media vorzustellen, brauchst du eine ausgefüllte PowerPoint-Vorlage.
              Du hast zwei Möglichkeiten: Erstelle die Vorlage bequem über unser <strong>Online-Formular</strong> oder
              lade die <strong>PPTX-Datei</strong> herunter und fülle sie selbst aus.
            </p>
          </div>

          <div className="grid gap-2.5">
            {videoSections.map((section) => {
              const inner = (
                <>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arena-bg text-arena-blue">
                    <section.icon className="size-6" />
                  </div>
                  <div className="grid gap-0.5 text-[0.95rem]">
                    <strong>{section.title}</strong>
                    <span className="text-arena-muted text-sm">{section.description}</span>
                  </div>
                  <span className="ml-auto shrink-0 text-arena-muted">
                    {section.external ? "↗" : "→"}
                  </span>
                </>
              );

              const cls =
                "flex items-center gap-3 rounded-lg border border-arena-border p-3 no-underline text-inherit transition-colors hover:border-gray-500 hover:bg-[#fafafa]";

              return section.external ? (
                <a
                  key={section.href}
                  href={section.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                >
                  {inner}
                </a>
              ) : section.intercept ? (
                <button
                  key={section.href}
                  type="button"
                  onClick={() => setShowUploadOverlay(true)}
                  className={`${cls} w-full text-left cursor-pointer`}
                >
                  {inner}
                </button>
              ) : (
                <Link key={section.href} href={section.href} className={cls}>
                  {inner}
                </Link>
              );
            })}

            {/* Vorlage herunterladen */}
            <button
              type="button"
              onClick={() => setShowDownloadOverlay(true)}
              className="flex w-full items-center gap-3 rounded-lg border border-arena-border p-3 text-[0.95rem] text-inherit hover:border-gray-500 hover:bg-[#fafafa] transition-colors text-left cursor-pointer"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arena-bg text-arena-blue">
                <ArrowDownTrayIcon className="size-6" />
              </div>
              <div className="grid gap-0.5">
                <strong>Vorlage herunterladen (PPTX)</strong>
                <span className="text-arena-muted text-sm">
                  Lade die PowerPoint-Vorlage herunter und fülle sie selbst in PowerPoint aus.
                </span>
              </div>
              <span className="ml-auto shrink-0 text-arena-muted">⬇</span>
            </button>
          </div>

          {/* Video-Links */}
          <Link
            href="/social-media/videos"
            className="flex items-center gap-2 rounded-lg border border-arena-border-light bg-[#fffbe6] p-3 text-[0.95rem] no-underline text-inherit hover:border-arena-yellow transition-colors"
          >
            📹 <span className="font-medium">Videos zur Kontrolle</span>
            <span className="text-xs text-arena-muted ml-auto">Ansehen</span>
          </Link>
        </div>

        {/* ═══ SECTION 2: Weitere Aktionen ═══ */}
        <div className="grid gap-3 pt-2 border-t border-arena-border mt-2">
          <div>
            <h2 className="text-lg font-bold">Weitere Aktionen der BuchArena</h2>
            <p className="text-arena-muted text-sm">
              Diese Informationen werden in längeren Intervallen gesammelt und zu Social-Media-Beiträgen verarbeitet.
            </p>
          </div>

          <div className="grid gap-2.5">
            {weitereAktionen.map((section) => {
              const cls =
                "flex items-center gap-3 rounded-lg border border-arena-border p-3 no-underline text-inherit transition-colors hover:border-gray-500 hover:bg-[#fafafa]";
              return (
                <Link key={section.href} href={section.href} className={cls}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arena-bg text-arena-blue">
                    <section.icon className="size-6" />
                  </div>
                  <div className="grid gap-0.5 text-[0.95rem]">
                    <strong>{section.title}</strong>
                    <span className="text-arena-muted text-sm">{section.description}</span>
                  </div>
                  <span className="ml-auto shrink-0 text-arena-muted">→</span>
                </Link>
              );
            })}

          {/* Admin-Links */}
          {isAdmin && (
            <>
              <Link
                href="/admin/einreichungen"
                className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 no-underline text-inherit transition-colors hover:border-amber-500"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Cog6ToothIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 text-[0.95rem]">
                  <strong>Einreichungen verwalten (Admin)</strong>
                  <span className="text-arena-muted text-sm">
                    Übersicht aller eingesendeten Buchvorstellungen. Dateien
                    herunterladen, bearbeiten und genehmigen.
                  </span>
                </div>
                <span className="ml-auto shrink-0 text-arena-muted">→</span>
              </Link>

              <Link
                href="/rezensionen/admin"
                className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 no-underline text-inherit transition-colors hover:border-amber-500"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <PencilSquareIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 text-[0.95rem]">
                  <strong>Rezensionen verwalten (Admin)</strong>
                  <span className="text-arena-muted text-sm">
                    Übersicht aller eingereichten Rezensionen. Als bearbeitet
                    markieren, löschen und als XLSX exportieren.
                  </span>
                </div>
                <span className="ml-auto shrink-0 text-arena-muted">→</span>
              </Link>

              <Link
                href="/schnipsel/admin"
                className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 no-underline text-inherit transition-colors hover:border-amber-500"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <MusicalNoteIcon className="size-6" />
                </div>
                <div className="grid gap-0.5 text-[0.95rem]">
                  <strong>Schnipsel verwalten (Admin)</strong>
                  <span className="text-arena-muted text-sm">
                    Übersicht aller eingereichten Schnipsel. Audio herunterladen,
                    löschen und als XLSX exportieren.
                  </span>
                </div>
                <span className="ml-auto shrink-0 text-arena-muted">→</span>
              </Link>
            </>
          )}
        </div>
        </div>

        {/* Meine Einreichungen */}
        {account && (
          <div className="grid gap-3 pt-2">
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
