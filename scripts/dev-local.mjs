/**
 * Local dev launcher with embedded Postgres env vars pre-set.
 * Usage:
 *   Terminal 1: npm run db:start   (keep running)
 *   Terminal 2: npm run dev:local
 * Or PowerShell:
 *   Terminal 1: npm run db:start
 *   Terminal 2: npm run dev:local
 */
import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd',
  DIRECT_URL: process.env.DIRECT_URL ?? 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd',
  ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY ?? 'bootstrap-key-local-e2e',
  SHOW_SAMPLE_CONTENT: process.env.SHOW_SAMPLE_CONTENT ?? '1',
};

console.log('Starting dev server with local DB env:');
console.log(`  DATABASE_URL=${env.DATABASE_URL}`);
console.log(`  ADMIN_SETUP_KEY=${env.ADMIN_SETUP_KEY ? '(set)' : '(not set)'}`);
console.log(`  SHOW_SAMPLE_CONTENT=${env.SHOW_SAMPLE_CONTENT}\n`);

const child = spawn('npx', ['astro', 'dev', '--host', '0.0.0.0', '--port', '4321'], {
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
