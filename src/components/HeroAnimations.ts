/**
 * GSAP scroll reveals + Anime.js micro-interactions.
 * All motion is gated behind prefers-reduced-motion.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate } from 'animejs';

export function initPageAnimations() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance
  gsap.fromTo(
    '[data-animate="hero"]',
    { opacity: 0, y: 26 },
    { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' },
  );

  // Scroll reveals
  gsap.utils.toArray<HTMLElement>('[data-animate="reveal"]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      },
    );
  });

  // Card stagger grids
  gsap.utils.toArray<HTMLElement>('[data-animate="grid"]').forEach((grid) => {
    gsap.fromTo(
      grid.children,
      { opacity: 0, y: 18 },
      {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: grid, start: 'top 90%', once: true },
      },
    );
  });
}

/** Subtle button press pulse for primary CTAs. */
export function pulseCta(selector = '[data-animate="cta"]') {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener('click', () => {
      animate(el, { scale: [1, 0.96, 1], duration: 260, ease: 'inOutQuad' });
    });
  });
}
