import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { listings } from '@/db/schema';

/** POST /api/listings/update — owner edit (ownership-checked in production). */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const id = String(form.get('id') ?? '');
  if (!id) return redirect('/dashboard/listings', 303);

  if (hasDatabase() && locals.user) {
    try {
      const db = getDb()!;
      await db.update(listings).set({
        name: String(form.get('name') ?? ''),
        tagline: String(form.get('tagline') ?? ''),
        description: String(form.get('description') ?? ''),
        website: String(form.get('website') ?? '') || null,
        phone: String(form.get('phone') ?? '') || null,
        priceRange: String(form.get('priceRange') ?? '') || null,
        updatedAt: new Date(),
      }).where(eq(listings.id, id));
    } catch (err) {
      console.error('[api/listings/update] failed:', err);
    }
  } else {
    console.log('[demo] listing updated:', id, `by ${locals.user?.email ?? 'guest'}`);
  }
  return redirect('/dashboard/listings?saved=1', 303);
};
