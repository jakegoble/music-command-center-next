'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { AlbumSummary, AlbumsResponse } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function AlbumsPage() {
  const { artist } = useArtistContext();
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('release_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (artist !== 'all') params.set('artist', artistToParam(artist));
    params.set('sort', sort);
    params.set('order', order);

    try {
      const r = await fetch(`/api/catalog/albums?${params}`);
      if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
      const data: AlbumsResponse = await r.json();
      setAlbums(data.albums);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [artist, sort, order]);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const toggleSort = (field: string) => {
    if (sort === field) setOrder(order === 'desc' ? 'asc' : 'desc');
    else { setSort(field); setOrder('desc'); }
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Albums" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load albums: {error}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Albums" />

      {/* Sort controls */}
      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm text-gray-400">Sort by:</span>
        {[
          { field: 'release_date', label: 'Date' },
          { field: 'name', label: 'Name' },
          { field: 'total_streams', label: 'Streams' },
          { field: 'track_count', label: 'Tracks' },
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              sort === field ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >{label}{sort === field ? (order === 'desc' ? ' \u2193' : ' \u2191') : ''}</button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{albums.length} album{albums.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Album grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-800/50" />
          ))
        ) : albums.length === 0 ? (
          <p className="col-span-full py-8 text-center text-gray-500">No albums found.</p>
        ) : (
          albums.map(album => {
            const color = ARTIST_COLORS[album.artist as Artist] ?? '#6b7280';
            return (
              <Link
                key={album.slug}
                href={`/catalog/albums/${album.slug}`}
                className="group rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 transition-colors hover:border-gray-600"
              >
                {/* Gradient artwork placeholder */}
                <div
                  className="mb-3 flex h-24 items-center justify-center rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${color}44, ${color}11)` }}
                >
                  <span className="text-2xl font-bold" style={{ color }}>{album.name.charAt(0)}</span>
                </div>

                <h3 className="truncate font-semibold text-white group-hover:text-orange-400">{album.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${color}22`, color }}>{album.artist}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    album.status === 'Released' ? 'bg-green-900/50 text-green-300' :
                    album.status === 'Mixed' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-gray-700/50 text-gray-400'
                  }`}>{album.status}</span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{album.track_count} track{album.track_count !== 1 ? 's' : ''}</span>
                  <span className="font-medium text-gray-300">{formatNumber(album.total_streams)}</span>
                </div>
                {album.release_date && (
                  <p className="mt-1 text-xs text-gray-500">{new Date(album.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                )}
                {album.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {album.genres.slice(0, 3).map(g => (
                      <span key={g} className="rounded bg-gray-700/50 px-1.5 py-0.5 text-[10px] text-gray-400">{g}</span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
