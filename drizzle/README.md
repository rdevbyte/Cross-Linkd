# Migrations

These `.sql` files are **hand-maintained** and are applied in filename order by `src/db/migrate.ts`
(`npm run db:migrate`, using `DIRECT_URL`). Each file runs once; its name is recorded in
`schema_migrations`. Statements are separated by `--> statement-breakpoint`, and "already exists" errors
are tolerated so a partially applied file can be re-run.

| File | What it adds |
|------|--------------|
| `0000_living_moondragon.sql` | Baseline schema, generated once by drizzle-kit |
| `0001_init.sql` | `pgcrypto` / `pg_trgm`, the generated `search_vector` column and its GIN / trigram indexes |
| `0001_launch_auth_listing_workflow.sql` | `rejected` / `changes_requested` statuses, `auth_tokens`, the moderation-trail columns on `listings` |
| `0002_listing_privacy_and_denomination.sql` | Per-field privacy flags (`show_*`), custom denomination, default status `published` |
| `0003_expandable_categories_and_multidenom.sql` | Industry / category slugs, custom category, `denominations_list` (multi-denomination) |
| `0004_ownership_and_contact_preference.sql` | Ownership type, contact preference |
| `0004_users_sessions_valid_after.sql` | Session revocation watermark |
| `0005_listing_hiring.sql` | Hiring flag + careers URL |
| `0006_rate_limits.sql` | Shared rate-limit counters |

## Things to know

- **Two files share the number `0001` and two share `0004`.** That is harmless — ordering is by full
  filename and the applied name is what is tracked — but **do not rename applied files**: a renamed file
  would be treated as new and run again. Give new files the next free number (`0007_…`).
- **Do not run `npm run db:generate`.** The Drizzle snapshots in `meta/` stop at `0001`, so drizzle-kit
  would diff the current `schema.ts` against a two-migrations-old picture and emit a huge migration that
  re-creates objects that already exist. Write the SQL by hand, keep `src/db/schema.ts` in step, and add
  a test or an e2e check that exercises the new column/table.
- Prefer additive, re-runnable SQL (`IF NOT EXISTS`, nullable columns). Apply to a Neon branch first.
- A few indexes duplicate UNIQUE constraints (`users.email`, `listings.slug`, `auth_tokens.token_hash`,
  `industries/professions/events` slugs, `hashtags.tag`). They are redundant, not wrong; drop them in a
  migration when you next touch those tables (`DROP INDEX IF EXISTS …`).
