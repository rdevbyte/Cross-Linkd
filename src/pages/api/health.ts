import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { authConfigured } from '@/lib/auth';
import { isStaff } from '@/lib/guards';

/**
 * GET /api/health — uptime probe.
 * Anonymous callers get `{ ok, dbConnected }` only. Signed-in staff additionally
 * see configuration diagnostics. Environment variable names and raw driver
 * errors are never exposed to the public.
 */
export const GET: APIRoute = async ({ locals }) => {
  const dbConfigured = hasDatabase();
  let dbConnected = false;
  let dbError: string | null = null;

  if (dbConfigured) {
    try {
      const db = getDb();
      if (db) {
        await db.execute(sql`SELECT 1`);
        dbConnected = true;
      }
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  const body: Record<string, unknown> = { ok: dbConnected, dbConnected };
  if (isStaff(locals.user)) {
    body.hasDatabase = dbConfigured;
    body.detectedKeys = ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'NEON_DATABASE_URL', 'DIRECT_URL']
      .filter((key) => Boolean(process.env[key]?.trim()));
    body.dbError = dbError;
    body.authSecretSet = authConfigured();
    body.adminSetupKeySet = Boolean(process.env.ADMIN_SETUP_KEY?.trim());
    body.mailConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: dbConnected || !dbConfigured ? 200 : 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
