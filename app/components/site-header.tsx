"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getStoredAccount, ACCOUNT_CHANGED_EVENT } from "@/lib/client-account";
import { fetchUnreadCountShared } from "@/lib/client-unread-count";

export default function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [verlageCount, setVerlageCount] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const pathname = usePathname();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderHeight(header.getBoundingClientRect().height));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

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

  // Verlage count (cached)
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: { verlageCount?: number }) => setVerlageCount(d.verlageCount ?? 0))
      .catch(() => {});
  }, []);

  // Unread count polling
  useEffect(() => {
    if (!loggedIn) { setUnreadCount(0); return; }
    const fetchCount = (force = false) =>
      fetchUnreadCountShared(force)
        .then((count) => setUnreadCount(count))
        .catch(() => {});
    fetchCount(false);
    const interval = setInterval(() => fetchCount(true), 30_000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  // Menü bei Seitenwechsel schließen
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Der Inhalt scrollt im eigenen Container, nicht im Body.
  useEffect(() => {
    if (!menuOpen) return;
    const content = document.getElementById("main-content");
    const previousOverflow = content?.style.overflowY ?? "";
    if (content) content.style.overflowY = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      if (content) content.style.overflowY = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("keydown", onKeyDown);
    };
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
      <Link href="/buecher" className="header-link-public w-full xl:w-auto">Bücher</Link>
      <Link href="/autoren" className="header-link-public w-full xl:w-auto">Autoren</Link>
      <Link href="/sprecher" className="header-link-public w-full xl:w-auto">Sprecher</Link>
      <Link href="/blogger" className="header-link-public w-full xl:w-auto">Blogger</Link>
      <Link href="/testleser" className="header-link-public w-full xl:w-auto">(Test)Leser</Link>
      <Link href="/lektoren" className="header-link-public w-full xl:w-auto">Lektoren</Link>
      {verlageCount > 0 && <Link href="/verlage" className="header-link-public w-full xl:w-auto">Verlage</Link>}
        <Link href="/news" className="header-link-public w-full xl:w-auto">News</Link>
        <Link href="/blog" className="header-link-public w-full xl:w-auto">Blog</Link>
        <Link href="/podcast" className="header-link-public w-full xl:w-auto">Podcast</Link>
      <Link href="/kalender" className="header-link-public w-full xl:w-auto">Kalender</Link>
      {!loggedIn && <Link href="/auth" className="header-link-public w-full xl:w-auto font-bold">Anmelden</Link>}
    </>
  );

  const loggedInLinks = (
    <>
      <Link href="/lesezeichen" className="header-link-member w-full xl:w-auto">Lesezeichen</Link>
      <Link href="/diskussionen" className="header-link-member w-full xl:w-auto">Treffpunkt</Link>
      <Link href="/buchzirkel" className="header-link-member w-full xl:w-auto">Buchzirkel</Link>
      <Link href="/gewinnspiel" className="header-link-member w-full xl:w-auto">Gewinnspiele</Link>
      <Link href="/tipps" className="header-link-member w-full xl:w-auto">Tipps</Link>
      <Link href="/nachrichten" className="header-link-member w-full xl:w-auto">
        Nachrichten{unreadCount > 0 && <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[var(--color-arena-blue)] text-[var(--color-arena-yellow)] text-[0.65rem] font-bold min-w-[18px] h-[18px] px-1 leading-none">{unreadCount}</span>}
      </Link>
      <Link href="/profil" className="header-link-member w-full xl:w-auto">Mein Profil</Link>
    </>
  );

  const socialMediaLink = (
    <Link href="/social-media" className="header-link-member w-full xl:w-auto">Reels und Beiträge für Social Media</Link>
  );

  return (
    <header ref={headerRef} className="flex-shrink-0 z-50">
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
          <nav aria-label="Hauptnavigation" className="hidden xl:flex gap-1.5">{publicLinks}</nav>

          {/* Hamburger (mobil) */}
          <button
            ref={menuButtonRef}
            type="button"
            className="xl:hidden flex flex-col justify-center items-center w-11 h-11 gap-[5px] bg-transparent border-none cursor-pointer"
            onClick={toggle}
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <span className={`block w-5 h-0.5 bg-white rounded transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white rounded transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white rounded transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Untere Zeile – nur für eingeloggte (weich/weiß) */}
      {loggedIn && (
        <div className="hidden xl:block border-b border-arena-border-light" style={{ background: "#ffffff", color: "var(--color-arena-blue)" }}>
          <div className="site-shell">
            <nav aria-label="Mitgliedernavigation" className="flex gap-1.5 items-center py-0.5">
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
          <div className="xl:hidden fixed inset-0 bg-black/30 z-40" style={{ top: headerHeight }} onClick={toggle} />
          <nav id="mobile-navigation" aria-label="Mobile Navigation" className="xl:hidden fixed right-0 bottom-0 w-[320px] max-w-[90vw] z-50 border-l border-arena-border overflow-y-auto overscroll-contain flex flex-col gap-0 p-0 bg-white" style={{ top: headerHeight }}>
            <div className="flex flex-col gap-1.5 p-4" style={{ background: "var(--color-arena-blue)", color: "#fff" }}>
              {publicLinks}
            </div>
            {loggedIn && (
              <div className="flex flex-col gap-1.5 p-4 border-t border-arena-border-light" style={{ background: "#ffffff", color: "var(--color-arena-blue)" }}>
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
