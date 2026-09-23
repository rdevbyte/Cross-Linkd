import type { APIRoute } from 'astro';

/** GET /api/cron/refresh-sitemap — nightly sitemap ping (Vercel Cron). */
export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  console.log('[cron] sitemap refresh pinged at', new Date().toISOString());
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
