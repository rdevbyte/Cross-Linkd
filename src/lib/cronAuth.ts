import { timingSafeEqual } from 'node:crypto';

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed in
 * production when the secret is missing (previously the endpoints were open).
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const provided = request.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(provided);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
