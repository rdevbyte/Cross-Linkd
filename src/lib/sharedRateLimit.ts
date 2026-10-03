import { createHash } from 'node:crypto';
import { lt, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { sharedRateLimits } from '@/db/schema';
import { rateLimit } from '@/lib/rateLimit.mjs';

let calls = 0;
const CLEANUP_EVERY = 512;

/**
 * Cross-instance fixed-window rate limiter backed by Postgres atomic upserts.
 * Only a SHA-256 key is persisted. The old process-local limiter is retained
 * for no-database local development; configured production DB failures fail
 * closed until the required migration has been applied.
 */
export async function sharedRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
  if (!hasDatabase()) return process.env.NODE_ENV === 'production' ? false : rateLimit(key, limit, windowMs, now);
  const db = getDb();
  if (!db) return process.env.NODE_ENV === 'production' ? false : rateLimit(key, limit, windowMs, now);

  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + windowMs * 2);
  const bucketKey = createHash('sha256').update(key).digest('hex');

  try {
    const [row] = await db.insert(sharedRateLimits).values({
      bucketKey,
      windowStart,
      hitCount: 1,
      expiresAt,
    }).onConflictDoUpdate({
      target: [sharedRateLimits.bucketKey, sharedRateLimits.windowStart],
      set: {
        hitCount: sql`${sharedRateLimits.hitCount} + 1`,
        expiresAt,
        updatedAt: new Date(now),
      },
    }).returning({ hitCount: sharedRateLimits.hitCount });

    calls += 1;
    if (calls % CLEANUP_EVERY === 0) {
      // Cleanup must never change the result of a successful counter increment.
      try {
        await db.delete(sharedRateLimits).where(lt(sharedRateLimits.expiresAt, new Date(now)));
      } catch (cleanupError) {
        console.error('[rate-limit] stale counter cleanup failed', {
          message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }
    return Number(row?.hitCount ?? limit + 1) <= limit;
  } catch (error) {
    console.error('[rate-limit] shared counter unavailable', {
      message: error instanceof Error ? error.message : String(error),
      production: process.env.NODE_ENV === 'production',
    });
    return process.env.NODE_ENV === 'production' ? false : rateLimit(key, limit, windowMs, now);
  }
}
