'use client';

import { useState, useEffect, useCallback } from 'react';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import type { SongSummary, RoyaltyEntry } from '@/lib/types';
import { artistToParam, type ArtistFilter } from '@/config/notion';

interface UseArtistFilterResult {
  artist: ArtistFilter;
  setArtist: (artist: ArtistFilter) => void;
  songs: SongSummary[];
  royalties: RoyaltyEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useArtistFilter(): UseArtistFilterResult {
  const { artist, setArtist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [royalties, setRoyalties] = useState<RoyaltyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';

    Promise.all([
      fetch(`/api/catalog${params}`).then((r) => {
        if (!r.ok) throw new Error(`Catalog fetch failed: ${r.status}`);
        return r.json();
      }),
      fetch(`/api/royalties${params}`).then((r) => {
        if (!r.ok) throw new Error(`Royalties fetch failed: ${r.status}`);
        return r.json();
      }),
    ])
      .then(([catalogData, royaltyData]) => {
        if (cancelled) return;
        setSongs(catalogData.songs ?? []);
        setRoyalties(royaltyData.entries ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist, fetchKey]);

  return { artist, setArtist, songs, royalties, isLoading, error, refetch };
}
