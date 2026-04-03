"use client";

import { useEffect } from "react";
import {
  getStoredAccount,
  clearStoredAccount,
  setStoredAccount,
} from "@/lib/client-account";

/**
 * Prüft beim App-Start ob die Server-Session noch gültig ist.
 * Falls nicht (401), wird der Client-State bereinigt, sodass
 * User nicht in einem "eingeloggt aber kaputt"-Zustand hängen.
 */
export default function SessionGuard() {
  useEffect(() => {
    const account = getStoredAccount();
    if (!account) return; // nicht eingeloggt → nichts zu prüfen

    let cancelled = false;

    fetch("/api/auth/check", { credentials: "same-origin" })
      .then(async (res) => {
        if (cancelled) return;

        if (res.status === 401) {
          // Server-Session ungültig → Client aufräumen
          clearStoredAccount();
          return;
        }

        if (res.ok) {
          // Daten synchronisieren falls sich Rolle o.ä. geändert hat
          const data = await res.json();
          if (
            data.username !== account.username ||
            data.email !== account.email ||
            data.role !== account.role
          ) {
            setStoredAccount({
              username: data.username,
              email: data.email,
              role: data.role,
            });
          }
        }
      })
      .catch(() => {
        // Netzwerkfehler → nicht ausloggen, könnte temporär sein
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
