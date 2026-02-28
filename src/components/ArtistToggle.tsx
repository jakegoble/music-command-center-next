'use client';

import { useArtistContext } from '@/lib/contexts/ArtistContext';
import {
  ARTIST_OPTIONS,
  ARTIST_COLORS,
  type ArtistFilter,
  type Artist,
} from '@/config/notion';

const options: { value: ArtistFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...ARTIST_OPTIONS.map((a) => ({ value: a as ArtistFilter, label: a })),
];

export function ArtistToggle() {
  const { artist, setArtist } = useArtistContext();

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-800/50 p-1" role="radiogroup" aria-label="Artist filter">
      {options.map((opt) => {
        const isActive = artist === opt.value;
        const color =
          opt.value !== 'all'
            ? ARTIST_COLORS[opt.value as Artist]
            : '#F97316';

        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setArtist(opt.value)}
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
            style={
              isActive
                ? { backgroundColor: color, color: '#fff' }
                : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
