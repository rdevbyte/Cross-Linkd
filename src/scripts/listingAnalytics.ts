const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMPRESSION_DEDUPE_MS = 30 * 60 * 1000;
type EventName = 'recent_impression' | 'recent_card_click' | 'detail_view' | 'website_click' | 'social_click' | 'phone_click' | 'email_click' | 'contact_click' | 'favorite_add' | 'favorite_remove' | 'recent_filter' | 'owner_share';

function listingId(raw: string | undefined): string | undefined {
  const id = (raw ?? '').replace(/^db-/, '');
  return UUID.test(id) ? id : undefined;
}

function track(event: EventName, rawId?: string) {
  const id = listingId(rawId);
  if (event !== 'recent_filter' && !id) return;
  try {
    void fetch('/api/listing-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...(id ? { listingId: id } : {}) }),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch { /* Analytics must never interrupt a visitor action. */ }
}

function expireCard(card: HTMLElement) {
  const expiresAt = Date.parse(card.dataset.recentUpdateExpires ?? '');
  if (!Number.isFinite(expiresAt)) return;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    card.classList.remove('recently-updated-card');
    card.removeAttribute('data-recently-updated');
    card.querySelector('[data-recent-update-badge]')?.remove();
    return;
  }
  window.setTimeout(() => expireCard(card), Math.min(remaining, 2_147_000_000));
}

function expireCardShimmer(card: HTMLElement) {
  const expiresAt = Date.parse(card.dataset.cardShimmerExpires ?? '');
  if (!Number.isFinite(expiresAt)) return;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    card.classList.remove('recent-card-shimmer');
    card.removeAttribute('data-card-shimmer-expires');
    return;
  }
  window.setTimeout(() => expireCardShimmer(card), Math.min(remaining, 2_147_000_000));
}

const recentCards = Array.from(document.querySelectorAll<HTMLElement>('[data-listing-card][data-recent-update-expires]'));
for (const card of recentCards) expireCard(card);
document.querySelectorAll<HTMLElement>('[data-card-shimmer-expires]').forEach(expireCardShimmer);

if (recentCards.length > 0) {
  const seenThisPage = new WeakSet<Element>();
  const recordImpression = (card: HTMLElement) => {
    if (seenThisPage.has(card)) return;
    seenThisPage.add(card);
    const id = listingId(card.dataset.listingId);
    if (!id) return;
    const key = `cl:recent-impression:${id}`;
    const now = Date.now();
    try {
      const previous = Number(sessionStorage.getItem(key) ?? 0);
      if (previous && now - previous < IMPRESSION_DEDUPE_MS) return;
      sessionStorage.setItem(key, String(now));
    } catch { /* Continue with page-local deduplication if storage is unavailable. */ }
    track('recent_impression', id);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          recordImpression(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: [0.5] });
    recentCards.forEach((card) => observer.observe(card));
  } else {
    recentCards.forEach(recordImpression);
  }
}

for (const detail of document.querySelectorAll<HTMLElement>('[data-listing-detail][data-listing-id]')) {
  track('detail_view', detail.dataset.listingId);
}

if (document.querySelector('[data-recent-filter-active="true"]')) {
  const key = `cl:recent-filter:${location.pathname}${location.search}`;
  try {
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      track('recent_filter');
    }
  } catch { track('recent_filter'); }
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const cardLink = target.closest<HTMLAnchorElement>('a[data-listing-card-link]');
  const card = cardLink?.closest<HTMLElement>('[data-listing-card][data-recently-updated="true"]');
  if (card) track('recent_card_click', card.dataset.listingId);

  const eventLink = target.closest<HTMLElement>('[data-listing-event]');
  const eventName = eventLink?.dataset.listingEvent as EventName | undefined;
  const detail = eventLink?.closest<HTMLElement>('[data-listing-detail]');
  if (eventName && detail) track(eventName, detail.dataset.listingId);
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('[data-listing-contact-form]')) return;
  const detail = form.closest<HTMLElement>('[data-listing-detail]');
  if (detail) track('contact_click', detail.dataset.listingId);
});

document.addEventListener('cl:favorite-change', (event) => {
  const detail = (event as CustomEvent<{ id?: string; saved?: boolean }>).detail;
  if (!detail?.id) return;
  track(detail.saved ? 'favorite_add' : 'favorite_remove', detail.id);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') recentCards.forEach(expireCard);
});
