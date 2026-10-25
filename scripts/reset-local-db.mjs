/**
 * Local dev only — drops and recreates the local test database, then applies
 * all migrations and (optionally) seeds the taxonomy.
 *
 * Usage:
 *   node scripts/reset-local-db.mjs            # drop/create + migrate
 *   node scripts/reset-local-db.mjs --seed     # + seed taxonomy
 *
 * IMPORTANT: Embedded Postgres must be running first:
 *   Terminal 1: node scripts/start-pg.mjs
 *   Terminal 2: npm run db:reset
 *
 * Refuses to run against a database whose URL is not a localhost/127.0.0.1
 * host, so it can never touch a production database.
 */
import { Client } from 'pg';

const LOCAL_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd';

const url = new URL(LOCAL_URL);
const host = url.hostname;
const isLocalHost = host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1' || host === '[::1]';
if (!isLocalHost) {
  console.error(`Refusing to reset — host "${host}" is not local.`);
  process.exit(1);
}

const db = url.pathname.replace(/^\//, '');
const admin = new Client({ host, port: url.port || 5432, user: url.username, password: url.password, database: 'postgres' });

try {
  await admin.connect();
} catch (err) {
  if (err.code === 'ECONNREFUSED') {
    console.error(`
❌ Could not connect to Postgres at ${host}:${url.port || 5432}
   The embedded database is not running.

   Fix (2 terminals):
     Terminal 1 (keep running):  node scripts/start-pg.mjs
     Terminal 2:                 npm run db:reset

   Or in PowerShell:
     Terminal 1:  node scripts/start-pg.mjs
     Terminal 2:  npm run db:reset

   If this is first run, embedded-postgres will download binaries (~100MB)
   and init data/db/ — this takes ~30s the first time.
`);
    process.exit(1);
  }
  throw err;
}

const drop = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [db]);
if (drop.rowCount > 0) {
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [db],
  );
  await admin.query(`DROP DATABASE "${db}"`);
  console.log(`Dropped database "${db}".`);
}
await admin.query(`CREATE DATABASE "${db}"`);
console.log(`Created database "${db}".`);
await admin.end();

const { execSync } = await import('node:child_process');
const env = { ...process.env, DATABASE_URL: LOCAL_URL, DIRECT_URL: LOCAL_URL };
execSync('npx tsx src/db/migrate.ts', { env, stdio: 'inherit' });
if (process.argv.includes('--seed')) {
  execSync('npx tsx src/db/seed.ts', { env, stdio: 'inherit' });
}
console.log('✅ Local database reset complete.');
