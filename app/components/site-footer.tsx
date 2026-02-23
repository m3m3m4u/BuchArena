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
    <footer className="site-footer">
      <div className="site-shell">
        <div className="footer-links-row">
          {account?.role === "SUPERADMIN" && (
            <Link href="/admin" className="footer-button">
              User-Übersicht
            </Link>
          )}
          <Link href="/impressum" className="footer-button">
            Impressum
          </Link>
          <Link href="/datenschutz" className="footer-button">
            Datenschutz
          </Link>
          <button type="button" className="footer-button" onClick={openCookieSettings}>
            Cookies
          </button>
        </div>

        <div className="account-box">
          {account ? (
            <>
              <span>
                Online als: <strong>{account.username}</strong>
              </span>
              <button type="button" onClick={onLogout}>
                Ausloggen
              </button>
            </>
          ) : (
            <span>Nicht eingeloggt</span>
          )}
        </div>
      </div>
    </footer>
  );
}
