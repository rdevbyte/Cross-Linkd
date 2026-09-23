import { useEffect, useState } from 'react';

/**
 * Light / dark mode — modern slider-style switch.
 * Sun and moon glyphs are inline SVG (no emoji). Persists to
 * localStorage ("cl:theme") and defaults to system preference.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('cl:theme', next); } catch { /* noop */ }
    setTheme(next);
  };

  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className="theme-slider"
    >
      {/* Sun glyph */}
      <svg
        aria-hidden="true"
        className="theme-slider-icon"
        style={{ color: dark ? 'var(--text-mute)' : 'var(--logo-gold)' }}
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4.4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
      </svg>

      {/* Track + knob */}
      <span className="theme-slider-track" aria-hidden="true">
        <span className="theme-slider-knob" style={{ transform: dark ? 'translateX(16px)' : 'translateX(0)' }} />
      </span>

      {/* Moon glyph */}
      <svg
        aria-hidden="true"
        className="theme-slider-icon"
        style={{ color: dark ? 'var(--logo-gold)' : 'var(--text-mute)' }}
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    </button>
  );
}
