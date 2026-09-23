/** Tiny client-side store (favorites, recents, saved searches) backed by localStorage. */
const KEY = 'cl:favorites:v1';
const HISTORY_KEY = 'cl:history:v1';

export function getFavorites(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}
export function toggleFavorite(id: string): boolean {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('cl:favorites', { detail: next }));
  return next.includes(id);
}
export function pushHistory(query: string) {
  if (typeof localStorage === 'undefined' || !query.trim()) return;
  try {
    const h: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    const next = [query, ...h.filter((x) => x !== query)].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}
export function getHistory(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
