"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

export default function HomePage() {
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

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-linear-to-br from-arena-blue via-arena-blue-mid to-arena-blue-light px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-[1100px]">
          <Image
            src="/logo.png"
            alt="BuchArena Logo"
            width={140}
            height={140}
            priority
            className="mx-auto mb-6 block rounded-full"
          />
          <h1 className="mb-4 text-[2.4rem] font-extrabold leading-tight max-sm:text-[1.7rem]">
            Willkommen in der <span className="text-arena-yellow">BuchArena</span>
          </h1>
          <p className="mx-auto mb-8 max-w-[600px] text-lg leading-relaxed opacity-90 max-sm:text-base">
            Die Plattform für Autorinnen und Autoren aller Genres.
            <br />
            Veröffentliche deine Bücher, entdecke neue Werke und vernetze
            dich mit anderen Kreativen.
          </p>
          {!loggedIn && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/auth" className="btn btn-primary rounded-lg px-5 py-2.5 text-base">
                Kostenlos registrieren
              </Link>
              <Link href="/buecher" className="btn btn-ghost rounded-lg px-5 py-2.5 text-base">
                Bücher entdecken
              </Link>
            </div>
          )}
          {loggedIn && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/meine-buecher" className="btn btn-primary rounded-lg px-5 py-2.5 text-base">
                Meine Bücher
              </Link>
              <Link href="/buecher" className="btn btn-ghost rounded-lg px-5 py-2.5 text-base">
                Bücher entdecken
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1100px] px-4 py-12 text-center">
        <h2 className="mb-8 text-2xl font-bold">Was ist BuchArena?</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 max-sm:grid-cols-1">
          <div className="rounded-xl border border-arena-border-light bg-white p-7 text-center">
            <span className="mb-3 block text-4xl">📚</span>
            <h3 className="mb-2 text-lg font-semibold">Bücher präsentieren</h3>
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              Erstelle ansprechende Buchseiten mit Cover und Beschreibung
              – und mache dein Werk in der Community&nbsp;sichtbar.
            </p>
          </div>
          <div className="rounded-xl border border-arena-border-light bg-white p-7 text-center">
            <span className="mb-3 block text-4xl">🔍</span>
            <h3 className="mb-2 text-lg font-semibold">Bücher entdecken</h3>
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              Stöbere durch eine wachsende Sammlung an Büchern aller Genres von
              talentierten Autorinnen und Autoren aus der Community.
            </p>
          </div>
          <div className="rounded-xl border border-arena-border-light bg-white p-7 text-center">
            <span className="mb-3 block text-4xl">✍️</span>
            <h3 className="mb-2 text-lg font-semibold">Autoren kennenlernen</h3>
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              Entdecke die Köpfe hinter den Geschichten. Besuche Autorenprofile
              und erfahre mehr über ihre Werke und Inspirationen.
            </p>
          </div>
        </div>
      </section>

      {/* CTA for guests */}
      {!loggedIn && (
        <section className="bg-arena-blue px-4 py-12 text-center text-white">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="mb-2.5 text-2xl">Bereit, deine Geschichte zu erzählen?</h2>
            <p className="mb-6 text-lg opacity-85">
              Erstelle ein kostenloses Konto und werde Teil der BuchArena-Community.
            </p>
            <Link href="/auth" className="btn btn-primary rounded-lg px-5 py-2.5 text-base">
              Jetzt loslegen
            </Link>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="mx-auto max-w-[1100px] px-4 py-10">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/buecher" className="flex items-center gap-2 rounded-lg border border-arena-border bg-white px-5 py-3 font-semibold text-[0.95rem] no-underline transition-colors hover:border-arena-yellow">
            <span className="text-xl">📖</span>
            <span>Alle Bücher</span>
          </Link>
          <Link href="/autoren" className="flex items-center gap-2 rounded-lg border border-arena-border bg-white px-5 py-3 font-semibold text-[0.95rem] no-underline transition-colors hover:border-arena-yellow">
            <span className="text-xl">👥</span>
            <span>Alle Autoren</span>
          </Link>
          {!loggedIn && (
            <Link href="/auth" className="flex items-center gap-2 rounded-lg border border-arena-border bg-white px-5 py-3 font-semibold text-[0.95rem] no-underline transition-colors hover:border-arena-yellow">
              <span className="text-xl">🔑</span>
              <span>Anmelden</span>
            </Link>
          )}
          {loggedIn && (
            <Link href="/profil" className="flex items-center gap-2 rounded-lg border border-arena-border bg-white px-5 py-3 font-semibold text-[0.95rem] no-underline transition-colors hover:border-arena-yellow">
              <span className="text-xl">👤</span>
              <span>Mein Profil</span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
