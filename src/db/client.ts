/**
 * Database client — pooled Postgres for Vercel serverless.
 * Uses the postgres.js driver (ESM-safe, works with Neon/Supabase/any PG).
 * Returns `null` when no database URL is set so the site can run
 * on bundled sample data (preview / demo mode).
 */
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

let cached: Db | null | undefined;

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    process.env.DIRECT_URL?.trim()
  );
}

export function hasDatabase(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = getDatabaseUrl();
  if (!url) {
    cached = null;
    return cached;
  }
  try {
    // Serverless-friendly: few connections, short idle timeout.
    // IMPORTANT: use the provider's pooled URL for high concurrent traffic.
    const client = postgres(url, { max: 4, idle_timeout: 20, connect_timeout: 10 });
    cached = drizzle(client, { schema });
  } catch (err) {
    console.error('[getDb] connection init failed:', err);
    cached = null;
  }
  return cached;
}

export type Database = Db;
