"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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

  function onLogout() {
    clearStoredAccount();
  }

  return (
    <footer className="sm:sticky sm:bottom-0 z-50 border-t border-arena-border bg-white">
      <div className="site-shell flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-4 text-[0.82rem] sm:text-[0.95rem]">
          {account?.role === "SUPERADMIN" && (
            <Link href="/admin" className="btn btn-sm sm:btn">User-Übersicht</Link>
          )}
          {account && (
            <Link href="/nachrichten" className="btn btn-sm sm:btn relative">
              Nachrichten
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-arena-danger text-white text-[0.65rem] font-bold px-1 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          <Link href="/impressum" className="btn btn-sm sm:btn">Impressum</Link>
          <Link href="/datenschutz" className="btn btn-sm sm:btn">Datenschutz</Link>
          <button type="button" className="btn btn-sm sm:btn" onClick={openCookieSettings}>Cookies</button>
        </div>
        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
          {account ? (
            <>
              <span className="hidden sm:inline">Online als: <strong>{account.username}</strong></span>
              <span className="sm:hidden"><strong>{account.username}</strong></span>
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
