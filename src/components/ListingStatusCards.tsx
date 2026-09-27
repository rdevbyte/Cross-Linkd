import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

/**
 * Motion split, so the libraries do not fight over the same properties:
 * - Framer Motion owns each card: fade, slide, stagger, viewport trigger, hover, and tap.
 * - GSAP owns only the accent rule inside a card, sequenced on one timeline.
 */

type AccentTimeline = {
  kill: () => void;
  duration: () => number;
  isActive: () => boolean;
  play: () => void;
  fromTo: (target: HTMLElement, from: object, to: object, position?: string | number) => AccentTimeline;
};

export interface StatusItem {
  name: string;
  definition: string;
}

export interface TermItem {
  title: string;
  body: string;
}

interface Props {
  disclaimer: string;
  statuses: StatusItem[];
  terms: TermItem[];
  recommendation: string;
}

const EASE = MOTION.ease;

let accentTimeline: AccentTimeline | null = null;
let accentQueue: HTMLElement[] = [];
let accentLoading = false;
let accentBatchAt = 0;

function prefersReduce() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function drawAccent(el: HTMLElement) {
  if (prefersReduce()) return;
  accentQueue.push(el);
  if (accentLoading) return;
  accentLoading = true;
  const pending = accentQueue.splice(0);
  try {
    const { default: gsap } = await import('gsap');
    const now = Date.now();
    if (!accentTimeline || now - accentBatchAt > 500) {
      accentTimeline = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.42 } }) as AccentTimeline;
    }
    accentBatchAt = now;
    pending.forEach((node, index) => {
      accentTimeline?.fromTo(
        node,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.42, ease: 'power2.out' },
        index === 0 ? 0 : '>-0.18',
      );
    });
  } finally {
    accentLoading = false;
    if (accentQueue.length) {
      const next = accentQueue.shift();
      if (next) void drawAccent(next);
    }
  }
}

function iconFor(name: string) {
  const key = name.toLowerCase();
  if (key.includes('inactive')) return 'pause';
  if (key.includes('needs update')) return 'clock';
  if (key.includes('reported')) return 'flag';
  if (key.includes('community-listed') || key.includes('community listed')) return 'people';
  if (key.includes('website')) return 'link';
  if (key.includes('confirmed')) return 'refresh';
  if (key.includes('claimed') || key.includes('unclaimed')) return 'person';
  return 'doc';
}

function StatusPill({ name }: { name: string }) {
  const icon = iconFor(name);
  return (
    <span className="status-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon === 'doc' && <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>}
        {icon === 'person' && <><circle cx="12" cy="8" r="3.2" /><path d="M5 19c1.4-2.6 3.6-4 7-4s5.6 1.4 7 4" /></>}
        {icon === 'link' && <><path d="M10 13a5 5 0 0 0 7.1.1l1.4-1.4a5 5 0 0 0-7.1-7.1L10 5.9" /><path d="M14 11a5 5 0 0 0-7.1-.1L5.5 12.3a5 5 0 0 0 7.1 7.1L14 18.1" /></>}
        {icon === 'refresh' && <><path d="M21 12a9 9 0 1 1-2.6-6.3" /><path d="M21 4v6h-6" /></>}
        {icon === 'people' && <><circle cx="9" cy="8" r="2.4" /><circle cx="16" cy="9" r="2" /><path d="M4.5 18c.8-2.2 2.6-3.4 4.5-3.4s3.7 1.2 4.5 3.4" /><path d="M14 14.8c1.3-.4 2.6-.2 3.8.8" /></>}
        {icon === 'flag' && <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>}
        {icon === 'clock' && <><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></>}
        {icon === 'pause' && <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>}
      </svg>
      <span>{name}</span>
    </span>
  );
}

function MotionCard({
  index,
  className,
  children,
  interactive = true,
}: {
  index: number;
  className: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  const reduce = useReducedMotion() === true;
  const accentRef = useRef<HTMLSpanElement>(null);
  const drawn = useRef(false);
  const delay = Math.min(index, 6) * MOTION.stagger;

  const onEnter = useCallback(() => {
    if (drawn.current || !accentRef.current || prefersReduce()) return;
    drawn.current = true;
    void drawAccent(accentRef.current);
  }, []);

  return (
    <motion.article
      className={`listing-status-card ${className}`}
      style={{ position: 'relative' }}
      initial={reduce ? false : { opacity: 0, y: MOTION.distance }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: '0px 0px -32px 0px' }}
      transition={reduce ? { duration: 0 } : { duration: MOTION.duration.base, delay, ease: EASE }}
      whileHover={!reduce && interactive ? { y: -2, transition: { duration: 0.18, ease: 'easeOut' } } : undefined}
      whileTap={!reduce && interactive ? { scale: 0.985, transition: { duration: 0.12 } } : undefined}
      onViewportEnter={onEnter}
    >
      <span
        ref={accentRef}
        className="listing-status-accent"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '1.25rem',
          right: '1.25rem',
          height: 2,
          borderRadius: 999,
          background: 'var(--accent)',
          transformOrigin: 'left center',
          transform: 'scaleX(0)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </motion.article>
  );
}

export default function ListingStatusCards({ disclaimer, statuses, terms, recommendation }: Props) {
  useEffect(() => () => {
    accentTimeline?.kill();
    accentTimeline = null;
    accentQueue = [];
    accentLoading = false;
    accentBatchAt = 0;
  }, []);

  return (
    <>
      <style>{`
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          max-width: 100%;
          border: 1px solid var(--border-strong);
          background: var(--surface-2);
          color: var(--text);
          border-radius: 999px;
          padding: 0.28rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1.35;
        }
        .min-h-11 { min-height: 44px; }
        @media (prefers-reduced-motion: reduce), (scripting: none) {
          .listing-status-card { opacity: 1 !important; transform: none !important; }
          .listing-status-accent { transform: scaleX(1) !important; }
        }
      `}</style>
      <noscript>
        <style>{`.listing-status-card{opacity:1!important;transform:none!important}.listing-status-accent{transform:scaleX(1)!important}`}</style>
      </noscript>

      <MotionCard index={0} className="card mt-6 p-5 text-sm leading-relaxed" interactive={false}>
        <p style={{ color: 'var(--text-soft)' }}>{disclaimer}</p>
      </MotionCard>

      <div className="mt-8 grid gap-3">
        {statuses.map((status, index) => (
          <MotionCard key={status.name} index={index} className="card p-5">
            <StatusPill name={status.name} />
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{status.definition}</p>
          </MotionCard>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-extrabold">What the words mean</h2>
      <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{recommendation}</p>
      <div className="mt-4 grid gap-2">
        {terms.map((term, index) => (
          <MotionCard key={term.title} index={index} className="card p-4">
            <h3 className="text-sm font-bold">{term.title}</h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{term.body}</p>
          </MotionCard>
        ))}
      </div>

      <MotionCard index={0} className="card mt-8 p-5">
        <h2 className="font-extrabold">Highlighted is not a recommendation</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
          “Highlighted” only means a listing is called out in the directory. It is not an endorsement, a quality rating, or a check of anything the owner wrote.
        </p>
      </MotionCard>

      <MotionCard index={1} className="card mt-4 p-5" interactive={false}>
        <h2 className="font-extrabold">Saw something wrong?</h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
          A report is community reported. It asks a person to look at the listing. It does not mean CrossLinkd has already confirmed or rejected the business.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/contact?topic=inaccurate" className="btn btn-secondary min-h-11">Report inaccurate information</a>
          <a href="/contact?topic=duplicate" className="btn btn-secondary min-h-11">Report a duplicate</a>
          <a href="/contact?topic=removal" className="btn btn-secondary min-h-11">Request removal</a>
          <a href="/appeals" className="btn btn-secondary min-h-11">Appeals</a>
        </div>
      </MotionCard>
    </>
  );
}
