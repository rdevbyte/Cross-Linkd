export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function uniqueSlug(base: string, suffix?: string): string {
  const s = slugify(base);
  return suffix ? `${s}-${suffix}` : s;
}
