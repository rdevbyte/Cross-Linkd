/**
 * Hashtag parsing / suggestion utilities shared by client + server.
 * Supports: `bakery #Bap` → suggests `#Baptist`, multi-tag chips,
 * denomination / industry / profession / location / type / verification tags.
 */
import { HASHTAG_CATALOG } from '@/data/hashtags';

export interface ParsedQuery {
  text: string;
  tags: string[];
  /** The in-progress tag fragment being typed (for autocomplete). */
  activeFragment: string | null;
}

const TAG_RE = /#([\p{L}\p{N}_-]*)/gu;

export function parseQuery(raw: string): ParsedQuery {
  const tags: string[] = [];
  let activeFragment: string | null = null;
  const matches = [...raw.matchAll(TAG_RE)];
  for (const m of matches) {
    const frag = (m[1] ?? '').trim();
    const endsAtCursor = m.index !== undefined && m.index + m[0].length === raw.length;
    if (frag.length === 0) {
      if (endsAtCursor) activeFragment = '';
      continue;
    }
    // If the tag is the last token and has no trailing space, treat as in-progress.
    if (endsAtCursor && !/\s$/.test(raw) && isLikelyPartial(raw, m[0])) {
      activeFragment = frag;
    } else {
      tags.push(normalizeTag(frag));
    }
  }
  const text = raw.replace(TAG_RE, ' ').replace(/\s+/g, ' ').trim();
  return { text, tags: [...new Set(tags)], activeFragment };
}

function isLikelyPartial(raw: string, token: string): boolean {
  // A trailing token without following whitespace is considered in-progress.
  return raw.endsWith(token);
}

export function normalizeTag(tag: string): string {
  return tag.replace(/^#+/, '').trim();
}

/** Fuzzy-ish match: prefix > substring > subsequence, with small typo tolerance. */
export function suggestHashtags(fragment: string, limit = 8): { tag: string; kind: string }[] {
  const q = fragment.toLowerCase().replace(/^#/, '');
  if (!q) return HASHTAG_CATALOG.slice(0, limit);
  const scored: { tag: string; kind: string; score: number }[] = [];
  for (const h of HASHTAG_CATALOG) {
    const t = h.tag.toLowerCase();
    let score = -1;
    if (t === q) score = 100;
    else if (t.startsWith(q)) score = 80 - (t.length - q.length);
    else if (t.includes(q)) score = 50;
    else if (subsequence(t, q)) score = 25;
    else if (levenshtein(t.slice(0, q.length + 1), q) <= 1) score = 20;
    if (score >= 0) scored.push({ ...h, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function subsequence(hay: string, needle: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Strip the in-progress fragment and append a chosen tag. */
export function applyTagSuggestion(raw: string, tag: string): string {
  const withoutFrag = raw.replace(/#[\p{L}\p{N}_-]*$/u, '').trimEnd();
  return `${withoutFrag} #${normalizeTag(tag)} `.replace(/\s+/g, ' ').trimStart();
}
