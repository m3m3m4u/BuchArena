"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  clearStoredAccount,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import { openCookieSettings } from "@/lib/cookie-consent";

export default function SiteFooter() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread-count", { method: "GET" });
      const data = (await res.json()) as { count?: number };
      setUnreadCount(data.count ?? 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function updateFromStorage() {
      const acc = getStoredAccount();
      setAccount(acc);
      if (!acc) setUnreadCount(0);
    }
    updateFromStorage();
    window.addEventListener("storage", updateFromStorage);
    window.addEventListener(ACCOUNT_CHANGED_EVENT, updateFromStorage);
    return () => {
      window.removeEventListener("storage", updateFromStorage);
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, updateFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!account) return;
    void fetchUnread();
    const interval = setInterval(() => void fetchUnread(), 30_000);
    return () => clearInterval(interval);
  }, [account, fetchUnread]);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function onLogout() {
    clearStoredAccount();
  }

  return (
    <footer className="flex-shrink-0 z-50 border-t border-arena-border bg-white">
      <div className="site-shell flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[0.82rem] sm:text-[0.95rem]">
          {/* Social media icons */}
          <div className="flex items-center gap-2">
            <a href="https://www.instagram.com/bucharena365/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#888] hover:text-[#E1306C] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61582857106661" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#888] hover:text-[#1877F2] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>
            </a>
            <a href="https://www.youtube.com/channel/UClRXr_luGtkJwoVK2N-pWHQ/" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-[#888] hover:text-[#FF0000] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>
            </a>
            <a href="https://www.reddit.com/user/BuchArena/" target="_blank" rel="noopener noreferrer" aria-label="Reddit" className="text-[#888] hover:text-[#FF4500] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm6.34 13.2a1.8 1.8 0 0 1-.27.95 4.46 4.46 0 0 1-1.8 1.6c-1.1.6-2.6.95-4.27.95s-3.16-.35-4.27-.95a4.46 4.46 0 0 1-1.8-1.6 1.8 1.8 0 0 1-.27-.95c0-.45.17-.87.46-1.2a1.65 1.65 0 0 1-.18-.75 1.7 1.7 0 0 1 2.9-1.2c1-.6 2.22-.96 3.55-1.01l.8-3.7a.34.34 0 0 1 .4-.27l2.64.56a1.18 1.18 0 1 1-.13.6l-2.36-.5-.7 3.28c1.28.07 2.46.43 3.43 1.01a1.7 1.7 0 0 1 2.9 1.2c0 .27-.06.52-.18.75.3.33.46.75.46 1.2h-.1ZM9.5 12.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm5 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm-4.92 3.38a.33.33 0 0 1 .46 0c.47.47 1.34.7 1.96.7s1.49-.23 1.96-.7a.33.33 0 0 1 .46.47c-.6.6-1.6.9-2.42.9s-1.82-.3-2.42-.9a.33.33 0 0 1 0-.47Z"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/112014980/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-[#888] hover:text-[#0A66C2] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77A1.75 1.75 0 0 0 0 1.73v20.54A1.75 1.75 0 0 0 1.77 24h20.45A1.75 1.75 0 0 0 24 22.27V1.73A1.75 1.75 0 0 0 22.22 0Z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@bucharena" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-[#888] hover:text-black transition-colors">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.32 6.95A4.46 4.46 0 0 1 16.5 4.5V4h-3.23v11.25a2.62 2.62 0 1 1-1.78-2.48V9.45a5.94 5.94 0 1 0 5.05 5.88V9.9a7.65 7.65 0 0 0 4.46 1.43V8.1a4.46 4.46 0 0 1-1.68-1.15Z"/></svg>
            </a>
          </div>

          {/* Desktop: text links inline */}
          <div className="hidden sm:contents">
            {account?.role === "SUPERADMIN" && (
              <Link href="/admin" className="btn">User-Übersicht</Link>
            )}
            {account && (
              <Link href="/nachrichten" className="btn relative">
                Nachrichten
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-arena-danger text-white text-[0.65rem] font-bold px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link href="/info" className="btn">Info</Link>
            <Link href="/impressum" className="btn">Impressum &amp; Datenschutz</Link>
            <button type="button" className="btn" onClick={openCookieSettings}>Cookies</button>
          </div>

          {/* Mobile: 3-dot menu */}
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              type="button"
              className="btn btn-sm flex items-center gap-1"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menü"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/></svg>
            </button>
            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[200px] rounded-xl border border-arena-border-light bg-white shadow-lg py-1.5 z-50">
                {account?.role === "SUPERADMIN" && (
                  <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)}>User-Übersicht</Link>
                )}
                {account && (
                  <Link href="/nachrichten" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                    Nachrichten
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-arena-danger text-white text-[0.6rem] font-bold px-1 leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link href="/info" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Info</Link>
                <Link href="/impressum" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Impressum &amp; Datenschutz</Link>
                <button type="button" className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { openCookieSettings(); setMenuOpen(false); }}>Cookies</button>
                {account && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <div className="px-4 py-1.5 text-xs text-gray-400"><strong>{account.username}</strong></div>
                    <button type="button" className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { onLogout(); setMenuOpen(false); }}>Ausloggen</button>
                  </>
                )}
                {!account && (
                  <div className="px-4 py-1.5 text-xs text-gray-400">Nicht eingeloggt</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: account status */}
        <div className="hidden sm:flex items-center gap-2.5 text-sm">
          {account ? (
            <>
              <span>Online als: <strong>{account.username}</strong></span>
              <button type="button" className="btn btn-sm" onClick={onLogout}>Ausloggen</button>
            </>
          ) : (
            <span>Nicht eingeloggt</span>
          )}
        </div>
      </div>
    </footer>
  );
}
