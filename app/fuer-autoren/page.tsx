"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";
import {
  BookOpenIcon,
  DocumentTextIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export default function FuerAutorenPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(!!getStoredAccount());
    sync();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!loggedIn) {
    return (
      <main className="top-centered-main">
        <section className="card">
          <h1 className="text-xl font-bold text-arena-blue">Für Autoren</h1>
          <p className="text-arena-muted">
            Bitte <Link href="/auth" className="text-arena-link hover:underline">melde dich an</Link>, um diesen Bereich zu nutzen.
          </p>
        </section>
      </main>
    );
  }

  const sections = [
    {
      title: "Anleitungen",
      description:
        "Informationen und Schritt-für-Schritt-Anleitungen rund um deine Buchvorstellung: wie du dein Buch einreichst, Social-Media-Beiträge erstellen lässt und Rezensionen oder Schnipsel hochlädst.",
      icon: BookOpenIcon,
      href: "/social-media",
    },
    {
      title: "Dateien",
      description:
        "Lade hier deine Buchvorstellung ein, reiche Rezensionen und Textschnipsel ein oder nimm Sprecher-Texte als MP3 auf. Alle Uploads und Einreichungen an einem Ort.",
      icon: DocumentTextIcon,
      href: "/social-media/upload",
    },
    {
      title: "Profil",
      description:
        "Dein Autorenprofil verwalten: Name, Biografie, Genres, Social-Media-Links und Profilbild. Sichtbarkeit einstellen und dein öffentliches Profil anpassen.",
      icon: UserCircleIcon,
      href: "/profil",
    },
  ];

  return (
    <main className="top-centered-main">
      <section className="card">
        <h1 className="text-xl font-bold text-arena-blue">Für Autoren</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Dein persönlicher Bereich als Autor in der BuchArena.
        </p>

        <div className="grid gap-2.5">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 rounded-lg border border-arena-border p-3 no-underline text-inherit transition-colors hover:border-gray-500 hover:bg-[#fafafa]"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arena-bg text-arena-blue">
                <s.icon className="size-6" />
              </div>
              <div className="grid gap-0.5 text-[0.95rem]">
                <strong>{s.title}</strong>
                <span className="text-arena-muted text-sm">{s.description}</span>
              </div>
              <span className="ml-auto shrink-0 text-arena-muted">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
