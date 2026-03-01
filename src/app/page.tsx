'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { CatalogStats, SongSummary } from '@/lib/types';

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
  'Has Atmos': { color: 'text-cyan-400', border: 'border-l-cyan-500' },
  'Has Stems': { color: 'text-pink-400', border: 'border-l-pink-500' },
  'Albums': { color: 'text-indigo-400', border: 'border-l-indigo-500' },
};

const GENRE_COLORS = ['#8B5CF6', '#3B82F6', '#22C55E', '#F97316', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#84CC16'];
const MOOD_COLORS = ['#F472B6', '#818CF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#38BDF8', '#FB923C', '#4ADE80', '#E879F9'];
const KEY_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#38BDF8', '#FB923C', '#4ADE80', '#818CF8', '#E879F9', '#22D3EE'];

export default function Dashboard() {
  const { artist } = useArtistContext();
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [royaltyData, setRoyaltyData] = useState<{ total_revenue: number; by_source: Record<string, number>; by_quarter: Record<string, number> } | null>(null);
  const [topSongs, setTopSongs] = useState<SongSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';
    const songParams = artist !== 'all'
      ? `?artist=${artistToParam(artist)}&sort=total_streams&order=desc&limit=10`
      : '?sort=total_streams&order=desc&limit=10';

    Promise.all([
      fetch(`/api/catalog/stats${params}`).then(r => { if (!r.ok) throw new Error(`Stats: ${r.status}`); return r.json(); }),
      fetch(`/api/royalties${params}`).then(r => { if (!r.ok) throw new Error(`Royalties: ${r.status}`); return r.json(); }),
      fetch(`/api/catalog${songParams}`).then(r => { if (!r.ok) throw new Error(`Songs: ${r.status}`); return r.json(); }),
    ])
      .then(([s, r, c]) => {
        if (!cancelled) {
          setStats(s);
          setRoyaltyData(r);
          setTopSongs(c.songs ?? []);
        }
      })
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
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  const kpiGroups = [
    {
      title: 'Catalog',
      kpis: [
        { label: 'Total Songs', value: stats.total_songs.toString() },
        { label: 'Released', value: stats.released.toString() },
        { label: 'In Progress', value: stats.in_progress.toString() },
        { label: 'Albums', value: stats.total_albums.toString() },
      ],
    },
    {
      title: 'Performance',
      kpis: [
        { label: 'Total Streams', value: formatNumber(stats.total_streams) },
        { label: 'Sync Ready', value: stats.sync_ready.toString() },
        { label: 'Has Atmos', value: stats.has_atmos.toString() },
        { label: 'Has Stems', value: stats.has_stems.toString() },
      ],
    },
    {
      title: 'Revenue',
      kpis: [
        { label: 'Est. Revenue', value: formatCurrency(stats.total_estimated_revenue) },
        { label: 'Actual Revenue', value: royaltyData ? formatCurrency(royaltyData.total_revenue) : '$0.00' },
      ],
    },
  ];

  // Catalog health percentages
  const healthMetrics = stats.total_songs > 0 ? [
    { label: 'Sync Ready', pct: Math.round((stats.sync_ready / stats.total_songs) * 100), color: '#F97316' },
    { label: 'Atmos Mix', pct: Math.round((stats.has_atmos / stats.total_songs) * 100), color: '#22D3EE' },
    { label: 'Stems Complete', pct: Math.round((stats.has_stems / stats.total_songs) * 100), color: '#EC4899' },
    { label: 'Released', pct: Math.round((stats.released / stats.total_songs) * 100), color: '#22C55E' },
  ] : [];

  const genreEntries = Object.entries(stats.genre_distribution).sort((a, b) => b[1] - a[1]);
  const maxGenre = genreEntries.length > 0 ? genreEntries[0][1] : 1;
  const moodEntries = Object.entries(stats.mood_distribution).sort((a, b) => b[1] - a[1]);
  const maxMood = moodEntries.length > 0 ? moodEntries[0][1] : 1;
  const keyEntries = Object.entries(stats.key_distribution).sort((a, b) => b[1] - a[1]);
  const maxKey = keyEntries.length > 0 ? keyEntries[0][1] : 1;
  const artistEntries = Object.entries(stats.artist_distribution).sort((a, b) => b[1] - a[1]);
  const totalArtistSongs = artistEntries.reduce((s, [, c]) => s + c, 0) || 1;
  const quarterEntries = royaltyData ? Object.entries(royaltyData.by_quarter).sort((a, b) => a[0].localeCompare(b[0])) : [];
  const maxQuarter = quarterEntries.length > 0 ? Math.max(...quarterEntries.map(([, v]) => v)) : 1;
  const sourceEntries = royaltyData ? Object.entries(royaltyData.by_source).sort((a, b) => b[1] - a[1]) : [];
  const maxSource = sourceEntries.length > 0 ? sourceEntries[0][1] : 1;
  const yearEntries = Object.entries(stats.year_distribution).sort((a, b) => a[0].localeCompare(b[0]));

  const maxTopStreams = topSongs.length > 0 ? topSongs[0].total_streams : 1;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* KPI Cards — Grouped */}
      <div className="mt-6 space-y-4">
        {kpiGroups.map(group => (
          <div key={group.title}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{group.title}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {group.kpis.map(kpi => {
                const style = KPI_STYLES[kpi.label] ?? { color: 'text-white', border: 'border-l-gray-500' };
                return (
                  <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${style.border} bg-gray-800/50 p-4`}>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${style.color}`}>{kpi.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Catalog Health Bar */}
      {healthMetrics.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Health</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {healthMetrics.map(m => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{m.label}</span>
                  <span className="text-sm font-bold text-white">{m.pct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-900">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 10 Songs + Songs by Artist */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Top 10 Songs by Streams */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Top 10 Songs</h2>
            <Link href="/streaming" className="text-xs text-orange-400 hover:text-orange-300">View all &rarr;</Link>
          </div>
          {topSongs.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No song data available.</p>
          ) : (
            <div className="space-y-2">
              {topSongs.slice(0, 10).map((song, i) => {
                const artistColor = ARTIST_COLORS[song.artist as Artist] ?? '#6b7280';
                return (
                  <Link key={song.id} href={`/catalog/${song.slug}`} className="group flex items-center gap-3">
                    <span className="w-5 text-right text-xs font-medium text-gray-500">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white group-hover:text-orange-400">{song.title}</span>
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: artistColor }}>{song.artist}</span>
                      </div>
                      <div className="mt-0.5 h-3 w-full rounded bg-gray-900">
                        <div
                          className="h-3 rounded"
                          style={{ width: `${(song.total_streams / maxTopStreams) * 100}%`, backgroundColor: `${artistColor}99` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-gray-400">{formatNumber(song.total_streams)}</span>
                  </Link>
                );
              })}
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
      </div>

      {/* Genre + Mood */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
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

        {/* Mood Distribution */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Mood Distribution</h2>
          {moodEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No mood data available.</p>
          ) : (
            <div className="space-y-2">
              {moodEntries.slice(0, 10).map(([mood, count], i) => (
                <div key={mood} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-gray-300">{mood}</span>
                  <div className="flex-1">
                    <div className="h-5 rounded" style={{ width: `${(count / maxMood) * 100}%`, backgroundColor: `${MOOD_COLORS[i % MOOD_COLORS.length]}99` }} />
                  </div>
                  <span className="w-8 text-right text-sm text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key + Year Distribution */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Key Distribution */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Key Distribution</h2>
          {keyEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No key data available.</p>
          ) : (
            <div className="space-y-2">
              {keyEntries.slice(0, 12).map(([k, count], i) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm font-medium text-gray-300">{k}</span>
                  <div className="flex-1">
                    <div className="h-5 rounded" style={{ width: `${(count / maxKey) * 100}%`, backgroundColor: `${KEY_COLORS[i % KEY_COLORS.length]}99` }} />
                  </div>
                  <span className="w-8 text-right text-sm text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Releases by Year */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Releases by Year</h2>
          {yearEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No year data available.</p>
          ) : (
            <div className="flex items-end gap-2" style={{ height: 180 }}>
              {yearEntries.map(([year, count]) => {
                const maxYear = Math.max(...yearEntries.map(([, v]) => v));
                const barH = maxYear > 0 ? (count / maxYear) * 150 : 0;
                return (
                  <div key={year} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs text-gray-400">{count}</span>
                    <div className="w-full rounded-t bg-indigo-500/70" style={{ height: barH }} />
                    <span className="text-[10px] text-gray-500">{year}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
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

      {/* Distributor Distribution */}
      {Object.keys(stats.distributor_distribution).length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Songs by Distributor</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(stats.distributor_distribution).sort((a, b) => b[1] - a[1]).map(([dist, count]) => (
              <div key={dist} className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-3 text-center">
                <p className="text-lg font-bold text-white">{count}</p>
                <p className="mt-0.5 text-xs text-gray-400">{dist}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
