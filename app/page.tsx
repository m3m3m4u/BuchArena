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
          {!loggedIn && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/auth" className="btn btn-primary rounded-lg px-5 py-2.5 text-base">
                Kostenlos registrieren
              </Link>
            </div>
          )}

          <div className="mt-10 border-t border-white/20 pt-6">
            <p className="mb-4 text-sm opacity-80">
              Ein Projekt von{" "}
              <a href="https://lernarena.org" target="_blank" rel="noopener noreferrer" className="text-arena-yellow hover:underline font-semibold">lernarena.org</a>
              {" "}und{" "}
              <a href="https://meridianbooks.at" target="_blank" rel="noopener noreferrer" className="text-arena-yellow hover:underline font-semibold">meridianbooks.at</a>
            </p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              <a href="https://lernarena.org" target="_blank" rel="noopener noreferrer">
                <Image src="/logolang.png" alt="LernArena" width={240} height={75} />
              </a>
              <a href="https://meridianbooks.at" target="_blank" rel="noopener noreferrer">
                <Image src="/logoweiss.png" alt="meridianbooks" width={192} height={60} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1100px] px-4 py-12 text-center">
        <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
          <div className="rounded-xl border border-arena-border-light bg-white px-7 py-5 text-left">
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              <strong>Bücher präsentieren</strong> – Erstelle ansprechende Buchseiten mit Cover und Beschreibung
              und mache dein Werk in der Community&nbsp;sichtbar.
            </p>
          </div>
          <div className="rounded-xl border border-arena-border-light bg-white px-7 py-5 text-left">
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              <strong>Bücher entdecken</strong> – Stöbere durch eine wachsende Sammlung an Büchern aller Genres von
              talentierten Autorinnen und Autoren aus der Community.
            </p>
          </div>
          <div className="rounded-xl border border-arena-border-light bg-white px-7 py-5 text-left">
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              <strong>Autoren kennenlernen</strong> – Entdecke die Köpfe hinter den Geschichten. Besuche Autorenprofile
              und erfahre mehr über ihre Werke und Inspirationen.
            </p>
          </div>
          <div className="rounded-xl border border-arena-border-light bg-white px-7 py-5 text-left">
            <p className="m-0 text-[0.95rem] leading-relaxed text-arena-text">
              <strong>Sprecher entdecken</strong> – Finde talentierte Sprecherinnen und Sprecher, die deinem Buch eine
              Stimme geben – oder biete selbst deine Stimme&nbsp;an.
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
      )
      }

    </main>
  );
}
