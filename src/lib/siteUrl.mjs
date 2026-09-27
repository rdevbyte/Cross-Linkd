/**
 * Single source of truth for the public site origin.
 * Used by astro.config.mjs (canonical `site`), the mailer (absolute links in
 * emails) and SEO helpers so they can never disagree with each other.
 *
 * Resolution order: PUBLIC_SITE_URL → Vercel production URL → Vercel deployment
 * URL → localhost in development → the known production hostname.
 */
export function resolveSiteUrl(env = process.env) {
  const explicit = env.PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return (explicit.startsWith('http://') || explicit.startsWith('https://') ? explicit : `https://${explicit}`).replace(/\/$/, '');
  }
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  if (env.NODE_ENV !== 'production') return 'http://localhost:4321';
  // Matches the renamed Vercel project "cross-linkd"
  return 'https://cross-linkd.vercel.app';
}
