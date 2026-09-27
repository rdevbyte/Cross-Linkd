import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

// Cluster lives in the repo's git-ignored data/db/ (override with CL_PG_DATA_DIR).
const dbDir = process.env.CL_PG_DATA_DIR || fileURLToPath(new URL('../data/db', import.meta.url));
const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  port: 5433,
  user: 'crosslinkd',
  password: 'cl_local_dev',
  database: 'crosslinkd',
  persistent: true,
});

if (!existsSync(dbDir)) {
  console.log('Initialising database directory...');
  await pg.initialise();
}
await pg.start();
console.log('Embedded Postgres started on port 5433.');

process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await pg.stop();
  process.exit(0);
});

setInterval(() => {}, 1000 * 60);
