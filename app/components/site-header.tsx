"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

export default function SiteHeader() {
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
    <header className="site-header">
      <div className="site-shell">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
          <Image src="/logo.png" alt="BuchArena" width={32} height={32} style={{ borderRadius: '50%' }} />
          <strong>BuchArena</strong>
        </Link>
        <nav>
          <Link href="/" className="footer-button">
            Startseite
          </Link>
          {loggedIn && (
            <Link href="/meine-buecher" className="footer-button">
              Meine Bücher
            </Link>
          )}
          <Link href="/buecher" className="footer-button">
            Bücher
          </Link>
          <Link href="/autoren" className="footer-button">
            Autoren
          </Link>
          {loggedIn && (
            <Link href="/diskussionen" className="footer-button">
              Diskussionen
            </Link>
          )}
          {loggedIn && (
            <Link href="/support" className="footer-button">
              Support
            </Link>
          )}
          {loggedIn ? (
            <Link href="/profil" className="footer-button">
              Profil
            </Link>
          ) : (
            <Link href="/auth" className="footer-button">
              Anmelden
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
