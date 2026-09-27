/**
 * Migration runner — applies drizzle/*.sql in filename order using the DIRECT_URL
 * (unpooled) connection. Usage: DATABASE_URL=... DIRECT_URL=... npm run db:migrate
 *
 * Applied files are recorded in `schema_migrations`, so each file runs once.
 * Databases migrated before the table existed are handled by the idempotent
 * statement execution below (objects that already exist are tolerated), after
 * which every file is recorded and never re-executed.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL (or DATABASE_URL) is required to migrate.');
  const pool = new Pool({ connectionString: url });
  const dir = join(process.cwd(), 'drizzle');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  if (!files.length) {
    console.log('No .sql migrations found. Run `npm run db:generate` first to generate DDL from the schema.');
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const done = new Set(
    (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name),
  );
  // Idempotent-friendly: run statement-by-statement, tolerating objects that
  // already exist (re-runs / partially applied baselines). Real errors still fail.
  const IGNORE_CODES = new Set(['42710', '42P07', '42701', '42P16', '42P06', '42723']);
  for (const f of files) {
    if (done.has(f)) {
      console.log(`↷ Skipping ${f} (already applied)`);
      continue;
    }
    console.log(`→ Applying ${f}…`);
    const ddl = await readFile(join(dir, f), 'utf8');
    const statements = ddl.split('--> statement-breakpoint').map((x) => x.trim()).filter(Boolean);
    let applied = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        applied++;
      } catch (err) {
        const code = (err as { code?: string }).code ?? '';
        if (IGNORE_CODES.has(code)) continue;
        throw err;
      }
    }
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [f]);
    console.log(`  ✓ ${f} (${applied}/${statements.length} statements applied)`);
  }
  await pool.end();
  console.log('✅ Migrations complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
