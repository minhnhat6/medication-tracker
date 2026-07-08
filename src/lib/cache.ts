/**
 * Lightweight in-memory TTL cache for serverless functions.
 * Each Lambda/Edge invocation has its own memory, so this cache
 * lives for the duration of the warm instance (typically minutes).
 *
 * Usage:
 *   const result = await memCache.get("key", 30, () => fetchData());
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemCache {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expiresAt > now) {
      return entry.value;
    }

    const value = await fetcher();
    this.store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return value;
  }

  invalidate(key: string) {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

// Singleton per warm instance
const globalForCache = globalThis as unknown as { memCache?: MemCache };
export const memCache = globalForCache.memCache ?? new MemCache();
if (process.env.NODE_ENV !== "production") globalForCache.memCache = memCache;
