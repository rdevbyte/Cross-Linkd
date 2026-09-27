/**
 * URLSearchParams helpers shared by server-rendered search links.
 */

/**
 * Copy of `params` with the given entries removed. A `[key]` entry drops every
 * value for that key; a `[key, value]` entry drops only that value and keeps
 * the key's other values (e.g. one of several `denomination` chips).
 *
 * Implemented by filtering entries rather than `URLSearchParams.delete(key, value)`:
 * the two-argument form only landed in Node 20.2 / recent browsers — on older
 * runtimes the second argument is ignored and *every* value for the key is
 * dropped, which silently removed sibling filters from the chip links.
 */
export function withoutParams(
  params: URLSearchParams,
  ...drop: Array<[key: string, value?: string]>
): URLSearchParams {
  const kept = new URLSearchParams();
  for (const [key, value] of params) {
    const removed = drop.some(([k, v]) => k === key && (v === undefined || v === value));
    if (!removed) kept.append(key, value);
  }
  return kept;
}
