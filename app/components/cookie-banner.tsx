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
    if (!stored) setShowBanner(true);
    function onOpenSettings() { setShowBanner(true); }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
  }, []);

  function onChoose(choice: ConsentChoice) {
    persistConsent(choice);
    setShowBanner(false);
  }

  return (
    <>
      {showBanner && (
        <div
          className="fixed right-4 bottom-4 z-[1000] w-[calc(100%-2rem)] max-w-[420px] rounded-xl border border-arena-border bg-white p-3.5 max-sm:right-2 max-sm:bottom-2 max-sm:w-[calc(100%-1rem)]"
          role="dialog"
          aria-label="Cookie-Einwilligung"
        >
          <p className="m-0 text-sm leading-snug">
            Wir verwenden notwendige Cookies für die Grundfunktionen der Seite.
            Optionale Cookies werden nur mit deiner Einwilligung gesetzt.
          </p>
          <p className="mt-1.5 text-sm">
            Details im <Link href="/impressum" className="text-arena-link hover:underline">Impressum</Link> und in der{" "}
            <Link href="/datenschutz" className="text-arena-link hover:underline">Datenschutzerklärung</Link>.
          </p>
          <div className="mt-3 grid grid-cols-2 max-[340px]:grid-cols-1 gap-2">
            <button type="button" className="btn" onClick={() => onChoose("essential")}>
              Nur notwendige
            </button>
            <button type="button" className="btn" onClick={() => onChoose("all")}>
              Alle akzeptieren
            </button>
          </div>
        </div>
      )}
    </>
  );
}
