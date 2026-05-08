import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Inline minimal cache implementation to test without DOM dependencies
function createCache(defaultTTL = 5000) {
  const store = new Map<string, { data: unknown; expiresAt: number }>();

  return {
    cachedFetch<T>(key: string, fetchFn: () => Promise<T>, ttlMs = defaultTTL): Promise<T> {
      const existing = store.get(key);
      if (existing && Date.now() < existing.expiresAt) {
        return Promise.resolve(existing.data as T);
      }
      return fetchFn().then((data) => {
        store.set(key, { data, expiresAt: Date.now() + ttlMs });
        return data;
      });
    },
    invalidate(pattern?: string) {
      if (!pattern) {
        store.clear();
        return;
      }
      for (const key of store.keys()) {
        if (key.includes(pattern)) {
          store.delete(key);
        }
      }
    },
    size() {
      return store.size;
    },
  };
}

describe("fetch-cache", () => {
  let cache: ReturnType<typeof createCache>;

  beforeEach(() => {
    cache = createCache(1000);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("caches successful fetches within TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    const r1 = await cache.cachedFetch("key", fetcher);
    expect(r1).toBe("data");
    expect(fetcher).toHaveBeenCalledTimes(1);

    const r2 = await cache.cachedFetch("key", fetcher);
    expect(r2).toBe("data");
    expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
  });

  it("re-fetches after TTL expires", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    await cache.cachedFetch("key", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1001);
    await cache.cachedFetch("key", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clears entire cache on invalidation without pattern", () => {
    cache.cachedFetch("a", () => Promise.resolve(1));
    cache.cachedFetch("b", () => Promise.resolve(2));
    cache.invalidate();
    expect(cache.size()).toBe(0);
  });

  it("clears only matching keys on invalidation with pattern", async () => {
    const fetcherA = vi.fn().mockResolvedValue([]);
    const fetcherB = vi.fn().mockResolvedValue([]);
    await cache.cachedFetch("contracts", fetcherA);
    await cache.cachedFetch("materials", fetcherB);
    expect(cache.size()).toBe(2);
    cache.invalidate("contract");
    // After invalidating contract, materials should still be in cache
    // (verify by checking fetcher not called again for materials)
    await cache.cachedFetch("materials", fetcherB);
    expect(fetcherB).toHaveBeenCalledTimes(1);
    // contracts should be fetched again
    await cache.cachedFetch("contracts", fetcherA);
    expect(fetcherA).toHaveBeenCalledTimes(2);
  });
});
