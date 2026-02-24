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
    <main className="home-page">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <Image
            src="/logo.png"
            alt="BuchArena Logo"
            width={140}
            height={140}
            priority
            className="home-hero-logo"
          />
          <h1 className="home-hero-title">
            Willkommen in der <span className="home-brand">BuchArena</span>
          </h1>
          <p className="home-hero-sub">
            Die Plattform für Autorinnen und Autoren aller Genres.
            <br />
            Veröffentliche deine Bücher, entdecke neue Werke und vernetze
            dich mit anderen Kreativen.
          </p>
          {!loggedIn && (
            <div className="home-hero-actions">
              <Link href="/auth" className="home-btn home-btn-primary">
                Kostenlos registrieren
              </Link>
              <Link href="/buecher" className="home-btn home-btn-secondary">
                Bücher entdecken
              </Link>
            </div>
          )}
          {loggedIn && (
            <div className="home-hero-actions">
              <Link href="/meine-buecher" className="home-btn home-btn-primary">
                Meine Bücher
              </Link>
              <Link href="/buecher" className="home-btn home-btn-secondary">
                Bücher entdecken
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="home-features">
        <h2 className="home-section-title">Was ist BuchArena?</h2>
        <div className="home-cards">
          <div className="home-card">
            <span className="home-card-icon">📚</span>
            <h3>Bücher präsentieren</h3>
            <p>
              Erstelle ansprechende Buchseiten mit Cover und Beschreibung
              – und mache dein Werk in der Community&nbsp;sichtbar.
            </p>
          </div>
          <div className="home-card">
            <span className="home-card-icon">🔍</span>
            <h3>Bücher entdecken</h3>
            <p>
              Stöbere durch eine wachsende Sammlung an Büchern aller Genres von
              talentierten Autorinnen und Autoren aus der Community.
            </p>
          </div>
          <div className="home-card">
            <span className="home-card-icon">✍️</span>
            <h3>Autoren kennenlernen</h3>
            <p>
              Entdecke die Köpfe hinter den Geschichten. Besuche Autorenprofile
              und erfahre mehr über ihre Werke und Inspirationen.
            </p>
          </div>
        </div>
      </section>

      {/* CTA for guests */}
      {!loggedIn && (
        <section className="home-cta">
          <h2>Bereit, deine Geschichte zu erzählen?</h2>
          <p>
            Erstelle ein kostenloses Konto und werde Teil der BuchArena-Community.
          </p>
          <Link href="/auth" className="home-btn home-btn-primary">
            Jetzt loslegen
          </Link>
        </section>
      )}

      {/* Quick links */}
      <section className="home-quick-links">
        <div className="home-quick-grid">
          <Link href="/buecher" className="home-quick-card">
            <span className="home-quick-icon">📖</span>
            <span>Alle Bücher</span>
          </Link>
          <Link href="/autoren" className="home-quick-card">
            <span className="home-quick-icon">👥</span>
            <span>Alle Autoren</span>
          </Link>
          {!loggedIn && (
            <Link href="/auth" className="home-quick-card">
              <span className="home-quick-icon">🔑</span>
              <span>Anmelden</span>
            </Link>
          )}
          {loggedIn && (
            <Link href="/profil" className="home-quick-card">
              <span className="home-quick-icon">👤</span>
              <span>Mein Profil</span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
