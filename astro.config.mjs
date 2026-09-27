import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import { resolveSiteUrl } from './src/lib/siteUrl.mjs';

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
  security: { checkOrigin: false },
  vite: {
    // Allow arbitrary Host headers only in local dev (sandbox/preview tunnels).
    // Production builds enforce normal host checking.
    ...(process.env.NODE_ENV !== 'production' ? { server: { allowedHosts: true } } : {}),
  },
});
