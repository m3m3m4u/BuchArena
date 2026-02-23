"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getStoredConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  persistConsent,
  type ConsentChoice,
} from "@/lib/cookie-consent";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setShowBanner(true);
    }

    function onOpenSettings() {
      setShowBanner(true);
    }

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  function onChoose(choice: ConsentChoice) {
    persistConsent(choice);
    setShowBanner(false);
  }

  return (
    <>
      {showBanner && (
        <div className="cookie-banner" role="dialog" aria-label="Cookie-Einwilligung">
          <p>
            Wir verwenden notwendige Cookies für die Grundfunktionen der Seite.
            Optionale Cookies werden nur mit deiner Einwilligung gesetzt.
          </p>
          <p className="cookie-links">
            Details im <Link href="/impressum">Impressum</Link> und in der{" "}
            <Link href="/datenschutz">Datenschutzerklärung</Link>.
          </p>
          <div className="cookie-actions">
            <button type="button" onClick={() => onChoose("essential")}>
              Nur notwendige
            </button>
            <button type="button" onClick={() => onChoose("all")}>
              Alle akzeptieren
            </button>
          </div>
        </div>
      )}
    </>
  );
}
