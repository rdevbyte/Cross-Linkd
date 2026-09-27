import type { APIRoute } from 'astro';
import { cronAuthorized } from '@/lib/cronAuth';

/** GET /api/cron/refresh-sitemap — nightly sitemap ping (Vercel Cron). */
export const GET: APIRoute = async ({ request }) => {
  if (!cronAuthorized(request)) return new Response('Unauthorized', { status: 401 });
  console.log('[cron] sitemap refresh pinged at', new Date().toISOString());
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
