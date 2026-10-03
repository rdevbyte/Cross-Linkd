/**
 * Sample-content gate. The bundled curated listings/events are a demo corpus,
 * never launch content. They are OFF by default (clean slate); turn them on
 * explicitly for local demos/tests with SHOW_SAMPLE_CONTENT=1 or "true".
 */
export function includeSamples(): boolean {
  // Production deployments are always a real-listings-only directory, even if
  // an environment variable is accidentally copied from a local demo.
  if (process.env.NODE_ENV === 'production') return false;
  const v = process.env.SHOW_SAMPLE_CONTENT;
  return v === '1' || v === 'true';
}
