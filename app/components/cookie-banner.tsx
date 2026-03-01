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
  const [showDetails, setShowDetails] = useState(false);
  const [currentChoice, setCurrentChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    const stored = getStoredConsent();
    setCurrentChoice(stored);
    if (!stored) setShowBanner(true);
    function onOpenSettings() {
      setCurrentChoice(getStoredConsent());
      setShowBanner(true);
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
  }, []);

  function onChoose(choice: ConsentChoice) {
    persistConsent(choice);
    setCurrentChoice(choice);
    setShowBanner(false);
    setShowDetails(false);
  }

  return (
    <>
      {showBanner && (
        <div
          className="fixed right-4 bottom-4 z-[1000] w-[calc(100%-2rem)] max-w-[460px] rounded-xl border border-arena-border bg-white p-4 shadow-lg max-sm:right-2 max-sm:bottom-2 max-sm:w-[calc(100%-1rem)]"
          role="dialog"
          aria-label="Cookie-Einwilligung"
        >
          <p className="m-0 text-sm leading-snug font-semibold">Cookie-Einstellungen</p>
          {currentChoice && (
            <p className="mt-1 text-xs text-arena-muted">
              Aktuelle Wahl: <strong>{currentChoice === "all" ? "Alle Cookies" : "Nur notwendige"}</strong>
            </p>
          )}
          <p className="mt-2 text-sm leading-snug text-[#444]">
            Wir verwenden <strong>notwendige Cookies</strong> für die Grundfunktionen der Seite (Login-Status, Cookie-Einwilligung).
            <strong> Optionale Cookies</strong> (z.&nbsp;B. YouTube-Embeds) werden nur mit deiner Einwilligung aktiviert.
          </p>

          <button
            type="button"
            className="mt-2 text-xs text-arena-link hover:underline"
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? "Details ausblenden ▲" : "Details anzeigen ▼"}
          </button>

          {showDetails && (
            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-[#555] space-y-3">
              <div>
                <p className="font-semibold mb-1">Notwendige Cookies (immer aktiv)</p>
                <ul className="pl-4 space-y-0.5 list-disc">
                  <li><strong>cookie_consent</strong> – speichert deine Cookie-Einwilligung (6 Monate)</li>
                  <li><strong>bucharena_account</strong> – hält deinen Login-Status (localStorage)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Optionale Cookies (nur nach Einwilligung)</p>
                <ul className="pl-4 space-y-0.5 list-disc">
                  <li><strong>YouTube-Embeds</strong> – Beim Abspielen von Videos werden Cookies von Google LLC (youtube.com) gesetzt. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-arena-link hover:underline">Datenschutz von Google</a></li>
                </ul>
              </div>
            </div>
          )}

          <p className="mt-2 text-xs text-[#888]">
            Details in der{" "}
            <Link href="/impressum#datenschutz" className="text-arena-link hover:underline">Datenschutzerklärung</Link>.
          </p>

          <div className="mt-3 grid grid-cols-2 max-[340px]:grid-cols-1 gap-2">
            <button type="button" className="btn text-sm" onClick={() => onChoose("essential")}>
              Nur notwendige
            </button>
            <button type="button" className="btn text-sm font-semibold" onClick={() => onChoose("all")}>
              Alle akzeptieren
            </button>
          </div>
        </div>
      )}
    </>
  );
}
