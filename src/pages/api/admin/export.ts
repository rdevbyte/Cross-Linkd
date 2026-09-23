import type { APIRoute } from 'astro';
import { isAdmin } from '@/lib/auth';
import { SAMPLE_LISTINGS } from '@/data/listings';
import { includeSamples } from '@/lib/sampleGate';
import { INDUSTRIES } from '@/data/industries';
import { DENOMINATIONS } from '@/data/denominations';

/** GET /api/admin/export?table=listings|taxonomy — admin CSV/JSON export. */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals.user) && process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    return new Response('Forbidden', { status: 403 });
  }
  const table = url.searchParams.get('table') ?? 'listings';
  if (table === 'taxonomy') {
    return new Response(JSON.stringify({ industries: INDUSTRIES, denominations: DENOMINATIONS }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="taxonomy.json"' },
    });
  }
  const rows = [
    'id,slug,name,type,city,region,rating,reviews',
    ...(includeSamples() ? SAMPLE_LISTINGS : []).map((l) => [l.id, l.slug, l.name, l.typeSlug, l.city, l.region, l.rating, l.reviewCount]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ];
  return new Response(rows.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="listings.csv"' },
  });
};
