/**
 * Output-side URL guard. Website links are validated when a listing is saved,
 * but anything already stored (older rows, manual edits, imports) is rendered
 * as an `href`, so a `javascript:` or `data:` value must never reach the page.
 * Returns a normalised http(s) URL, or undefined when the value is unusable.
 */
export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return undefined;
  try {
    const url = new URL(trimmed);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
