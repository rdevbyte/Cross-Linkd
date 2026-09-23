import type { APIRoute } from 'astro';

/** GET /robots.txt — sitemap URL follows the deployment origin (PUBLIC_SITE_URL / Vercel URL). */
export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? 'https://crosslinkd.example.com';
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin/',
    'Disallow: /dashboard/',
    'Disallow: /auth/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
