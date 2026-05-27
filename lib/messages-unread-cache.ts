type CacheEntry = {
  count: number;
  expiresAt: number;
};

const unreadCache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 15_000;

export function getCachedUnreadCount(username: string): number | null {
  const key = username.toLowerCase();
  const entry = unreadCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    unreadCache.delete(key);
    return null;
  }

  return entry.count;
}

export function setCachedUnreadCount(username: string, count: number, ttlMs = DEFAULT_TTL_MS): void {
  unreadCache.set(username.toLowerCase(), {
    count,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateUnreadCountCache(username: string): void {
  unreadCache.delete(username.toLowerCase());
}

export function invalidateUnreadCountCacheMany(usernames: string[]): void {
  for (const username of usernames) {
    invalidateUnreadCountCache(username);
  }
}
