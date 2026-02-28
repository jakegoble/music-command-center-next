'use client';

import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { ARTIST_COLORS, type Artist } from '@/config/notion';

export function ArtistBadge() {
  const { artist, setArtist } = useArtistContext();

  if (artist === 'all') return null;

  const color = ARTIST_COLORS[artist as Artist];

  return (
    <div
      className="mb-4 flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
      style={{
        backgroundColor: `${color}1a`,
        borderColor: color,
        color: color,
      }}
    >
      <span>
        <span className="mr-1.5">&#9835;</span>
        Viewing: <span className="font-semibold">{artist}</span>
      </span>
      <button
        onClick={() => setArtist('all')}
        className="ml-4 rounded-full p-0.5 transition-colors hover:bg-white/10"
        aria-label="Clear artist filter"
      >
        &#10005;
      </button>
    </div>
  );
}
