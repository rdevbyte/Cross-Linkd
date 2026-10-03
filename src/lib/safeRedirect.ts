/**
 * Post-authentication redirect targets (`?next=` / hidden `next` field).
 *
 * Only same-site absolute paths are accepted. The classic guard
 * (`startsWith('/') && !startsWith('//')`) is not enough: browsers treat a
 * backslash as a slash (`/\evil.com` → `//evil.com`) and silently drop tab/CR/LF
 * while parsing URLs (`/<TAB>/evil.com` → `//evil.com`), so both slip past it and
 * become an open redirect on the sign-in form. This helper rejects those
 * characters and then re-parses the value against a dummy origin, so anything
 * that resolves off-site is refused no matter how it is spelled.
 */
const DUMMY_ORIGIN = 'http://cl-internal.invalid';
const MAX_LENGTH = 512;

// Backslash, C0 controls and DEL.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

export function safeNextPath(raw: unknown, fallback = '/dashboard'): string {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (UNSAFE_CHARS.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, DUMMY_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== DUMMY_ORIGIN) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
