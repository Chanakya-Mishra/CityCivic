import { getCache } from "@vercel/functions";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

// L1 In-Memory singleton cache (persists across warm serverless invocations)
const memoryCache = new Map<string, CacheEntry<any>>();
const tagToKeys = new Map<string, Set<string>>();

// In-flight Promise deduplication (prevents cache stampede / dog-piling)
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Server-Side Cache Engine for CityCivic
 * Combines sub-millisecond L1 in-memory caching with Vercel Runtime Cache
 * and granular tag-based invalidation.
 */
export const serverCache = {
  /**
   * Retrieve cached item from L1 memory or Vercel Runtime Cache
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. L1 Memory Check (sub-millisecond)
    const local = memoryCache.get(key);
    if (local) {
      if (local.expiresAt > now) {
        return local.value as T;
      }
      memoryCache.delete(key);
    }

    // 2. Vercel Runtime Cache Check
    try {
      const vc = getCache();
      const val = await vc.get(key);
      if (val !== null && val !== undefined) {
        // Hydrate L1 memory for subsequent warm calls
        memoryCache.set(key, { value: val, expiresAt: now + 30000, tags: [] });
        return val as T;
      }
    } catch {
      // Fallback gracefully to null if runtime cache is inaccessible
    }

    return null;
  },

  /**
   * Store item with TTL in seconds and optional invalidation tags
   */
  async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // 1. Store in L1 memory
    memoryCache.set(key, { value, expiresAt, tags });

    for (const tag of tags) {
      let keys = tagToKeys.get(tag);
      if (!keys) {
        keys = new Set();
        tagToKeys.set(tag, keys);
      }
      keys.add(key);
    }

    // Guard L1 size to avoid memory growth in long-running processes (max 500 entries)
    if (memoryCache.size > 500) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }

    // 2. Store in Vercel Runtime Cache
    try {
      const vc = getCache();
      await vc.set(key, value, {
        ttl: ttlSeconds,
        tags,
      });
    } catch {
      // Ignore runtime cache store error
    }
  },

  /**
   * Remember pattern: returns cached data or executes fetcher, caches result, and returns.
   * Includes simultaneous in-flight promise deduplication to prevent cache stampedes.
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    tags: string[] = []
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Check if another parallel request is already executing this exact fetch
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const fresh = await fetcher();
        await this.set(key, fresh, ttlSeconds, tags);
        return fresh;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, promise);
    return promise;
  },

  /**
   * Expire all cache items associated with one or more tags
   */
  async expireTags(tags: string | string[]): Promise<void> {
    const tagList = Array.isArray(tags) ? tags : [tags];

    // 1. Invalidate L1 memory
    for (const tag of tagList) {
      const keys = tagToKeys.get(tag);
      if (keys) {
        for (const k of keys) {
          memoryCache.delete(k);
        }
        tagToKeys.delete(tag);
      }
    }

    // 2. Invalidate Vercel Runtime Cache
    try {
      const vc = getCache();
      await vc.expireTag(tagList);
    } catch {
      // Ignore
    }
  },

  /**
   * Delete a single specific cache key
   */
  async delete(key: string): Promise<void> {
    memoryCache.delete(key);
    try {
      const vc = getCache();
      await vc.delete(key);
    } catch {
      // Ignore
    }
  },

  /**
   * Clear all L1 memory cache (useful for test resets)
   */
  clearMemory(): void {
    memoryCache.clear();
    tagToKeys.clear();
  },
};

/**
 * Standard HTTP Cache-Control response headers for Vercel Edge CDN & browser
 */
export function cacheHeaders(sMaxAge: number = 60, staleWhileRevalidate: number = 300) {
  return {
    "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    "CDN-Cache-Control": `public, s-maxage=${sMaxAge}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${sMaxAge}`,
  };
}
