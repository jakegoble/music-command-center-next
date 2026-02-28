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
    <div className="grid grid-cols-4 gap-1 rounded-full bg-gray-800/50 p-1" role="radiogroup" aria-label="Artist filter">
      {options.map((opt) => {
        const isActive = artist === opt.value;
        const color =
          opt.value !== 'all'
            ? ARTIST_COLORS[opt.value as Artist]
            : undefined;

        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setArtist(opt.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setArtist(opt.value);
              }
            }}
            className={`rounded-full py-2 text-xs font-medium transition-all duration-200 ease-in-out ${
              isActive
                ? 'text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            style={
              isActive
                ? { backgroundColor: color ?? '#4b5563' }
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
