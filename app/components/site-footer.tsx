"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  clearStoredAccount,
  getStoredAccount,
  type LoggedInAccount,
} from "@/lib/client-account";
import { openCookieSettings } from "@/lib/cookie-consent";

export default function SiteFooter() {
  const [account, setAccount] = useState<LoggedInAccount | null>(null);

  useEffect(() => {
    function updateFromStorage() {
      setAccount(getStoredAccount());
    }
    updateFromStorage();
    window.addEventListener("storage", updateFromStorage);
    window.addEventListener(ACCOUNT_CHANGED_EVENT, updateFromStorage);
    return () => {
      window.removeEventListener("storage", updateFromStorage);
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, updateFromStorage);
    };
  }, []);

  function onLogout() {
    clearStoredAccount();
  }

  return (
    <footer className="sticky bottom-0 z-50 border-t border-arena-border bg-white">
      <div className="site-shell flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[0.95rem]">
          {account?.role === "SUPERADMIN" && (
            <Link href="/admin" className="btn">User-Übersicht</Link>
          )}
          <Link href="/impressum" className="btn">Impressum</Link>
          <Link href="/datenschutz" className="btn">Datenschutz</Link>
          <button type="button" className="btn" onClick={openCookieSettings}>Cookies</button>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
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
