'use client';

import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { type ArtistFilter } from '@/config/notion';

export function getPageTitle(base: string, artist: ArtistFilter): string {
  return artist === 'all' ? base : `${base} \u2014 ${artist}`;
}

export function PageHeader({ title }: { title: string }) {
  const { artist } = useArtistContext();

  return (
    <h1 className="text-2xl font-bold text-white">
      {getPageTitle(title, artist)}
    </h1>
  );
}
