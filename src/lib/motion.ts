/**
 * Shared motion tokens.
 * Framer Motion uses the numeric ease and durations for component interactions.
 * GSAP uses gsapEase and the same durations for page and scroll timelines.
 * Do not animate the same property on the same element in both libraries.
 */
export const MOTION = {
  duration: { fast: 0.16, base: 0.4, slow: 0.55 },
  ease: [0.22, 1, 0.36, 1] as const,
  gsapEase: 'power2.out',
  stagger: 0.06,
  distance: 12,
} as const;

export const fadeSlide = {
  hidden: { opacity: 0, y: MOTION.distance },
  show: { opacity: 1, y: 0 },
};

export const popoverMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: MOTION.duration.fast, ease: MOTION.ease },
};

export const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION.duration.fast },
};

export const dialogMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98 },
  transition: { duration: MOTION.duration.base, ease: MOTION.ease },
};

export const tapScale = { scale: 0.98 };
