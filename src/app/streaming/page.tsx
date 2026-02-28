'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongSummary, CatalogStats } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Velocity: streams per day since release
// ---------------------------------------------------------------------------
function calcVelocity(song: SongSummary): number | null {
  if (!song.release_date || song.total_streams === 0) return null;
  const released = new Date(song.release_date);
  const now = new Date();
  const days = Math.max(1, Math.floor((now.getTime() - released.getTime()) / (1000 * 60 * 60 * 24)));
  return song.total_streams / days;
}

function isRecentThreeYears(song: SongSummary): boolean {
  if (!song.release_date) return false;
  const released = new Date(song.release_date);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 3);
  return released >= cutoff;
}

// ---------------------------------------------------------------------------
// Horizontal Bar Chart
// ---------------------------------------------------------------------------
function BarChart({
  data,
  color = '#8B5CF6',
  valueFormatter = formatNumber,
  maxBars = 15,
}: {
  data: { label: string; value: number; color?: string }[];
  color?: string;
  valueFormatter?: (n: number) => string;
  maxBars?: number;
}) {
  const sliced = data.slice(0, maxBars);
  const max = sliced.length > 0 ? Math.max(...sliced.map(d => d.value)) : 1;

  return (
    <div className="space-y-1.5">
      {sliced.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-36 shrink-0 truncate text-xs text-gray-300" title={d.label}>{d.label}</span>
          <div className="flex-1">
            <div
              className="h-5 rounded"
              style={{
                width: `${Math.max(2, (d.value / max) * 100)}%`,
                backgroundColor: d.color ?? color,
                opacity: 0.7,
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-gray-400">{valueFormatter(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popularity Chart (color-graduated bars)
// ---------------------------------------------------------------------------
function PopularityChart({ songs }: { songs: SongSummary[] }) {
  const withPop = songs
    .filter(s => s.popularity_score !== null && s.popularity_score > 0)
    .sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0))
    .slice(0, 15);

  if (withPop.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">No popularity data available.</p>;
  }

  return (
    <div className="space-y-1.5">
      {withPop.map(s => {
        const score = s.popularity_score ?? 0;
        const hue = score >= 60 ? 142 : score >= 40 ? 45 : score >= 20 ? 30 : 0;
        const color = `hsl(${hue}, 70%, 50%)`;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-36 shrink-0 truncate text-xs text-gray-300">{s.title}</span>
            <div className="flex-1">
              <div
                className="h-5 rounded"
                style={{ width: `${score}%`, backgroundColor: color, opacity: 0.7 }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-medium" style={{ color }}>{score}/100</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Release Impact Scatter (SVG)
// ---------------------------------------------------------------------------
function ReleaseImpactScatter({ songs }: { songs: SongSummary[] }) {
  const withData = songs.filter(s => s.release_date && s.total_streams > 0);
  if (withData.length === 0) return <p className="py-4 text-center text-sm text-gray-500">Not enough data.</p>;

  const w = 500, h = 280;
  const pad = { left: 50, right: 20, top: 20, bottom: 35 };

  const dates = withData.map(s => new Date(s.release_date!).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;
  const maxStreams = Math.max(...withData.map(s => s.total_streams));

  function xPos(date: string) {
    return pad.left + ((new Date(date).getTime() - minDate) / dateRange) * (w - pad.left - pad.right);
  }
  function yPos(streams: number) {
    return pad.top + (1 - streams / maxStreams) * (h - pad.top - pad.bottom);
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* Axis labels */}
      <text x={w / 2} y={h - 4} textAnchor="middle" className="fill-gray-500 text-[10px]">Release Date</text>
      <text x={10} y={h / 2} textAnchor="middle" transform={`rotate(-90, 10, ${h / 2})`} className="fill-gray-500 text-[10px]">Streams</text>
      {/* Border */}
      <rect x={pad.left} y={pad.top} width={w - pad.left - pad.right} height={h - pad.top - pad.bottom} fill="none" stroke="#374151" strokeWidth={1} />
      {/* Data points */}
      {withData.map(s => {
        const velocity = calcVelocity(s);
        const radius = Math.max(4, Math.min(16, velocity ? Math.sqrt(velocity) * 1.5 : 4));
        const color = ARTIST_COLORS[s.artist as Artist] ?? '#6b7280';
        return (
          <g key={s.id}>
            <circle
              cx={xPos(s.release_date!)}
              cy={yPos(s.total_streams)}
              r={radius}
              fill={color}
              opacity={0.6}
            />
            <title>{`${s.title} — ${formatNumber(s.total_streams)} streams${velocity ? ` (${velocity.toFixed(1)}/day)` : ''}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function StreamingPage() {
  const { artist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';

    Promise.all([
      fetch(`/api/catalog${params}&limit=100&sort=total_streams&order=desc`).then(r => {
        if (!r.ok) throw new Error(`Catalog: ${r.status}`);
        return r.json();
      }),
      fetch(`/api/catalog/stats${params}`).then(r => {
        if (!r.ok) throw new Error(`Stats: ${r.status}`);
        return r.json();
      }),
    ])
      .then(([catalog, s]) => {
        if (!cancelled) {
          setSongs(catalog.songs);
          setStats(s);
        }
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [artist]);

  const topAllTime = useMemo(
    () => songs.filter(s => s.total_streams > 0).sort((a, b) => b.total_streams - a.total_streams),
    [songs],
  );
  const topRecent = useMemo(
    () => songs.filter(s => isRecentThreeYears(s) && s.total_streams > 0).sort((a, b) => b.total_streams - a.total_streams),
    [songs],
  );
  const byVelocity = useMemo(
    () => songs.map(s => ({ ...s, velocity: calcVelocity(s) })).filter(s => s.velocity !== null && s.velocity > 0).sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0)),
    [songs],
  );

  if (error) {
    return (
      <div>
        <PageHeader title="Streaming" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load: {error}</div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div>
        <PageHeader title="Streaming" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-800/50" />)}
        </div>
      </div>
    );
  }

  const avgStreams = stats.total_songs > 0 ? Math.round(stats.total_streams / stats.total_songs) : 0;
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;

  return (
    <div>
      <PageHeader title="Streaming" />

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Streams', value: formatNumber(stats.total_streams), color: 'text-purple-400', border: 'border-l-purple-500' },
          { label: 'Songs Released', value: `${stats.released} (${releasedPct}%)`, color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Avg Streams/Song', value: formatNumber(avgStreams), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Est. Revenue', value: formatCurrency(stats.total_estimated_revenue), color: 'text-emerald-400', border: 'border-l-emerald-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Top 15 All-Time */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top 15 Songs — All Time</h2>
          {topAllTime.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No stream data.</p>
          ) : (
            <BarChart
              data={topAllTime.slice(0, 15).map(s => ({
                label: s.title,
                value: s.total_streams,
                color: ARTIST_COLORS[s.artist as Artist] ?? '#8B5CF6',
              }))}
            />
          )}
        </div>

        {/* Top 15 Recent (3 Years) */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top 15 Songs — Recent 3 Years</h2>
          {topRecent.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No recent stream data.</p>
          ) : (
            <BarChart
              data={topRecent.slice(0, 15).map(s => ({
                label: s.title,
                value: s.total_streams,
                color: ARTIST_COLORS[s.artist as Artist] ?? '#3B82F6',
              }))}
            />
          )}
        </div>

        {/* Popularity Scores */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Spotify Popularity Scores</h2>
          <PopularityChart songs={songs} />
        </div>

        {/* Velocity Analysis */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Velocity — Streams/Day</h2>
          {byVelocity.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No velocity data.</p>
          ) : (
            <BarChart
              data={byVelocity.slice(0, 15).map(s => ({
                label: s.title,
                value: Math.round(s.velocity ?? 0),
                color: ARTIST_COLORS[s.artist as Artist] ?? '#22C55E',
              }))}
              valueFormatter={v => `${v}/day`}
            />
          )}
        </div>

        {/* Release Impact Scatter */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 md:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Release Impact — Streams by Release Date</h2>
          <p className="mb-3 text-xs text-gray-500">Bubble size = velocity (streams/day). Color = artist.</p>
          <ReleaseImpactScatter songs={songs} />
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {Object.entries(ARTIST_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-gray-400">{name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Song Details Table */}
      <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Song Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2 text-right">Streams</th>
                <th className="px-3 py-2 text-right">Pop.</th>
                <th className="px-3 py-2 text-right">Velocity</th>
                <th className="px-3 py-2">Released</th>
                <th className="px-3 py-2 text-right">Est. Rev.</th>
              </tr>
            </thead>
            <tbody>
              {topAllTime.slice(0, 20).map((s, i) => {
                const velocity = calcVelocity(s);
                return (
                  <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <a href={`/catalog/${s.slug}`} className="font-medium text-white hover:text-orange-400">{s.title}</a>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${ARTIST_COLORS[s.artist as Artist] ?? '#6b7280'}22`, color: ARTIST_COLORS[s.artist as Artist] ?? '#6b7280' }}>{s.artist}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-white">{formatNumber(s.total_streams)}</td>
                    <td className="px-3 py-2 text-right">{s.popularity_score ?? '\u2014'}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{velocity ? `${velocity.toFixed(1)}/day` : '\u2014'}</td>
                    <td className="px-3 py-2 text-gray-400">{s.release_date ?? '\u2014'}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(s.estimated_revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
