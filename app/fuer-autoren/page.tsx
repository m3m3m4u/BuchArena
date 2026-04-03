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
          <h1 className="text-xl font-bold text-arena-blue">Für Autoren und Sprecher</h1>
          <p>
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
        "Alle Informationen zur Buchvorstellung auf der Webseite von meridianbooks.",
      icon: BookOpenIcon,
      href: "https://www.meridianbooks.at/autorenvorstellung/",
      external: true,
    },
    {
      title: "Dateien und Infos hochladen",
      description:
        "Lade hier deine Buchvorstellung ein, reiche Rezensionen und Textschnipsel ein oder nimm Sprecher-Texte als MP3 auf. Alle Uploads und Einreichungen an einem Ort.",
      icon: DocumentTextIcon,
      href: "/social-media",
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
        <h1 className="text-xl font-bold text-arena-blue">Für Autoren und Sprecher</h1>
        <p className="text-arena-muted text-[0.95rem]">
          Dein persönlicher Bereich als Autor in der BuchArena.
        </p>

        <div className="rounded-lg border border-arena-border bg-[#f8fafc] p-4 text-[0.9rem] leading-relaxed grid gap-2">
          <p className="m-0">
            Hier kannst du Daten für Social Media eingeben, aus denen wir Reels und Beiträge erstellen.
            Wir veröffentlichen auf Instagram (dort verlinken wir dein Profil), Facebook, Reddit, YouTube, TikTok, Pinterest und LinkedIn.
          </p>
          <p className="m-0">
            Die Texte für die Videos werden von <Link href="/sprecher" className="text-arena-blue hover:underline">Hörbuchsprechern</Link> gesprochen. Sie arbeiten ehrenamtlich
            für die BuchArena und machen damit Werbung für sich.
          </p>
          <p className="m-0">
            Wir werden alle deine Eingaben (zu den Büchern aber auch die Rezensionen, Schnipsel und Umfragen)
            öfter verwenden, du wirst also immer wieder in unseren Kanälen erwähnt und kannst damit deine Reichweite vergrößern.
          </p>
          <p className="m-0">
            Supporte unsere Kanäle (mehr Infos dazu{" "}
            <Link href="/tipps" className="text-arena-blue hover:underline font-semibold">hier</Link>),
            damit auch die Inhalte zu dir und deinen Büchern sichtbarer werden.
          </p>
        </div>

        <div className="grid gap-2.5">
          {sections.map((s) => {
            const cls = "flex items-center gap-3 rounded-lg border border-arena-border p-3 no-underline text-inherit transition-colors hover:border-gray-500 hover:bg-[#fafafa]";
            const inner = (
              <>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arena-bg text-arena-blue">
                  <s.icon className="size-6" />
                </div>
                <div className="grid gap-0.5 text-[0.95rem]">
                  <strong>{s.title}</strong>
                  <span className="text-arena-muted text-sm">{s.description}</span>
                </div>
                <span className="ml-auto shrink-0 text-arena-muted">{s.external ? "↗" : "→"}</span>
              </>
            );
            return s.external ? (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
            ) : (
              <Link key={s.href} href={s.href} className={cls}>{inner}</Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
