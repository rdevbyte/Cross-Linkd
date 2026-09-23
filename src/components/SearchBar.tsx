import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseQuery, suggestHashtags, applyTagSuggestion } from '@/lib/hashtags';
import { getHistory, pushHistory } from '@/lib/store';
import { FOCUS_CITIES, FOCUS_STATES } from '@/data/locations';

interface Props {
  initialQuery?: string;
  initialLocation?: string;
  size?: 'hero' | 'compact';
  autofocus?: boolean;
}

interface SuggestItem { label: string; kind: string; value: string; isTag?: boolean }

const LOCATION_ITEMS: SuggestItem[] = [
  ...FOCUS_CITIES.map((c) => ({
    label: `${c.city}, ${c.region}`,
    kind: 'city' as const,
    value: `${c.city}, ${c.region}`,
  })),
  ...FOCUS_STATES.map((s) => ({
    label: `All of ${s.name}`,
    kind: 'state' as const,
    value: s.name,
  })),
];

/**
 * Two-field search: WHAT (service, category, or business name — supports
 * hashtags) and WHERE (city, state, or ZIP). Submits to /search?q=&near=.
 */
export default function SearchBar({ initialQuery = '', initialLocation = '', size = 'hero', autofocus = false }: Props) {
  const [value, setValue] = useState(initialQuery);
  const [locValue, setLocValue] = useState(initialLocation);
  const [open, setOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [locHighlight, setLocHighlight] = useState(0);
  const [remote, setRemote] = useState<SuggestItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const locBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseQuery(value), [value]);

  // Location options filtered by what the user typed.
  const locItems = useMemo(() => {
    const t = locValue.trim().toLowerCase();
    if (!t) return LOCATION_ITEMS;
    return LOCATION_ITEMS.filter((i) => i.label.toLowerCase().includes(t.replace(/,\s*$/, '')));
  }, [locValue]);

  // Fetch entity autocomplete for the text portion.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (parsed.text.length < 2) { setRemote([]); return; }
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(parsed.text)}`);
        if (res.ok) {
          const data = await res.json();
          setRemote((data.suggestions ?? []).map((s: { label: string; kind: string; value: string }) => ({ ...s })));
        }
      } catch { /* offline — ignore */ }
    }, 160);
    return () => clearTimeout(t);
  }, [parsed.text]);

  const tagSuggestions: SuggestItem[] = useMemo(() => {
    if (parsed.activeFragment === null) return [];
    return suggestHashtags(parsed.activeFragment).map((h) => ({
      label: `#${h.tag}`, kind: h.kind, value: h.tag, isTag: true,
    }));
  }, [parsed.activeFragment]);

  const historyItems: SuggestItem[] = useMemo(() => {
    if (value.trim()) return [];
    return getHistory().slice(0, 4).map((h) => ({ label: h, kind: 'recent', value: h }));
  }, [value, open]);

  const items = [...tagSuggestions, ...remote, ...historyItems].slice(0, 10);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
      if (locBoxRef.current && !locBoxRef.current.contains(e.target as Node)) setLocOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { if (autofocus) inputRef.current?.focus(); }, [autofocus]);

  const submit = (q: string = value, near: string = locValue) => {
    const query = q.trim();
    if (!query && !near.trim()) {
      window.location.href = '/search';
      return;
    }
    if (query) pushHistory(query);
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (near.trim()) sp.set('near', near.trim());
    window.location.href = `/search?${sp.toString()}`;
  };

  const pick = (item: SuggestItem) => {
    if (item.isTag) {
      setValue(applyTagSuggestion(value, item.value));
      inputRef.current?.focus();
    } else if (item.kind === 'recent') {
      submit(item.value);
    } else {
      submit(item.value);
    }
    setHighlight(0);
  };

  const pickLocation = (item: SuggestItem) => {
    setLocValue(item.value);
    setLocOpen(false);
    submit(value, item.value);
  };

  const removeTag = (tag: string) => {
    const re = new RegExp(`#${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s?`, 'i');
    setValue(value.replace(re, '').replace(/\s+/g, ' ').trimStart());
    inputRef.current?.focus();
  };

  const hero = size === 'hero';
  const inputPad = hero ? 'py-3 text-[16px]' : 'py-1.5 text-sm';

  return (
    <div className="w-full">
      {parsed.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Active hashtag filters">
          <AnimatePresence>
            {parsed.tags.map((t) => (
              <motion.span
                key={t}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="chip chip-active"
              >
                #{t}
                <button
                  type="button" onClick={() => removeTag(t)}
                  aria-label={`Remove #${t} filter`}
                  className="ml-0.5 rounded-full px-1 font-bold hover:bg-black/10"
                >×</button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className={`flex flex-col gap-2 sm:flex-row ${hero ? '' : 'gap-1.5'}`}>
        {/* WHAT field */}
        <div ref={boxRef} className="relative flex-1">
          <div
            className={`flex items-center gap-2 rounded-2xl border bg-[var(--surface)] transition-shadow focus-within:shadow-lg ${hero ? 'p-2 pl-5 shadow-card' : 'px-3 py-1.5 shadow-sm'}`}
            style={{ borderColor: 'var(--border-strong)' }}
          >
            <svg aria-hidden="true" className={hero ? 'text-xl' : 'text-base'} width={hero ? 20 : 16} height={hero ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); setOpen(true); setHighlight(0); }}
              onFocus={() => { setOpen(true); setLocOpen(false); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setHighlight((h) => (h + 1) % items.length); }
                else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setHighlight((h) => (h - 1 + items.length) % items.length); }
                else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (open && items[highlight]) pick(items[highlight]);
                  else submit();
                } else if (e.key === 'Escape') setOpen(false);
              }}
              role="combobox"
              aria-expanded={open && items.length > 0}
              aria-controls="cl-search-listbox"
              aria-label="Service, category, or business name"
              aria-autocomplete="list"
              placeholder="Service, category, or business name"
              className={`w-full bg-transparent outline-none placeholder:text-[var(--text-mute)] ${inputPad}`}
            />
            {value && (
              <button type="button" onClick={() => setValue('')} aria-label="Clear search" className="rounded-full px-2 text-[var(--text-mute)] hover:text-[var(--text)]">×</button>
            )}
            <button type="button" onClick={() => submit()} className={`btn btn-primary shrink-0 ${hero ? '' : '!px-4 !py-1.5 !text-[13px]'}`}>
              Search Businesses
            </button>
          </div>

          <AnimatePresence>
            {open && items.length > 0 && (
              <motion.ul
                id="cl-search-listbox"
                role="listbox"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="card absolute z-50 mt-2 max-h-80 w-full overflow-auto p-1.5"
              >
                {items.map((item, i) => (
                  <li key={`${item.kind}:${item.label}:${i}`} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pick(item)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${i === highlight ? 'bg-[var(--surface-2)]' : ''}`}
                    >
                      <span aria-hidden="true" className="w-5 text-center font-bold" style={{ color: 'var(--logo-gold)' }}>
                        {item.isTag ? '#' : ''}
                      </span>
                      <span className="flex-1 truncate font-medium">{item.label}</span>
                      <span className="text-[11px] capitalize" style={{ color: 'var(--text-mute)' }}>{item.kind}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* WHERE field */}
        <div ref={locBoxRef} className={`relative sm:w-64`}>
          <div
            className={`flex items-center gap-2 rounded-2xl border bg-[var(--surface)] transition-shadow focus-within:shadow-lg ${hero ? 'p-2 shadow-card' : 'px-3 py-1.5 shadow-sm'}`}
            style={{ borderColor: 'var(--border-strong)' }}
          >
            <svg aria-hidden="true" className={hero ? 'text-xl' : 'text-base'} width={hero ? 20 : 16} height={hero ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.8" /></svg>
            <input
              value={locValue}
              onChange={(e) => { setLocValue(e.target.value); setLocOpen(true); setLocHighlight(0); }}
              onFocus={() => { setLocOpen(true); setOpen(false); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && locItems.length) { e.preventDefault(); setLocHighlight((h) => (h + 1) % locItems.length); }
                else if (e.key === 'ArrowUp' && locItems.length) { e.preventDefault(); setLocHighlight((h) => (h - 1 + locItems.length) % locItems.length); }
                else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (locOpen && locItems[locHighlight]) pickLocation(locItems[locHighlight]);
                  else submit();
                } else if (e.key === 'Escape') setLocOpen(false);
              }}
              role="combobox"
              aria-expanded={locOpen && locItems.length > 0}
              aria-controls="cl-location-listbox"
              aria-label="City, state, or ZIP code"
              aria-autocomplete="list"
              placeholder="City, state, or ZIP"
              className={`w-full bg-transparent outline-none placeholder:text-[var(--text-mute)] ${hero ? 'py-3 text-[16px]' : 'py-1.5 text-sm'}`}
            />
            {locValue && (
              <button type="button" onClick={() => setLocValue('')} aria-label="Clear location" className="rounded-full px-2 text-[var(--text-mute)] hover:text-[var(--text)]">×</button>
            )}
          </div>

          <AnimatePresence>
            {locOpen && locItems.length > 0 && (
              <motion.ul
                id="cl-location-listbox"
                role="listbox"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="card absolute z-50 mt-2 max-h-72 w-full overflow-auto p-1.5"
              >
                {locItems.map((item, i) => (
                  <li key={item.value} role="option" aria-selected={i === locHighlight}>
                    <button
                      type="button"
                      onMouseEnter={() => setLocHighlight(i)}
                      onClick={() => pickLocation(item)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${i === locHighlight ? 'bg-[var(--surface-2)]' : ''}`}
                    >
                      <span className="flex-1 truncate font-medium">{item.label}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-mute)' }}>{item.kind}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
