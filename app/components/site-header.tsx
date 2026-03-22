"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";

export default function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

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

  // Unread count polling
  useEffect(() => {
    if (!loggedIn) { setUnreadCount(0); return; }
    const fetchCount = () =>
      fetch("/api/messages/unread-count")
        .then((r) => r.json())
        .then((d: { count: number }) => setUnreadCount(d.count))
        .catch(() => {});
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  // Menü bei Seitenwechsel schließen
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Body-Scroll sperren wenn Menü offen
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const toggle = useCallback(() => setMenuOpen((v) => !v), []);

  const links = (
    <>
      <Link href="/buecher" className="btn w-full sm:w-auto">Bücher</Link>
      <Link href="/autoren" className="btn w-full sm:w-auto">Autoren</Link>
      <Link href="/sprecher" className="btn w-full sm:w-auto">Sprecher</Link>
      <Link href="/blogger" className="btn w-full sm:w-auto">Blogger</Link>
      <Link href="/quiz" className="btn w-full sm:w-auto">Quiz</Link>
      <Link href="/buchempfehlung" className="btn w-full sm:w-auto">Buchtipp</Link>
      <Link href="/lesezeichen" className="btn w-full sm:w-auto">Lesezeichen</Link>
      {loggedIn && <Link href="/diskussionen" className="btn w-full sm:w-auto">Treffpunkt</Link>}
      {loggedIn && <Link href="/fuer-autoren" className="btn w-full sm:w-auto">für Autoren und Sprecher</Link>}
      {!loggedIn && <Link href="/auth" className="btn w-full sm:w-auto">Anmelden</Link>}
    </>
  );

  return (
    <header className="flex-shrink-0 z-50 border-b border-arena-border bg-white">
      <div className="site-shell flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline text-inherit">
          <Image src="/logo.png" alt="BuchArena" width={32} height={32} className="rounded-full" />
          <strong>BuchArena</strong>
        </Link>

        {/* Desktop-Navigation */}
        <nav className="hidden sm:flex gap-1.5">{links}</nav>

        {/* Hamburger-Button (nur mobil) */}
        <button
          type="button"
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] bg-transparent border-none cursor-pointer"
          onClick={toggle}
          aria-label="Menü öffnen"
        >
          <span className={`block w-5 h-0.5 bg-arena-text rounded transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`block w-5 h-0.5 bg-arena-text rounded transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-arena-text rounded transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile-Drawer */}
      {menuOpen && (
        <>
          <div className="sm:hidden fixed inset-0 top-[53px] bg-black/30 z-40" onClick={toggle} />
          <nav className="sm:hidden fixed top-[53px] right-0 bottom-0 w-[280px] max-w-[85vw] bg-white z-50 border-l border-arena-border overflow-y-auto flex flex-col gap-1.5 p-4">
            {links}
          </nav>
        </>
      )}
    </header>
  );
}
