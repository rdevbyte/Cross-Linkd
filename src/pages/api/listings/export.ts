import type { APIRoute } from 'astro';
import { SAMPLE_LISTINGS } from '@/data/listings';
import { includeSamples } from '@/lib/sampleGate';

/** GET /api/listings/export — CSV export of own listings (demo: sample data). */
export const GET: APIRoute = async () => {
  const rows = [
    'name,type,city,region,rating,reviews,recommendations,views',
    ...(includeSamples() ? SAMPLE_LISTINGS : []).map((l) =>
      [l.name, l.typeSlug, l.city, l.region, l.rating, l.reviewCount, l.recommendations, l.views]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    ),
  ];
  return new Response(rows.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="my-listings.csv"' },
  });
};
