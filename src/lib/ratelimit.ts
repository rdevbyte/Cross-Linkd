/**
 * Lightweight in-memory rate limiter for API routes.
 *
 * Per-IP, per-route token buckets with a fixed window. This is a first line
 * of defense in the app itself; for hard limits on the public deployment,
 * combine with Vercel Firewall / WAF rules (see LAUNCH_CHECKLIST B5).
 *
 * Notes:
 * - On serverless platforms each instance keeps its own counters, so the
 *   effective limit is per-instance; a WAF enforces the global limit.
 * - Disabled outside production so local development and the e2e suites are
 *   never throttled.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15-minute windows
const MAX_BUCKETS = 20_000;

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export function ipOf(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = (fwd?.split(',')[0] ?? '').trim();
  return ip || 'unknown';
}

/** @returns false when the caller exceeds `limit` requests per window. */
export function rateLimitHit(route: string, request: Request, limit: number): boolean {
  if (process.env.NODE_ENV !== 'production') return false; // dev/e2e: never throttle
  const key = `${route}:${ipOf(request)}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
  }
  b.count++;
  return b.count > limit;
}

/** Per-route budgets (requests / 15 min / IP). */
export const LIMITS = {
  auth: 20,        // signin / signup / magic-link / reset
  submit: 20,      // listing creation / updates
  review: 10,      // review submission
  contact: 10,     // contact / feedback / claims
} as const;
