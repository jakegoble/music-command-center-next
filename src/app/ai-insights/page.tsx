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

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Catalog Health Score — computed entirely from real data
// ---------------------------------------------------------------------------

function norm(value: number, benchmark: number): number {
  if (benchmark <= 0) return 0;
  return Math.min(100, (value / benchmark) * 100);
}

function scoreColor(score: number): string {
  if (score >= 75) return '#1DB954';
  if (score >= 55) return '#FFC107';
  if (score >= 35) return '#FF9800';
  return '#F44336';
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'Strong';
  if (score >= 55) return 'Developing';
  if (score >= 35) return 'Needs Work';
  return 'Critical';
}

interface CatalogScores {
  size: number;
  streaming: number;
  diversity: number;
  sync_readiness: number;
  production: number;
  composite: number;
}

function computeCatalogScores(stats: CatalogStats): CatalogScores {
  // Size (20%): total songs and release rate
  const releasedPct = stats.total_songs > 0 ? stats.released / stats.total_songs : 0;
  const size = (
    0.50 * norm(stats.total_songs, 75) +
    0.50 * norm(releasedPct * 100, 80)
  );

  // Streaming (25%): total and average streams
  const avgStreams = stats.total_songs > 0 ? stats.total_streams / stats.total_songs : 0;
  const streaming = (
    0.50 * norm(stats.total_streams, 5_000_000) +
    0.50 * norm(avgStreams, 200_000)
  );

  // Diversity (15%): genre and mood variety
  const genreCount = Object.keys(stats.genre_distribution).length;
  const moodCount = Object.keys(stats.mood_distribution).length;
  const artistCount = Object.keys(stats.artist_distribution).length;
  const diversity = (
    0.40 * norm(genreCount, 10) +
    0.30 * norm(moodCount, 10) +
    0.30 * norm(artistCount, 5)
  );

  // Sync Readiness (25%): sync-available, stems, atmos
  const syncPct = stats.total_songs > 0 ? stats.sync_ready / stats.total_songs : 0;
  const stemPct = stats.total_songs > 0 ? stats.has_stems / stats.total_songs : 0;
  const atmosPct = stats.total_songs > 0 ? stats.has_atmos / stats.total_songs : 0;
  const sync_readiness = (
    0.40 * norm(syncPct * 100, 50) +
    0.35 * norm(stemPct * 100, 50) +
    0.25 * norm(atmosPct * 100, 30)
  );

  // Production Quality (15%): atmos, stems, album grouping
  const albumCount = stats.total_albums;
  const production = (
    0.35 * norm(stats.has_atmos, Math.max(stats.total_songs * 0.3, 1)) +
    0.35 * norm(stats.has_stems, Math.max(stats.total_songs * 0.5, 1)) +
    0.30 * norm(albumCount, 5)
  );

  const composite = Math.round(
    size * 0.20 +
    streaming * 0.25 +
    diversity * 0.15 +
    sync_readiness * 0.25 +
    production * 0.15
  );

  return {
    size: Math.round(size),
    streaming: Math.round(streaming),
    diversity: Math.round(diversity),
    sync_readiness: Math.round(sync_readiness),
    production: Math.round(production),
    composite,
  };
}

// ---------------------------------------------------------------------------
// SVG Radar Chart — catalog dimensions only
// ---------------------------------------------------------------------------

function RadarChart({ scores }: { scores: CatalogScores }) {
  const categories = [
    { label: 'Size', value: scores.size },
    { label: 'Streaming', value: scores.streaming },
    { label: 'Diversity', value: scores.diversity },
    { label: 'Sync Ready', value: scores.sync_readiness },
    { label: 'Production', value: scores.production },
  ];
  const targets = [70, 60, 65, 70, 60];
  const n = categories.length;
  const cx = 150, cy = 150, r = 110;

  function point(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
  }

  function polygon(values: number[]): string {
    return values.map((v, i) => point(i, v).join(',')).join(' ');
  }

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[380px]">
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => point(i, level).join(',')).join(' ')}
          fill="none"
          stroke="#374151"
          strokeWidth={0.5}
        />
      ))}
      {categories.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#374151" strokeWidth={0.5} />;
      })}
      <polygon
        points={polygon(targets)}
        fill="none"
        stroke="#6b7280"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <polygon
        points={polygon(categories.map(c => c.value))}
        fill="rgba(29,185,84,0.15)"
        stroke="#1DB954"
        strokeWidth={2}
      />
      {categories.map((c, i) => {
        const [x, y] = point(i, c.value);
        return <circle key={i} cx={x} cy={y} r={4} fill="#1DB954" />;
      })}
      {categories.map((c, i) => {
        const [x, y] = point(i, 115);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-[10px]"
          >
            {c.label}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dynamic Insight generation from real catalog stats
// ---------------------------------------------------------------------------

interface InsightCard {
  title: string;
  highlight: string;
  explanation: string;
}

function generateWorkingInsights(stats: CatalogStats): InsightCard[] {
  const insights: InsightCard[] = [];
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;

  if (releasedPct >= 60) {
    insights.push({
      title: `${releasedPct}% of catalog is released`,
      highlight: `${stats.released} of ${stats.total_songs} songs released`,
      explanation: 'Strong release rate keeps the catalog active and discoverable.',
    });
  }

  if (stats.sync_ready > 0) {
    const syncPct = Math.round((stats.sync_ready / stats.total_songs) * 100);
    insights.push({
      title: `${stats.sync_ready} songs are sync-ready`,
      highlight: `${syncPct}% of catalog available for licensing`,
      explanation: 'These songs can be pitched for film, TV, and advertising placements.',
    });
  }

  if (stats.has_atmos > 0) {
    insights.push({
      title: `${stats.has_atmos} songs have Dolby Atmos mixes`,
      highlight: `Spatial audio catalog positioned for premium placements`,
      explanation: 'Atmos-ready tracks qualify for premium playlist placements on Apple Music.',
    });
  }

  if (stats.total_streams > 100_000) {
    const avgStreams = Math.round(stats.total_streams / Math.max(stats.total_songs, 1));
    insights.push({
      title: `${formatNumber(stats.total_streams)} total catalog streams`,
      highlight: `${formatNumber(avgStreams)} average streams per song`,
      explanation: 'Catalog is generating meaningful streaming activity.',
    });
  }

  const topGenres = Object.entries(stats.genre_distribution).sort((a, b) => b[1] - a[1]);
  if (topGenres.length >= 2) {
    insights.push({
      title: `${topGenres.length} genres across the catalog`,
      highlight: `Led by ${topGenres[0][0]} (${topGenres[0][1]} songs) and ${topGenres[1][0]} (${topGenres[1][1]} songs)`,
      explanation: 'Genre diversity opens up more playlist and licensing opportunities.',
    });
  }

  return insights.slice(0, 4);
}

function generateOpportunityInsights(stats: CatalogStats): InsightCard[] {
  const insights: InsightCard[] = [];

  const notSyncReady = stats.total_songs - stats.sync_ready;
  if (notSyncReady > 0 && stats.sync_ready > 0) {
    insights.push({
      title: `${notSyncReady} songs could be made sync-ready`,
      highlight: `Only ${Math.round((stats.sync_ready / stats.total_songs) * 100)}% of catalog is sync-available`,
      explanation: 'Review these songs for sync clearance to expand licensing potential.',
    });
  }

  const withoutStems = stats.total_songs - stats.has_stems;
  if (withoutStems > 0 && stats.has_stems > 0) {
    insights.push({
      title: `${withoutStems} songs are missing stems`,
      highlight: `Stems complete for ${stats.has_stems} of ${stats.total_songs} songs`,
      explanation: 'Complete stem packages make songs more attractive for sync and remix opportunities.',
    });
  }

  const withoutAtmos = stats.total_songs - stats.has_atmos;
  if (withoutAtmos > 0 && stats.has_atmos > 0) {
    insights.push({
      title: `${withoutAtmos} songs could get Atmos mixes`,
      highlight: `Currently ${stats.has_atmos} of ${stats.total_songs} songs have spatial audio`,
      explanation: 'Atmos mixes unlock premium Apple Music placements and higher per-stream rates.',
    });
  }

  if (stats.unreleased > 0) {
    insights.push({
      title: `${stats.unreleased} unreleased songs in the catalog`,
      highlight: `Potential new releases waiting to be scheduled`,
      explanation: 'Review unreleased tracks for release readiness and strategic timing.',
    });
  }

  if (stats.in_progress > 0) {
    insights.push({
      title: `${stats.in_progress} songs currently in progress`,
      highlight: `Active pipeline of upcoming material`,
      explanation: 'Keep momentum by moving these toward completion.',
    });
  }

  return insights.slice(0, 4);
}

function generateRiskInsights(stats: CatalogStats): InsightCard[] {
  const insights: InsightCard[] = [];

  // Stream concentration risk
  if (stats.total_songs > 3 && stats.total_streams > 0) {
    const artists = Object.entries(stats.artist_distribution);
    if (artists.length === 1) {
      insights.push({
        title: 'All streams under a single artist',
        highlight: `${artists[0][0]}: ${stats.total_songs} songs, ${formatNumber(stats.total_streams)} streams`,
        explanation: 'Consider building catalog under additional artist names for diversification.',
      });
    }
  }

  // Low sync readiness
  const syncPct = stats.total_songs > 0 ? Math.round((stats.sync_ready / stats.total_songs) * 100) : 0;
  if (syncPct < 30 && stats.total_songs > 0) {
    insights.push({
      title: `Only ${syncPct}% of catalog is sync-ready`,
      highlight: `${stats.sync_ready} of ${stats.total_songs} songs available for licensing`,
      explanation: 'Low sync availability limits revenue from film, TV, and ad placements.',
    });
  }

  // No stems
  if (stats.has_stems === 0 && stats.total_songs > 0) {
    insights.push({
      title: 'No songs have stems complete',
      highlight: 'Stems are required for most sync placements',
      explanation: 'Prioritize creating stem packages for your highest-streaming songs.',
    });
  }

  // Low release rate
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;
  if (releasedPct < 50 && stats.total_songs > 3) {
    insights.push({
      title: `${100 - releasedPct}% of catalog is unreleased`,
      highlight: `${stats.unreleased + stats.in_progress} songs not yet available to listeners`,
      explanation: 'Unreleased catalog generates zero streams. Review for release readiness.',
    });
  }

  // No Atmos at all
  if (stats.has_atmos === 0 && stats.total_songs > 0) {
    insights.push({
      title: 'No Dolby Atmos mixes in catalog',
      highlight: 'Missing spatial audio format entirely',
      explanation: 'Apple Music features Atmos tracks prominently. Consider mixing your top songs.',
    });
  }

  return insights.slice(0, 4);
}

function InsightSection({ title, color, cards }: { title: string; color: string; cards: InsightCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color }}>{title}</h3>
      <div className="space-y-3">
        {cards.map((card, i) => (
          <div key={i} className="flex gap-3 rounded-lg bg-gray-900/50 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{card.title}</p>
              <p className="mt-0.5 text-xs font-medium" style={{ color }}>{card.highlight}</p>
              <p className="mt-0.5 text-xs text-gray-400">{card.explanation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data source placeholder for future integrations
// ---------------------------------------------------------------------------

interface DataSource {
  name: string;
  description: string;
  status: 'connected' | 'not_connected';
}

const DATA_SOURCES: DataSource[] = [
  { name: 'Notion Catalog', description: 'Song metadata, registrations, collaborators, contracts', status: 'connected' },
  { name: 'Notion Royalties', description: 'Revenue tracking by source and period', status: 'connected' },
  { name: 'Spotify for Artists', description: 'Streams, listeners, playlist placements, demographics', status: 'not_connected' },
  { name: 'Instagram Insights', description: 'Engagement rates, reach, content performance', status: 'not_connected' },
  { name: 'YouTube Analytics', description: 'Views, watch time, subscriber growth', status: 'not_connected' },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

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
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-800/50" />)}
        </div>
      </div>
    );
  }

  const scores = computeCatalogScores(stats);

  const scoreCategories = [
    { name: 'Catalog Size', score: scores.size, weight: '20%' },
    { name: 'Streaming', score: scores.streaming, weight: '25%' },
    { name: 'Diversity', score: scores.diversity, weight: '15%' },
    { name: 'Sync Readiness', score: scores.sync_readiness, weight: '25%' },
    { name: 'Production', score: scores.production, weight: '15%' },
  ];

  // Generate dynamic insights from real data
  const workingInsights = generateWorkingInsights(stats);
  const opportunityInsights = generateOpportunityInsights(stats);
  const riskInsights = generateRiskInsights(stats);

  // Derive catalog metrics from stats
  const topGenres = Object.entries(stats.genre_distribution).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMoods = Object.entries(stats.mood_distribution).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const syncPct = stats.total_songs > 0 ? Math.round((stats.sync_ready / stats.total_songs) * 100) : 0;
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;
  const atmosPct = stats.total_songs > 0 ? Math.round((stats.has_atmos / stats.total_songs) * 100) : 0;
  const avgStreams = stats.total_songs > 0 ? Math.round(stats.total_streams / stats.total_songs) : 0;

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build real key metrics from catalog data
  const catalogMetrics = [
    { label: 'Total Songs', value: stats.total_songs.toString(), subMetric: `${stats.released} released, ${stats.unreleased} unreleased`, color: '#1DB954' },
    { label: 'Total Streams', value: formatNumber(stats.total_streams), subMetric: `${formatNumber(avgStreams)} avg per song`, color: stats.total_streams > 100_000 ? '#1DB954' : '#FFC107' },
    { label: 'Est. Revenue', value: formatCurrency(stats.total_estimated_revenue), subMetric: 'based on stream estimates', color: '#2196F3' },
    { label: 'Sync Ready', value: `${syncPct}%`, subMetric: `${stats.sync_ready} of ${stats.total_songs} songs`, color: syncPct >= 50 ? '#1DB954' : syncPct >= 25 ? '#FFC107' : '#F44336' },
    { label: 'Stems Complete', value: stats.has_stems.toString(), subMetric: `of ${stats.total_songs} songs`, color: stats.has_stems > 0 ? '#1DB954' : '#F44336' },
    { label: 'Atmos Mixes', value: `${atmosPct}%`, subMetric: `${stats.has_atmos} songs`, color: stats.has_atmos > 0 ? '#1DB954' : '#8b949e' },
    { label: 'Genres', value: Object.keys(stats.genre_distribution).length.toString(), subMetric: topGenres.length > 0 ? `led by ${topGenres[0][0]}` : 'no genre data', color: '#9333ea' },
    { label: 'Avg BPM', value: stats.avg_bpm ? stats.avg_bpm.toString() : '--', subMetric: stats.avg_bpm ? 'catalog average' : 'no BPM data', color: stats.avg_bpm ? '#2196F3' : '#8b949e' },
    { label: 'Albums/EPs', value: stats.total_albums.toString(), subMetric: stats.total_albums > 0 ? 'in catalog' : 'no album groupings', color: stats.total_albums > 0 ? '#1DB954' : '#8b949e' },
  ];

  return (
    <div>
      <PageHeader title="AI Insights" />

      {/* Catalog Health Score Hero */}
      <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Health Score</h3>
          <span className="text-xs text-gray-500">{monthYear}</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-5xl font-bold" style={{ color: scoreColor(scores.composite) }}>{scores.composite}</span>
          <div className="flex-1">
            <div className="h-3 rounded-full bg-gray-700">
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${scores.composite}%`, backgroundColor: scoreColor(scores.composite) }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{scoreLabel(scores.composite)} — computed from live catalog data</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {scoreCategories.map(cat => (
            <div
              key={cat.name}
              className="flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ backgroundColor: `${scoreColor(cat.score)}12` }}
            >
              <span className="text-xs text-gray-300">{cat.name}</span>
              <span className="text-xs font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog Shape (Radar) + Score Breakdown */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Shape</h3>
          <div className="flex justify-center">
            <RadarChart scores={scores} />
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-[#1DB954]" /> Current</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded border border-gray-500 border-dashed" /> Target</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Score Breakdown</h3>
          <div className="space-y-4">
            {scoreCategories.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                    <span className="text-xs text-gray-500">{scoreLabel(cat.score)}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-700">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${cat.score}%`, backgroundColor: scoreColor(cat.score) }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{cat.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Insights */}
      <div className="mt-6 space-y-4">
        <InsightSection title="What's Working" color="#1DB954" cards={workingInsights} />
        <InsightSection title="Opportunities" color="#FFC107" cards={opportunityInsights} />
        <InsightSection title="Risks & Gaps" color="#F44336" cards={riskInsights} />
      </div>

      {/* Key Metrics Grid — all from real data */}
      <div className="mt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Key Metrics</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogMetrics.map((metric, i) => (
            <div key={i} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
              <span className="text-xs text-gray-400">{metric.label}</span>
              <p className="mt-2 text-2xl font-bold" style={{ color: metric.color }}>{metric.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{metric.subMetric}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog Intelligence (live from API) */}
      <div className="mt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Intelligence</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Catalog Summary */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-400">Catalog Summary</h4>
            <div className="space-y-3 text-sm">
              <p className="text-gray-300">Your catalog has <span className="font-semibold text-white">{stats.total_songs} songs</span> with <span className="font-semibold text-white">{formatNumber(stats.total_streams)} total streams</span>.</p>
              <p className="text-gray-300"><span className="font-semibold text-green-400">{releasedPct}%</span> of your catalog is released ({stats.released} songs).</p>
              {stats.in_progress > 0 && <p className="text-gray-300"><span className="font-semibold text-orange-400">{stats.in_progress} songs</span> currently in progress.</p>}
            </div>
          </div>

          {/* Top Genres */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-400">Top Genres</h4>
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
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-400">Top Moods</h4>
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
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-400">Sync Readiness</h4>
            <div className="space-y-3 text-sm">
              <p className="text-gray-300"><span className="font-semibold text-white">{syncPct}%</span> of your catalog is sync-ready ({stats.sync_ready} songs).</p>
              <p className="text-gray-300"><span className="font-semibold text-white">{stats.has_stems}</span> songs have stems complete.</p>
              <p className="text-gray-300"><span className="font-semibold text-white">{atmosPct}%</span> have Atmos mixes ({stats.has_atmos} songs).</p>
            </div>
          </div>

          {/* Key Distribution */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">Key Distribution</h4>
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

          {/* BPM Analysis */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-400">BPM Analysis</h4>
            <div className="text-sm text-gray-300">
              {stats.avg_bpm ? (
                <p>Average BPM across your catalog is <span className="font-semibold text-white">{stats.avg_bpm}</span>.</p>
              ) : (
                <p className="text-gray-500">No BPM data available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="mt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Data Sources</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_SOURCES.map((source) => (
            <div key={source.name} className={`rounded-xl border p-4 ${
              source.status === 'connected'
                ? 'border-green-800/50 bg-green-950/20'
                : 'border-gray-700/50 bg-gray-800/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{source.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  source.status === 'connected'
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-gray-700/50 text-gray-500'
                }`}>
                  {source.status === 'connected' ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{source.description}</p>
              {source.status === 'not_connected' && (
                <p className="mt-2 text-xs text-gray-600">Connect to unlock additional insights</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-800 py-4 text-center text-xs text-gray-600">
        All metrics computed from live Notion catalog data &middot; {monthYear}
      </div>
    </div>
  );
}
