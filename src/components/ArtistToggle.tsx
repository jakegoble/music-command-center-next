'use client';

import { useArtistContext } from '@/lib/contexts/ArtistContext';
import {
  ARTIST_OPTIONS,
  ARTIST_COLORS,
  type ArtistFilter,
  type Artist,
} from '@/config/notion';

const options: { value: ArtistFilter; label: string }[] = [
  { value: 'all', label: 'All Artists' },
  ...ARTIST_OPTIONS.map((a) => ({ value: a as ArtistFilter, label: a })),
];

export function ArtistToggle() {
  const { artist, setArtist } = useArtistContext();

  return (
    <div className="flex rounded-lg bg-gray-800/60 p-0.5" role="radiogroup" aria-label="Artist filter">
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
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
              isActive
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={
              isActive
                ? { backgroundColor: `${color}25`, color, boxShadow: `0 0 0 1px ${color}40` }
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
