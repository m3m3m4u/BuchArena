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
    <header className="sticky top-0 z-50 border-b border-arena-border bg-white">
      <div className="site-shell flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline text-inherit">
          <Image src="/logo.png" alt="BuchArena" width={32} height={32} className="rounded-full" />
          <strong>BuchArena</strong>
        </Link>
        <nav className="flex gap-3.5">
          <Link href="/" className="btn">Startseite</Link>
          {loggedIn && <Link href="/meine-buecher" className="btn">Meine Bücher</Link>}
          <Link href="/buecher" className="btn">Bücher</Link>
          <Link href="/autoren" className="btn">Autoren</Link>
          {loggedIn && <Link href="/diskussionen" className="btn">Diskussionen</Link>}
          {loggedIn && <Link href="/social-media" className="btn">Social Media</Link>}
          {loggedIn && <Link href="/support" className="btn">Support</Link>}
          {loggedIn ? (
            <Link href="/profil" className="btn">Profil</Link>
          ) : (
            <Link href="/auth" className="btn">Anmelden</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
