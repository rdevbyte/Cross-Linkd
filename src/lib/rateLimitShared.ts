/**
 * Rate limiting that holds across serverless instances.
 *
 * `rateLimit()` (in-memory) only sees the requests that reach one warm instance,
 * so an attacker who is spread over several instances gets a multiple of the
 * intended budget on sign-in, password reset, and so on. This wrapper first asks the
 * cheap per-instance limiter (which absorbs floods without touching the
 * database) and then records the hit in the `rate_limits` table, so the budget is
 * enforced globally. If the database is missing or unhappy (no DATABASE_URL, the
 * 0006 migration not applied yet) it degrades to the in-memory answer instead of
 * failing the request.
 */
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { rateLimit } from '@/lib/rateLimit.mjs';

let warned = false;

export async function rateLimitShared(rawKey: string, limit: number, windowMs: number): Promise<boolean> {
  const key = rawKey.length > 256 ? rawKey.slice(0, 256) : rawKey;
  if (!rateLimit(key, limit, windowMs)) return false;

  const db = getDb();
  if (!db) return true;

  try {
    const windowSeconds = windowMs / 1000;
    const result: unknown = await db.execute(sql`
      INSERT INTO rate_limits (key, window_start, hits)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN rate_limits.window_start <= now() - (${windowSeconds}::float8 * interval '1 second')
                    THEN 1 ELSE rate_limits.hits + 1 END,
        window_start = CASE WHEN rate_limits.window_start <= now() - (${windowSeconds}::float8 * interval '1 second')
                            THEN now() ELSE rate_limits.window_start END
      RETURNING hits`);
    const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] })?.rows ?? []) as Array<{ hits?: number | string }>;
    const hits = Number(rows[0]?.hits ?? 0);

    // Opportunistic housekeeping so the table stays small without a cron job.
    if (Math.random() < 0.01) {
      await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
    }
    return hits <= limit;
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn('[rateLimitShared] database counter unavailable, using per-instance limits only:', err instanceof Error ? err.message : err);
    }
    return true;
  }
}
