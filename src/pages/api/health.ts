import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';

/** GET /api/health — safe status check for database & auth setup. */
export const GET: APIRoute = async () => {
  const dbConfigured = hasDatabase();
  const foundKeys = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'NEON_DATABASE_URL',
    'DIRECT_URL',
  ].filter((key) => Boolean(process.env[key]?.trim()));

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

  const allKeys = Object.keys(process.env)
    .filter((k) => !k.startsWith('npm_') && !k.startsWith('__') && !k.includes('PATH'))
    .sort();

  return new Response(
    JSON.stringify(
      {
        ok: dbConnected,
        hasDatabase: dbConfigured,
        detectedKeys: foundKeys,
        dbConnected,
        dbError,
        authSecretSet: Boolean(process.env.AUTH_SECRET?.trim()),
        adminSetupKeySet: Boolean(process.env.ADMIN_SETUP_KEY?.trim()),
        visibleEnvKeys: allKeys,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
