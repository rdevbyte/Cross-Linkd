/**
 * Gate for the remaining illustrative demo content (events and testimonials).
 * Bundled sample business listings have been removed from the project.
 * This flag is local-development-only; production never serves these samples.
 */
export function includeSamples(): boolean {
  // Production deployments are always real-data-only, even if a local demo
  // environment variable is accidentally copied into production.
  if (process.env.NODE_ENV === 'production') return false;
  const v = process.env.SHOW_SAMPLE_CONTENT;
  return v === '1' || v === 'true';
}
