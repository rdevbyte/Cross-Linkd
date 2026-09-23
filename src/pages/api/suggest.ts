import type { APIRoute } from 'astro';
import { autocompleteSuggestions } from '@/lib/search';
import { getPublicListings } from '@/lib/publicListings';
import { suggestHashtags } from '@/lib/hashtags';

/** GET /api/suggest?q=... — entity + hashtag autocomplete. */
export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) return json({ suggestions: [], tags: [] });

  const hashIdx = q.lastIndexOf('#');
  const tags =
    hashIdx >= 0
      ? suggestHashtags(q.slice(hashIdx + 1)).map((t) => ({ label: `#${t.tag}`, kind: t.kind, value: t.tag }))
      : suggestHashtags(q).slice(0, 3).map((t) => ({ label: `#${t.tag}`, kind: t.kind, value: t.tag }));

  const suggestions = autocompleteSuggestions(q.replace(/#[\w-]*$/, '').trim() || q, 6, await getPublicListings());
  return json({ suggestions, tags });
};

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
}
