/**
 * Page-level motion: a single scroll-reveal built on IntersectionObserver + CSS
 * (see [data-reveal] in global.css). Framer Motion owns React interactions
 * (search popovers, dialogs, status cards); button press feedback is CSS
 * (.btn:active). Elements inside a form, [data-motion="static"], or
 * [data-motion="react"] are never touched here.
 */
import { MOTION } from '@/lib/motion';

const SKIP = 'form, [data-motion="static"], [data-motion="react"]';

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function skipped(el: Element) {
  return Boolean(el.closest(SKIP));
}

export function initPageAnimations() {
  if (typeof window === 'undefined' || reduced() || !('IntersectionObserver' in window)) return;

  const seen = new Set<HTMLElement>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        const delay = Number(el.dataset.revealDelay ?? 0);
        window.setTimeout(() => el.setAttribute('data-reveal', 'in'), delay);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );

  function reveal(el: HTMLElement, staggerChildren = false) {
    if (seen.has(el) || skipped(el)) return;
    seen.add(el);
    if (staggerChildren) {
      const kids = Array.from(el.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !skipped(child));
      kids.forEach((child, i) => {
        seen.add(child);
        child.setAttribute('data-reveal', '');
        child.dataset.revealDelay = String(Math.round(Math.min(i, 8) * MOTION.stagger * 1000));
        observer.observe(child);
      });
      return;
    }
    el.setAttribute('data-reveal', '');
    observer.observe(el);
  }

  document.querySelectorAll<HTMLElement>('[data-animate="hero"]').forEach((el) => reveal(el));
  document.querySelectorAll<HTMLElement>('[data-animate="reveal"]').forEach((el) => reveal(el));
  document.querySelectorAll<HTMLElement>('[data-animate="grid"]').forEach((el) => reveal(el, true));

  const fold = window.innerHeight * 0.82;
  document.querySelectorAll<HTMLElement>('main section').forEach((el) => {
    if (el.hasAttribute('data-animate') || el.closest('[data-animate="grid"]')) return;
    if (el.getBoundingClientRect().top < fold) return;
    reveal(el);
  });
}
