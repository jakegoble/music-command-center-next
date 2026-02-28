'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongSummary } from '@/lib/types';

export default function SyncPipelinePage() {
  const { artist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (artist !== 'all') params.set('artist', artistToParam(artist));
    params.set('limit', '100');

    fetch(`/api/catalog?${params}`)
      .then(r => { if (!r.ok) throw new Error(`Fetch failed: ${r.status}`); return r.json(); })
      .then(data => { if (!cancelled) setSongs(data.songs ?? []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [artist]);

  const syncReady = songs.filter(s => s.sync_available);
  const hasStem = songs.filter(s => s.stems_complete);
  const hasAtmos = songs.filter(s => s.atmos_mix);

  const tierGroups: Record<string, SongSummary[]> = {};
  for (const s of syncReady) {
    const tier = s.sync_tier ?? 'Untiered';
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(s);
  }

  const tierOrder = ['Tier 1', 'Tier 2', 'Tier 3', 'Untiered'];
  const tierColor: Record<string, string> = {
    'Tier 1': 'border-l-red-500 bg-red-950/20',
    'Tier 2': 'border-l-yellow-500 bg-yellow-950/20',
    'Tier 3': 'border-l-green-500 bg-green-950/20',
    'Untiered': 'border-l-gray-500 bg-gray-900/50',
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Sync Pipeline" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load: {error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Sync Pipeline" />
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/50" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Sync Pipeline" />

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-700/50 border-l-4 border-l-green-500 bg-gray-800/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Sync Available</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{syncReady.length}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 border-l-4 border-l-blue-500 bg-gray-800/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Stems Ready</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">{hasStem.length}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 border-l-4 border-l-purple-500 bg-gray-800/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Atmos Mixes</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{hasAtmos.length}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 border-l-4 border-l-orange-500 bg-gray-800/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Catalog</p>
          <p className="mt-1 text-2xl font-bold text-orange-400">{songs.length}</p>
        </div>
      </div>

      {/* Tier Groups */}
      <div className="mt-8 space-y-6">
        {tierOrder.map(tier => {
          const group = tierGroups[tier];
          if (!group || group.length === 0) return null;
          return (
            <div key={tier}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{tier} ({group.length})</h2>
              <div className="space-y-2">
                {group.map(song => {
                  const color = ARTIST_COLORS[song.artist as Artist] ?? '#6b7280';
                  return (
                    <Link
                      key={song.id}
                      href={artist !== 'all' ? `/catalog/${song.slug}?artist=${artistToParam(artist)}&tab=Sync` : `/catalog/${song.slug}?tab=Sync`}
                      className={`flex items-center justify-between rounded-lg border border-l-4 border-gray-700/50 px-4 py-3 transition-colors hover:bg-gray-800/50 ${tierColor[tier] ?? ''}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{song.title}</p>
                        <span className="text-xs" style={{ color }}>{song.artist}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                        {song.stems_complete && <span className="rounded bg-blue-900/50 px-2 py-0.5 text-blue-300">Stems</span>}
                        {song.atmos_mix && <span className="rounded bg-purple-900/50 px-2 py-0.5 text-purple-300">Atmos</span>}
                        <span className="hidden sm:inline">{song.genre.slice(0, 2).join(', ')}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {syncReady.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-12 text-center">
          <p className="text-gray-400">No songs marked as available for sync.</p>
          <p className="mt-1 text-sm text-gray-500">Mark songs as &ldquo;Available for Sync&rdquo; in Notion to see them here.</p>
        </div>
      )}
    </div>
  );
}
