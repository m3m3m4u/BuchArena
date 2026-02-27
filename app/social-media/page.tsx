"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import {
  Cog6ToothIcon,
  BookOpenIcon,
  PencilSquareIcon,
  MusicalNoteIcon,
  MicrophoneIcon,
  ArrowUpTrayIcon,
  LifebuoyIcon,
} from "@heroicons/react/24/outline";

export default function SocialMediaPage() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);

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

  const isAdmin = account?.role === "SUPERADMIN";

  const sections = [
    {
      title: "Anleitung für Autoren",
      description:
        "Alle Informationen zur Buchvorstellung auf der Webseite von Martina.",
      icon: BookOpenIcon,
      href: "https://www.meridianbooks.at/autorenvorstellung/",
      external: true,
    },
    {
      title: "Buchvorstellung einreichen",
      description:
        "Du hast eine PowerPoint-Präsentation zu einem Buch erstellt? Teile sie mit uns und werde Teil der BuchArena!",
      icon: ArrowUpTrayIcon,
      href: "/social-media/upload",
    },
    {
      title: "Rezensionen",
      description:
        "Teile deine Meinung zu einem Buch! Schreibe eine Rezension und hilf anderen bei der Buchauswahl.",
      icon: PencilSquareIcon,
      href: "/rezensionen",
    },
    {
      title: "Schnipsel",
      description:
        "Teile einen Lieblings-Textabschnitt aus einem Buch – optional mit deiner eigenen Vorlesung als MP3!",
      icon: MusicalNoteIcon,
      href: "/schnipsel",
    },
    {
      title: "Sprecher-Texte",
      description:
        "Texte für Sprecher: Wähle einen Text, trage deinen Namen ein und lade deine Aufnahme als MP3 hoch.",
      icon: MicrophoneIcon,
      href: "/sprecher-texte",
    },
    {
      title: "Support",
      description:
        "Brauchst du Hilfe oder hast eine Frage? Schreibe uns eine Nachricht über das Support-Formular.",
      icon: LifebuoyIcon,
      href: "/support",
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

        <div className="pt-2">
          <Link href="/" className="text-arena-link text-sm no-underline hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
