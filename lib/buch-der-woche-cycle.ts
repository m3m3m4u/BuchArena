import type { CycleInfo } from "@/lib/buch-der-woche-types";

/**
 * Ermittelt den aktuellen Zyklus und die nächste Auslosung.
 * Zyklus-Wechsel: Jeden Sonntag um 18:00:00 Uhr deutscher Zeit (Europe/Berlin).
 */
export function getBdwCycleInfo(refDate = new Date()): CycleInfo {
  const berlinFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = berlinFmt.formatToParts(refDate);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const weekday = map.weekday;
  const hour = parseInt(map.hour === "24" ? "0" : map.hour, 10);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  let daysAgo: number;
  if (dayIndex === 0) {
    daysAgo = hour >= 18 ? 0 : 7;
  } else {
    daysAgo = dayIndex;
  }

  const cycleStartDate = new Date(refDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const startFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(cycleStartDate);
  const currentCycleKey = `cycle-${startFmt}`;

  let daysUntilNext: number;
  if (dayIndex === 0 && hour < 18) {
    daysUntilNext = 0;
  } else {
    daysUntilNext = 7 - (dayIndex === 0 ? 0 : dayIndex);
  }

  const nextDrawDate = new Date(refDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
  const nextDrawFmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(nextDrawDate);

  const formattedNextDraw = `${nextDrawFmt} ab 18:00 Uhr`;

  return {
    currentCycleKey,
    cycleStartDateStr: startFmt,
    nextDrawDateStr: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(nextDrawDate),
    formattedNextDraw,
  };
}

/**
 * Berechnet das Gewicht (die Ziehungs-Tickets) für eine Bewerbung.
 * Keine Emojis in Texten oder Ausgaben.
 */
export function calculateBdwWeight(
  bookmarks: number,
  timesSelected: number = 0,
  lastSelectedAt?: Date | string | null
): { weight: number; baseWeight: number; penaltyMultiplier: number } {
  const safeBookmarks = Math.max(0, bookmarks || 0);
  const baseWeight = 10 + safeBookmarks;

  let penaltyMultiplier = 1.0;

  if (timesSelected > 0) {
    penaltyMultiplier = 1 / (timesSelected * 5);

    if (lastSelectedAt) {
      const lastDate = new Date(lastSelectedAt);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 28) {
        penaltyMultiplier *= 0.5;
      }
    }
  }

  const calculated = Math.max(0.1, Math.round(baseWeight * penaltyMultiplier * 10) / 10);
  return {
    weight: calculated,
    baseWeight,
    penaltyMultiplier,
  };
}
