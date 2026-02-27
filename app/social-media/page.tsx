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
  LifebuoyIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
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

  const sections = [
    {
      title: "Anleitung für Autoren",
      description:
        "Alle Informationen zur Buchvorstellung auf der Webseite von meridianbooks.",
      icon: BookOpenIcon,
      href: "https://www.meridianbooks.at/autorenvorstellung/",
      external: true,
    },
    {
      title: "Buchvorstellung einreichen",
      description:
        "Erstelle eine Präsentation nach unserer Vorlage. Wir machen daraus Videos und Posts für Social Media.",
      icon: ArrowUpTrayIcon,
      href: "/social-media/upload",
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
      title: "Sprecher-Texte",
      description:
        "Das Tool für unsere freiwilligen Sprecher. Wähle einen Text, trage deinen Namen ein und lade deine Aufnahme als MP3 hoch.",
      icon: MicrophoneIcon,
      href: "/sprecher-texte",
    },
    {
      title: "Support",
      description:
        "Du möchtest die Community um Support für dein neues Buch oder sonst einen Beitrag bitten? Hier ist der passende Platz dafür.",
      icon: LifebuoyIcon,
      href: "/support",
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
          Hier kannst du deine Buchvorstellung einreichen oder bestehende
          Social-Media-Links ansehen.
        </p>

        {/* Video-Link */}
        <div className="rounded-lg border border-arena-border-light bg-[#fffbe6] p-3 text-[0.95rem]">
          📹{" "}
          <a
            href="https://schuleamsee1-my.sharepoint.com/:f:/g/personal/matthias_gmeiner_schuleamsee_at/IgD_ZzlIgo3HSqK1F90s3ybJAeekYfUhNvBv6qqhywVzqHY?e=F0nXCY"
            target="_blank"
            rel="noopener noreferrer"
            className="text-arena-link hover:underline"
          >
            Fertige Videos zur Kontrolle
          </a>
        </div>

        {/* Sections */}
        <div className="grid gap-2.5">
          {sections.map((section) => {
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
            ) : (
              <Link key={section.href} href={section.href} className={cls}>
                {inner}
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
