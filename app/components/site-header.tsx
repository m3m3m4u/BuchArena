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
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      setLoggedIn(!!getStoredAccount());
      const match = document.cookie.match(/(?:^|;\s*)impersonating_as=([^;]+)/);
      setImpersonating(match ? decodeURIComponent(match[1]) : null);
    };
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

  async function stopImpersonate() {
    const res = await fetch("/api/admin/users/stop-impersonate", { method: "POST" });
    const data = await res.json() as { user?: { username: string; email: string; role: string } };
    if (res.ok && data.user) {
      const { setStoredAccount } = await import("@/lib/client-account");
      setStoredAccount(data.user as import("@/lib/client-account").LoggedInAccount);
      setImpersonating(null);
      window.location.href = "/admin";
    }
  }

  const publicLinks = (
    <>
      <Link href="/buecher" className="header-link-public w-full sm:w-auto">Bücher</Link>
      <Link href="/autoren" className="header-link-public w-full sm:w-auto">Autoren</Link>
      <Link href="/sprecher" className="header-link-public w-full sm:w-auto">Sprecher</Link>
      <Link href="/blogger" className="header-link-public w-full sm:w-auto">Blogger</Link>
      <Link href="/testleser" className="header-link-public w-full sm:w-auto">Testleser</Link>
      <Link href="/lektoren" className="header-link-public w-full sm:w-auto">Lektoren</Link>
      <Link href="/news" className="header-link-public w-full sm:w-auto">News</Link>
      <Link href="/kalender" className="header-link-public w-full sm:w-auto">Kalender</Link>
      {!loggedIn && <Link href="/auth" className="header-link-public w-full sm:w-auto font-bold">Anmelden</Link>}
    </>
  );

  const loggedInLinks = (
    <>
      <Link href="/lesezeichen" className="header-link-member w-full sm:w-auto">Lesezeichen</Link>
      <Link href="/diskussionen" className="header-link-member w-full sm:w-auto">Treffpunkt</Link>
      <Link href="/tipps" className="header-link-member w-full sm:w-auto">Tipps</Link>
      <Link href="/nachrichten" className="header-link-member w-full sm:w-auto">
        Nachrichten{unreadCount > 0 && <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[var(--color-arena-blue)] text-[var(--color-arena-yellow)] text-[0.65rem] font-bold min-w-[18px] h-[18px] px-1 leading-none">{unreadCount}</span>}
      </Link>
      <Link href="/profil" className="header-link-member w-full sm:w-auto">Mein Profil</Link>
    </>
  );

  const socialMediaLink = (
    <Link href="/fuer-autoren" className="header-link-member w-full sm:w-auto">Reels und Beiträge für Social Media</Link>
  );

  return (
    <header className="flex-shrink-0 z-50">
      {/* Impersonation-Banner */}
      {impersonating && (
        <div style={{ background: "#f59e0b", color: "#1e1b4b" }} className="flex items-center justify-between px-4 py-1.5 text-sm font-medium">
          <span>👤 Du siehst die Seite als <strong>{impersonating}</strong></span>
          <button
            type="button"
            onClick={stopImpersonate}
            className="ml-4 px-3 py-0.5 rounded text-xs font-bold border border-[#1e1b4b]/30 hover:bg-[#d97706] transition-colors"
          >
            ← Zurück zu Admin
          </button>
        </div>
      )}
      {/* Obere Zeile – für alle sichtbar (blau) */}
      <div className="border-b border-[var(--color-arena-blue-light)]" style={{ background: "var(--color-arena-blue)", color: "#fff" }}>
        <div className="site-shell flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline text-white">
            <Image src="/logo.png" alt="BuchArena" width={32} height={32} className="rounded-full" />
            <strong>BuchArena</strong>
          </Link>

          {/* Desktop */}
          <nav className="hidden sm:flex gap-1.5">{publicLinks}</nav>

          {/* Hamburger (mobil) */}
          <button
            type="button"
            className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] bg-transparent border-none cursor-pointer"
            onClick={toggle}
            aria-label="Menü öffnen"
          >
            <span className={`block w-5 h-0.5 bg-white rounded transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white rounded transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white rounded transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Untere Zeile – nur für eingeloggte (gelb) */}
      {loggedIn && (
        <div className="border-b border-[var(--color-arena-yellow)]" style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
          <div className="site-shell">
            <nav className="hidden sm:flex gap-1.5 items-center py-0.5">
              {loggedInLinks}
              <span className="flex-1" />
              {socialMediaLink}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile-Drawer */}
      {menuOpen && (
        <>
          <div className="sm:hidden fixed inset-0 top-[53px] bg-black/30 z-40" onClick={toggle} />
          <nav className="sm:hidden fixed top-[53px] right-0 bottom-0 w-[280px] max-w-[85vw] z-50 border-l border-arena-border overflow-y-auto flex flex-col gap-0 p-0">
            <div className="flex flex-col gap-1.5 p-4" style={{ background: "var(--color-arena-blue)", color: "#fff" }}>
              {publicLinks}
            </div>
            {loggedIn && (
              <div className="flex flex-col gap-1.5 p-4" style={{ background: "var(--color-arena-yellow)", color: "var(--color-arena-blue)" }}>
                {loggedInLinks}
                {socialMediaLink}
              </div>
            )}
          </nav>
        </>
      )}
    </header>
  );
}
