import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

/**
 * Listing Statuses cards.
 * Framer Motion handles a short entrance plus hover and tap.
 * There is no scroll-triggered progress line.
 */

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

function StatusCard({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() === true;
  const delay = Math.min(index, 8) * MOTION.stagger;
  return (
    <motion.article
      className="status-grid-card card"
      role="listitem"
      tabIndex={0}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={reduce ? { duration: 0 } : { duration: MOTION.duration.base, delay, ease: MOTION.ease }}
      whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.16, ease: 'easeOut' } }}
      whileTap={reduce ? undefined : { scale: 0.99, transition: { duration: 0.12 } }}
    >
      {children}
    </motion.article>
  );
}

export default function ListingStatuses({ disclaimer, statuses, terms, recommendation }: Props) {
  return (
    <div data-motion="react">
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
        .status-grid {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }
        @media (min-width: 640px) {
          .status-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1100px) {
          .status-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
        .status-grid-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 168px;
          padding: 1.15rem;
          border-radius: 1.25rem;
        }
        .status-grid-card p { margin-top: auto; padding-top: 0.75rem; }
        .status-grid-card:hover { border-color: var(--border-strong); }
        .status-inset { background: var(--surface-2); box-shadow: 0 1px 2px rgba(15, 16, 20, 0.04); }
        .status-grid-card:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .min-h-11 { min-height: 44px; }
        @media (prefers-reduced-motion: reduce), (scripting: none) {
          .status-grid-card { opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <noscript>
        <style>{`.status-grid-card{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <p className="card p-5 text-sm leading-relaxed sm:p-6" style={{ color: 'var(--text-soft)' }}>{disclaimer}</p>

      <div className="status-grid mt-5" role="list" aria-label="Listing Statuses">
        {statuses.map((status, index) => {
          const titleId = `status-title-${index}`;
          return (
            <StatusCard key={status.name} index={index}>
              <div id={titleId}><StatusPill name={status.name} /></div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{status.definition}</p>
            </StatusCard>
          );
        })}
        <StatusCard index={statuses.length}>
          <h2 id="status-title-highlighted" className="text-sm font-extrabold">Highlighted is not a recommendation</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            “Highlighted” only means a listing is called out in the directory. It is not an endorsement, a quality rating, or a check of anything the owner wrote.
          </p>
        </StatusCard>
      </div>

      <section className="card mt-5 p-5 sm:p-7" aria-labelledby="terms-heading">
        <h2 id="terms-heading" className="text-2xl font-extrabold">What the words mean</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{recommendation}</p>
        <div className="status-grid mt-5">
          {terms.map((term) => (
            <article key={term.title} className="status-grid-card card status-inset">
              <h3 className="text-sm font-bold">{term.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{term.body}</p>
            </article>
          ))}
        </div>
      </section>

      <article className="card mt-5 p-5 sm:p-7">
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
      </article>
    </div>
  );
}
