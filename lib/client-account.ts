export type AccountRole = "USER" | "SUPERADMIN";

export type LoggedInAccount = {
  username: string;
  email: string;
  role: AccountRole;
};

const ACCOUNT_STORAGE_KEY = "logged_in_account";
const ACCOUNT_COOKIE_KEY = "logged_in_account";
const ACCOUNT_CHANGED_EVENT = "account-changed";

function parseCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return rest.join("=");
    }
  }

  return null;
}

function writeAccountCookie(account: LoggedInAccount) {
  const raw = encodeURIComponent(JSON.stringify(account));
  document.cookie = `${ACCOUNT_COOKIE_KEY}=${raw}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax`;
}

function clearAccountCookie() {
  document.cookie = `${ACCOUNT_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function readAccountCookie(): LoggedInAccount | null {
  const raw = parseCookie(ACCOUNT_COOKIE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(raw)) as LoggedInAccount;
  } catch {
    return null;
  }
}

function emitAccountChanged() {
  window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
}

export function getStoredAccount(): LoggedInAccount | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!raw) {
    const fromCookie = readAccountCookie();
    if (fromCookie) {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(fromCookie));
      return fromCookie;
    }

    return null;
  }

  try {
    return JSON.parse(raw) as LoggedInAccount;
  } catch {
    const fromCookie = readAccountCookie();
    if (fromCookie) {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(fromCookie));
      return fromCookie;
    }

    return null;
  }
}

export function setStoredAccount(account: LoggedInAccount) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  writeAccountCookie(account);
  emitAccountChanged();
}

export function clearStoredAccount() {
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  clearAccountCookie();
  emitAccountChanged();
}

export { ACCOUNT_CHANGED_EVENT };
