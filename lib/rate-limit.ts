/**
 * Einfaches In-Memory Rate-Limiting.
 * Für Produktion mit mehreren Instanzen: Redis-basiertes Rate-Limiting verwenden.
 */

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
const MAX_ENTRIES = 50_000;

// Cleanup alle 5 Minuten
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Prüft ob ein Request erlaubt ist.
 * @returns `true` wenn erlaubt, `false` wenn Rate-Limit überschritten.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();

  // Speicherlimit: bei Überschreitung abgelaufene Einträge sofort bereinigen
  if (store.size >= MAX_ENTRIES) {
    for (const [k, e] of store) {
      if (e.resetAt <= now) store.delete(k);
    }
    // Falls immer noch zu voll, älteste Einträge verwerfen
    if (store.size >= MAX_ENTRIES) {
      store.clear();
    }
  }

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
