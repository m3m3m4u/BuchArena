"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ACCOUNT_CHANGED_EVENT, getStoredAccount, type LoggedInAccount } from "@/lib/client-account";
import { CONSENT_CHANGED_EVENT, getStoredConsent } from "@/lib/cookie-consent";

function subscribeAccount(onChange: () => void) {
  window.addEventListener(ACCOUNT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ACCOUNT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// A primitive snapshot stays stable even though getStoredAccount parses JSON.
const getAccountSnapshot = () => JSON.stringify(getStoredAccount());
const getServerAccountSnapshot = () => "null";

export function useStoredAccount(): LoggedInAccount | null {
  const snapshot = useSyncExternalStore(subscribeAccount, getAccountSnapshot, getServerAccountSnapshot);
  return useMemo(() => JSON.parse(snapshot) as LoggedInAccount | null, [snapshot]);
}

function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// undefined means hydration has not read the browser's stored choice yet.
const getServerConsentSnapshot = () => undefined;

export function useStoredConsent() {
  return useSyncExternalStore(subscribeConsent, getStoredConsent, getServerConsentSnapshot);
}
