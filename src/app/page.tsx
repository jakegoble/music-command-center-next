'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { CatalogStats } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const KPI_STYLES: Record<string, { color: string; border: string }> = {
  'Total Songs': { color: 'text-blue-400', border: 'border-l-blue-500' },
  'Released': { color: 'text-green-400', border: 'border-l-green-500' },
  'In Progress': { color: 'text-orange-400', border: 'border-l-orange-500' },
  'Total Streams': { color: 'text-purple-400', border: 'border-l-purple-500' },
  'Est. Revenue': { color: 'text-emerald-400', border: 'border-l-emerald-500' },
  'Actual Revenue': { color: 'text-green-400', border: 'border-l-green-500' },
  'Sync Ready': { color: 'text-orange-400', border: 'border-l-orange-500' },
  'Avg BPM': { color: 'text-cyan-400', border: 'border-l-cyan-500' },
};

const GENRE_COLORS = ['#8B5CF6', '#3B82F6', '#22C55E', '#F97316', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#84CC16'];

export default function Dashboard() {
  const { artist } = useArtistContext();
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [royaltyData, setRoyaltyData] = useState<{ total_revenue: number; by_source: Record<string, number>; by_quarter: Record<string, number> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';

    Promise.all([
      fetch(`/api/catalog/stats${params}`).then(r => { if (!r.ok) throw new Error(`Stats: ${r.status}`); return r.json(); }),
      fetch(`/api/royalties${params}`).then(r => { if (!r.ok) throw new Error(`Royalties: ${r.status}`); return r.json(); }),
    ])
      .then(([s, r]) => { if (!cancelled) { setStats(s); setRoyaltyData(r); } })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [artist]);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load dashboard: {error}</div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Songs', value: stats.total_songs.toString() },
    { label: 'Released', value: stats.released.toString() },
    { label: 'In Progress', value: stats.in_progress.toString() },
    { label: 'Total Streams', value: formatNumber(stats.total_streams) },
    { label: 'Est. Revenue', value: formatCurrency(stats.total_estimated_revenue) },
    { label: 'Actual Revenue', value: royaltyData ? formatCurrency(royaltyData.total_revenue) : '$0.00' },
    { label: 'Sync Ready', value: stats.sync_ready.toString() },
    { label: 'Avg BPM', value: stats.avg_bpm?.toString() ?? '\u2014' },
  ];

  const genreEntries = Object.entries(stats.genre_distribution).sort((a, b) => b[1] - a[1]);
  const maxGenre = genreEntries.length > 0 ? genreEntries[0][1] : 1;
  const artistEntries = Object.entries(stats.artist_distribution).sort((a, b) => b[1] - a[1]);
  const totalArtistSongs = artistEntries.reduce((s, [, c]) => s + c, 0) || 1;
  const quarterEntries = royaltyData ? Object.entries(royaltyData.by_quarter).sort((a, b) => a[0].localeCompare(b[0])) : [];
  const maxQuarter = quarterEntries.length > 0 ? Math.max(...quarterEntries.map(([, v]) => v)) : 1;
  const sourceEntries = royaltyData ? Object.entries(royaltyData.by_source).sort((a, b) => b[1] - a[1]) : [];
  const maxSource = sourceEntries.length > 0 ? sourceEntries[0][1] : 1;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(kpi => {
          const style = KPI_STYLES[kpi.label] ?? { color: 'text-white', border: 'border-l-gray-500' };
          return (
            <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${style.border} bg-gray-800/50 p-4`}>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${style.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Genre Distribution */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Genre Distribution</h2>
          {genreEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No genre data available.</p>
          ) : (
            <div className="space-y-2">
              {genreEntries.slice(0, 10).map(([genre, count], i) => (
                <div key={genre} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-gray-300">{genre}</span>
                  <div className="flex-1">
                    <div className="h-5 rounded" style={{ width: `${(count / maxGenre) * 100}%`, backgroundColor: `${GENRE_COLORS[i % GENRE_COLORS.length]}99` }} />
                  </div>
                  <span className="w-8 text-right text-sm text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Songs by Artist */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Songs by Artist</h2>
          {artistEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No artist data available.</p>
          ) : (
            <div className="space-y-3">
              {artistEntries.map(([name, count]) => {
                const color = ARTIST_COLORS[name as Artist] ?? '#6b7280';
                const pct = Math.round((count / totalArtistSongs) * 100);
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{name}</span>
                      <span className="text-sm text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-900">
                      <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by Quarter */}
        {quarterEntries.length > 0 && (
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Quarter</h2>
            <div className="space-y-2">
              {quarterEntries.map(([quarter, amount]) => (
                <div key={quarter} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm text-gray-300">{quarter}</span>
                  <div className="flex-1">
                    <div className="h-5 rounded bg-emerald-600/60" style={{ width: `${(amount / maxQuarter) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm text-gray-400">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue by Source */}
        {sourceEntries.length > 0 && (
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Source</h2>
            <div className="space-y-2">
              {sourceEntries.map(([source, amount]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-gray-300">{source}</span>
                  <div className="flex-1">
                    <div className="h-5 rounded bg-blue-600/60" style={{ width: `${(amount / maxSource) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm text-gray-400">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
