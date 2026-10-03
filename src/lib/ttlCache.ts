/**
 * Tiny single-value TTL cache with request coalescing.
 *
 * - Concurrent callers during a refresh share ONE loader call (no stampede when
 *   many visitors arrive just after the entry expires).
 * - A loader failure is never cached. The caller gets the last good value when
 *   there is one (stale-on-error) and otherwise the error.
 * - `ttlMs <= 0` disables caching (every call loads), which keeps local dev and the
 *   e2e suites free of surprising staleness.
 */
export interface TtlCache<T> {
  get(): Promise<T>;
  invalidate(): void;
}

export function createTtlCache<T>(
  loader: () => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now,
): TtlCache<T> {
  let value: { data: T; at: number } | undefined;
  let inFlight: Promise<T> | undefined;
  let generation = 0;

  const refresh = (): Promise<T> => {
    const startedIn = generation;
    const promise = loader()
      .then((data) => {
        // An invalidation that happened while loading means this data may already be stale.
        if (startedIn === generation) value = { data, at: now() };
        return data;
      })
      .finally(() => {
        if (inFlight === promise) inFlight = undefined;
      });
    inFlight = promise;
    return promise;
  };

  return {
    async get() {
      if (ttlMs > 0 && value && now() - value.at < ttlMs) return value.data;
      if (ttlMs > 0 && inFlight) return inFlight;
      try {
        return await refresh();
      } catch (err) {
        if (value) return value.data;
        throw err;
      }
    },
    invalidate() {
      generation++;
      value = undefined;
      inFlight = undefined;
    },
  };
}
