export function timeAgo(daysAgo: number): string {
  if (daysAgo < 1) return 'today';
  if (daysAgo < 7) return `${Math.floor(daysAgo)}d ago`;
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)}w ago`;
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)}mo ago`;
  return `${Math.floor(daysAgo / 365)}y ago`;
}
/** "Aug 2026" — used for verification badges ("Verified Aug 2026"). */
export function monthYear(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, daysAgo));
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
/** "Aug 28, 2026" — full date for "last updated" lines. */
export function fullDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, daysAgo));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}
export function stars(rating: number): string {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}
