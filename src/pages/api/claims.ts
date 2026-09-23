import type { APIRoute } from 'astro';
import { getDb, hasDatabase } from '@/db/client';
import { listingClaims } from '@/db/schema';
import { claimInputSchema } from '@/lib/validation';

/** POST /api/claims — file a listing claim. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const parsed = claimInputSchema.safeParse({
    listingId: String(form.get('listingId') ?? ''),
    claimantName: String(form.get('claimantName') ?? ''),
    claimantEmail: String(form.get('claimantEmail') ?? ''),
    relationship: String(form.get('relationship') ?? ''),
    evidence: String(form.get('evidence') ?? ''),
  });
  if (!parsed.success) {
    return redirect(`/claim-listing?error=${encodeURIComponent('Please complete every field (evidence needs 10+ characters).')}`, 303);
  }
  if (hasDatabase()) {
    try {
      const db = getDb()!;
      await db.insert(listingClaims).values({
        listingId: parsed.data.listingId,
        claimantId: locals.user?.id ?? null,
        claimantName: parsed.data.claimantName,
        claimantEmail: parsed.data.claimantEmail,
        relationship: parsed.data.relationship,
        evidence: parsed.data.evidence,
        status: 'pending',
      });
    } catch (err) {
      console.error('[api/claims] failed:', err);
    }
  } else {
    console.log('[demo] claim filed:', parsed.data);
  }
  return redirect('/claim-listing?success=1', 303);
};
