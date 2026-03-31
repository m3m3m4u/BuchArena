"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getStoredAccount } from "@/lib/client-account";

/**
 * Unsichtbare Komponente, die bei jedem Seitenwechsel einen
 * Page-View an /api/analytics/track sendet.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef("");

  useEffect(() => {
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    const referrer = document.referrer || "";
    const account = getStoredAccount();

    // Fire-and-forget – kein await nötig
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pathname, referrer, username: account?.username || "" }),
    }).catch((err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Analytics] Track failed:", err);
      }
    });
  }, [pathname]);

  return null;
}
