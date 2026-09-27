/**
 * GSAP owns page-level timelines, scroll reveals, and coordinated multi-element fades.
 * Framer Motion owns React interactions (search popovers, dialogs, card hover/tap, status cards).
 * Elements inside a form, [data-motion="static"], or [data-motion="react"] are not touched here.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOTION } from '@/lib/motion';

const SKIP = 'form, [data-motion="static"], [data-motion="react"]';

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function skipped(el: Element) {
  return Boolean(el.closest(SKIP));
}

export function initPageAnimations() {
  if (typeof window === 'undefined' || reduced()) return;
  gsap.registerPlugin(ScrollTrigger);

  const seen = new Set<HTMLElement>();

  function reveal(el: HTMLElement, staggerChildren = false) {
    if (seen.has(el) || skipped(el)) return;
    seen.add(el);
    const base = {
      opacity: 1,
      y: 0,
      ease: MOTION.gsapEase,
      clearProps: 'transform',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      immediateRender: false,
    };
    if (staggerChildren) {
      const kids = Array.from(el.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !skipped(child));
      if (!kids.length) return;
      kids.forEach((child) => seen.add(child));
      gsap.fromTo(kids, { opacity: 0, y: 10 }, { ...base, duration: MOTION.duration.base, stagger: MOTION.stagger });
      return;
    }
    gsap.fromTo(el, { opacity: 0, y: MOTION.distance }, { ...base, duration: MOTION.duration.base });
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

/** Press feedback for non-React buttons. React controls use Framer tap instead. */
export function pulseCta(selector = '[data-animate="cta"]') {
  if (typeof window === 'undefined' || reduced()) return;
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (skipped(el) || el.closest('[data-motion="react"]')) return;
    el.addEventListener('click', () => {
      gsap.fromTo(el, { scale: 1 }, { scale: 0.98, duration: MOTION.duration.fast, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    });
  });
}
