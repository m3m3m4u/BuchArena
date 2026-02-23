export type ConsentChoice = "essential" | "all";

export const CONSENT_KEY = "cookie_consent";
export const CONSENT_COOKIE_NAME = "cookie_consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";

const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30 * 6;

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "essential" || stored === "all") {
    return stored;
  }

  return null;
}

export function persistConsent(choice: ConsentChoice) {
  localStorage.setItem(CONSENT_KEY, choice);
  document.cookie = `${CONSENT_COOKIE_NAME}=${choice}; Max-Age=${SIX_MONTHS_IN_SECONDS}; Path=/; SameSite=Lax`;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
