/** Shared checks for public forms. Kept free of the database so tests can run them directly. */

function affirmed(value) {
  if (value === true || value === 1) return true;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'on' || text === '1' || text === 'true' || text === 'yes';
}

export function honeypotTripped(value) {
  return String(value ?? '').trim().length > 0;
}

export function faithIdentityReason(input) {
  const statement = String(input.statementOfFaith ?? '').trim();
  const customDenomination = String(input.customDenomination ?? '').trim();
  const denominations = Array.isArray(input.denominations)
    ? input.denominations.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];
  const hasDenomination = denominations.some((slug) => slug.toLowerCase() !== 'other') || customDenomination.length > 0;
  return hasDenomination || statement
    ? ''
    : 'Choose at least one denomination or add a statement of faith before publishing.';
}

export function publishBlockReason(input) {
  const email = String(input.email ?? '').trim();
  const city = String(input.city ?? '').trim();
  const region = String(input.region ?? '').trim();
  if (!affirmed(input.attestation) || !affirmed(input.terms)) {
    return 'Confirm the accuracy statement and the terms before publishing.';
  }
  if (!input.isOnlineOnly && !city && !region) {
    return 'Add a city or state, or mark the listing as online-only.';
  }
  if (!input.user && !email) {
    return 'Add a contact email before publishing as a guest.';
  }
  const faithMessage = faithIdentityReason(input);
  if (faithMessage) return faithMessage;
  return '';
}

export function listingSpamReason(value) {
  const links = String(value ?? '').match(/https?:\/\//gi) ?? [];
  return links.length > 5 ? 'Remove extra links and try again.' : '';
}

export function contactError(input) {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim();
  const message = String(input.message ?? '').trim();
  if (name.length < 2 || name.length > 160) return 'Enter your name.';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = /^[0-9+().\-\s]{7,40}$/.test(email);
  if (!emailOk && !phoneOk) return 'Enter an email or phone number.';
  if (message.length < 10) return 'Enter a message of at least 10 characters.';
  if (message.length > 5000) return 'That message is too long.';
  if ((message.match(/https?:\/\//gi) ?? []).length > 3) return 'Remove extra links and try again.';
  return '';
}

export function claimError(input) {
  const listingId = String(input.listingId ?? '').trim();
  const claimantName = String(input.claimantName ?? '').trim();
  const claimantEmail = String(input.claimantEmail ?? '').trim();
  const relationship = String(input.relationship ?? '').trim();
  const evidence = String(input.evidence ?? '').trim();
  if (!listingId || listingId.length > 80) return 'Select a listing.';
  if (claimantName.length < 2 || claimantName.length > 160) return 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimantEmail) || claimantEmail.length > 255) return 'Enter a work email.';
  if (relationship.length < 2 || relationship.length > 120) return 'Select your relationship to the listing.';
  if (evidence.length < 10) return 'Describe how you can show control of a contact channel.';
  if (evidence.length > 3000) return 'That note is too long.';
  if ((evidence.match(/https?:\/\//gi) ?? []).length > 3) return 'Remove extra links and try again.';
  return '';
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ''));
}

export function safeReturnPath(value, fallback) {
  const path = String(value ?? '');
  if (path === '/contact' || path === '/feedback' || path === '/appeals' || path === '/claim-listing') return path;
  if (/^\/directory\/[a-z0-9-]{1,200}$/.test(path)) return path;
  return fallback;
}

/** Accept a same-origin absolute path only; reject URL-parser backslash quirks and header controls. */
export function safeLocalPath(value, fallback = '/') {
  const path = String(value ?? '');
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || [...path].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return fallback;
  try {
    const base = 'https://crosslinkd.invalid';
    const target = new URL(path, base);
    if (target.origin !== base) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
