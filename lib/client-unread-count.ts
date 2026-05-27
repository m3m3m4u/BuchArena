let inFlight: Promise<number> | null = null;
let lastValue = 0;
let lastFetchedAt = 0;

const CLIENT_CACHE_TTL_MS = 10_000;

export async function fetchUnreadCountShared(force = false): Promise<number> {
  const now = Date.now();

  if (!force && now - lastFetchedAt < CLIENT_CACHE_TTL_MS) {
    return lastValue;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = fetch("/api/messages/unread-count", { method: "GET" })
    .then(async (res) => {
      const data = (await res.json()) as { count?: number };
      const count = Number.isFinite(data.count) ? (data.count as number) : 0;
      lastValue = count;
      lastFetchedAt = Date.now();
      return count;
    })
    .catch(() => lastValue)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function invalidateUnreadCountClientCache(): void {
  lastFetchedAt = 0;
}
