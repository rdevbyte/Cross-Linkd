/** Shared careers-link check. Empty is allowed. Only http and https URLs are accepted. */
export const CAREERS_URL_ERROR = 'Enter a valid http:// or https:// URL.';

export function careersUrlError(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return CAREERS_URL_ERROR;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return CAREERS_URL_ERROR;
  if (!url.hostname) return CAREERS_URL_ERROR;
  return null;
}
