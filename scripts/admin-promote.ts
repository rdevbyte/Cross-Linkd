/**
 * Promote or demote an existing user to/from administrator — the recommended
 * production flow. Runs server-side only; never exposed over HTTP.
 *
 * Usage:
 *   DIRECT_URL=postgres://… npm run admin:promote -- owner@example.com
 *   DIRECT_URL=postgres://… npm run admin:promote -- --revoke owner@example.com
 *   DIRECT_URL=postgres://… npm run admin:promote -- --list
 */
import { Client } from 'pg';

const ROLES = new Set(['super_admin', 'moderator', 'verification_reviewer', 'content_editor', 'org_admin', 'listing_owner', 'member']);

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');
  const list = args.includes('--list');
  const email = args.find((a) => !a.startsWith('--'))?.toLowerCase().trim();
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('DIRECT_URL (or DATABASE_URL) is required.');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (list) {
      const admins = await client.query(
        `select email, display_name, role, created_at from users where role in ('super_admin','moderator','verification_reviewer','content_editor') and deleted_at is null order by role, email`,
      );
      console.table(admins.rows);
      return;
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      console.error('Usage: npm run admin:promote -- [--revoke] <email>');
      process.exit(1);
    }
    const role = revoke ? 'member' : 'super_admin';
    const res = await client.query(
      `update users set role = $1, updated_at = now() where lower(email) = $2 and deleted_at is null returning id, email, display_name, role`,
      [role, email],
    );
    if (!res.rowCount) {
      console.error(`No user found with email ${email}. They must register first (the site's normal sign-up flow).`);
      process.exit(1);
    }
    await client.query(
      `insert into audit_logs (id, actor_id, action, target_type, target_id, metadata)
       values (gen_random_uuid(), $1, 'user.role_change', 'user', $2, $3)`,
      [res.rows[0].id, res.rows[0].id, JSON.stringify({ to: role, via: 'admin-promote-cli' })],
    );
    console.log(`✓ ${email} is now "${role}". The change takes effect on their next sign-in.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
