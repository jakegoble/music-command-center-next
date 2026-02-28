'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { CatalogStats } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function AIInsightsPage() {
  const { artist } = useArtistContext();
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';
    fetch(`/api/catalog/stats${params}`)
      .then(r => { if (!r.ok) throw new Error(`Fetch failed: ${r.status}`); return r.json(); })
      .then(data => { if (!cancelled) setStats(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [artist]);

  if (error) {
    return (
      <div>
        <PageHeader title="AI Insights" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load: {error}</div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div>
        <PageHeader title="AI Insights" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-800/50" />)}
        </div>
      </div>
    );
  }

  // Derive insights from stats
  const topGenres = Object.entries(stats.genre_distribution).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMoods = Object.entries(stats.mood_distribution).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const syncPct = stats.total_songs > 0 ? Math.round((stats.sync_ready / stats.total_songs) * 100) : 0;
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;
  const atmosPct = stats.total_songs > 0 ? Math.round((stats.has_atmos / stats.total_songs) * 100) : 0;

  return (
    <div>
      <PageHeader title="AI Insights" />

      <div className="mt-4 rounded-lg border border-blue-800/50 bg-blue-950/20 px-4 py-3 text-sm text-blue-300">
        Insights derived from your catalog data. AI-powered analysis coming soon.
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Catalog Summary */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">Catalog Summary</h3>
          <div className="space-y-3 text-sm">
            <p className="text-gray-300">Your catalog has <span className="font-semibold text-white">{stats.total_songs} songs</span> with <span className="font-semibold text-white">{formatNumber(stats.total_streams)} total streams</span>.</p>
            <p className="text-gray-300"><span className="font-semibold text-green-400">{releasedPct}%</span> of your catalog is released ({stats.released} songs).</p>
            {stats.in_progress > 0 && <p className="text-gray-300"><span className="font-semibold text-orange-400">{stats.in_progress} songs</span> currently in progress.</p>}
          </div>
        </div>

        {/* Top Genres */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-400">Top Genres</h3>
          {topGenres.length === 0 ? (
            <p className="text-sm text-gray-500">No genre data available.</p>
          ) : (
            <div className="space-y-2">
              {topGenres.map(([genre, count], i) => (
                <div key={genre} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{i + 1}. {genre}</span>
                  <span className="text-sm font-medium text-white">{count} songs</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Moods */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400">Top Moods</h3>
          {topMoods.length === 0 ? (
            <p className="text-sm text-gray-500">No mood data available.</p>
          ) : (
            <div className="space-y-2">
              {topMoods.map(([mood, count], i) => (
                <div key={mood} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{i + 1}. {mood}</span>
                  <span className="text-sm font-medium text-white">{count} songs</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Readiness */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-400">Sync Readiness</h3>
          <div className="space-y-3 text-sm">
            <p className="text-gray-300"><span className="font-semibold text-white">{syncPct}%</span> of your catalog is sync-ready ({stats.sync_ready} songs).</p>
            <p className="text-gray-300"><span className="font-semibold text-white">{stats.has_stems}</span> songs have stems complete.</p>
            <p className="text-gray-300"><span className="font-semibold text-white">{atmosPct}%</span> have Atmos mixes ({stats.has_atmos} songs).</p>
          </div>
        </div>

        {/* Key Distribution */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">Key Distribution</h3>
          {Object.keys(stats.key_distribution).length === 0 ? (
            <p className="text-sm text-gray-500">No key data available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.key_distribution).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key, count]) => (
                <span key={key} className="rounded-full bg-amber-900/30 px-3 py-1 text-xs text-amber-300">
                  {key} <span className="text-amber-400/70">({count})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* BPM Insight */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-400">BPM Analysis</h3>
          <div className="text-sm text-gray-300">
            {stats.avg_bpm ? (
              <p>Average BPM across your catalog is <span className="font-semibold text-white">{stats.avg_bpm}</span>.</p>
            ) : (
              <p className="text-gray-500">No BPM data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="mt-8 rounded-xl border border-dashed border-gray-700 p-8 text-center">
        <p className="text-lg font-medium text-gray-400">AI-Powered Insights Coming Soon</p>
        <p className="mt-2 text-sm text-gray-500">Personalized recommendations, trend analysis, sync matching suggestions, and more.</p>
      </div>
    </div>
  );
}
