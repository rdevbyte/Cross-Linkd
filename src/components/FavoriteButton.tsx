import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { isFavorite, toggleFavorite } from '@/lib/store';

export default function FavoriteButton({ id, label = false }: { id: string; label?: boolean }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFavorite(id));
    const onChange = () => setFav(isFavorite(id));
    window.addEventListener('cl:favorites', onChange);
    return () => window.removeEventListener('cl:favorites', onChange);
  }, [id]);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFav(toggleFavorite(id)); }}
      aria-pressed={fav}
      aria-label={fav ? 'Remove from favorites' : 'Save to favorites'}
      title={fav ? 'Saved' : 'Save to favorites'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        fav ? 'border-[var(--accent)] bg-[rgba(216,149,34,.14)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
      }`}
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.5S4 15.6 2.6 10.9C1.6 7.5 3.7 4.5 7 4.5c2 0 3.5 1.1 4.3 2.4l.7 1.1.7-1.1c.8-1.3 2.3-2.4 4.3-2.4 3.3 0 5.4 3 4.4 6.4C20 15.6 12 20.5 12 20.5Z"/></svg>
      {label && <span>{fav ? 'Saved' : 'Save'}</span>}
    </motion.button>
  );
}
