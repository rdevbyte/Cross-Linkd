/**
 * Database client — pooled Postgres for Vercel serverless.
 * Uses the postgres.js driver (ESM-safe, works with Neon/Supabase/any PG).
 * Returns `null` when DATABASE_URL is unset so the site can run
 * on bundled sample data (preview / demo mode).
 */
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

let cached: Db | null | undefined;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    cached = null;
    return cached;
  }
  try {
    // Serverless-friendly: few connections, short idle timeout.
    // IMPORTANT: use the provider's *pooled* URL for DATABASE_URL.
    const client = postgres(url, { max: 4, idle_timeout: 20, connect_timeout: 10 });
    cached = drizzle(client, { schema });
  } catch {
    cached = null;
  }
  return cached;
}

export type Database = Db;
