import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

function resolveSiteUrl() {
  const envUrl = process.env.PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return envUrl.startsWith('http://') || envUrl.startsWith('https://')
      ? envUrl
      : `https://${envUrl}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://crosslinkd.vercel.app';
}

// CrossLinkd — Vercel serverless build.
// SSR enabled so API routes, auth, search, and dashboards work on Vercel.
export default defineConfig({
  site: resolveSiteUrl(),
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    imageService: true,
  }),
  integrations: [react()],
  security: { checkOrigin: true },
  vite: {
    // Allow arbitrary Host headers only in local dev (sandbox/preview tunnels).
    // Production builds enforce normal host checking.
    ...(process.env.NODE_ENV !== 'production' ? { server: { allowedHosts: true } } : {}),
  },
});
