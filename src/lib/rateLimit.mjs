// Process-local fallback for development without a database and focused unit tests.
// API routes should call sharedRateLimit.ts so deployed instances share counters.
const buckets = new Map();
const MAX_BUCKETS = 10_000;
const SWEEP_INTERVAL = 64;
let calls = 0;

function maintain(now, force = false) {
  calls += 1;
  if (!force && calls % SWEEP_INTERVAL !== 0 && buckets.size < MAX_BUCKETS) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.lastSeen >= bucket.windowMs) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export function rateLimit(key, limit, windowMs, now = Date.now()) {
  maintain(now);
  const recent = (buckets.get(key)?.timestamps ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, { timestamps: recent, lastSeen: now, windowMs });
    return false;
  }
  recent.push(now);
  buckets.set(key, { timestamps: recent, lastSeen: now, windowMs });
  return true;
}

export function resetRateLimit() {
  buckets.clear();
  calls = 0;
}
