'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_OPTIONS } from '@/config/notion';
import type { CatalogStats } from '@/lib/types';
import { useIntakeData } from '@/lib/hooks/useIntakeData';
import { INTAKE_CATEGORIES, INTAKE_QUESTIONS, getQuestionsByCategory, getCategoryQuestionCount, type IntakeQuestion } from '@/lib/data/intake-questions';
import { getAdjustedWeights, getAdjustedBenchmarks, generateIntakeInsights, type StrategyWeights, type BenchmarkOverrides } from '@/lib/utils/intake-scoring';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Score helpers
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

// ---------------------------------------------------------------------------
// Strategy Score — covers streaming, social, collaborations, funnel, catalog
// ---------------------------------------------------------------------------

interface StrategyScores {
  streaming: number;
  social: number;
  collaborations: number;
  funnel: number;
  catalog: number;
  composite: number;
}

function computeStrategyScores(
  stats: CatalogStats,
  weights?: StrategyWeights,
  benchmarks?: BenchmarkOverrides,
): StrategyScores {
  const w = weights ?? { streaming: 0.30, social: 0.25, collaborations: 0.20, funnel: 0.15, catalog: 0.10 };
  const b = benchmarks ?? { monthlyListenerBenchmark: 50_000, totalSongsBenchmark: 75, syncReadinessBenchmark: 50 };

  // Streaming: uses catalog data + known platform data
  const monthlyListeners = 15200;
  const playlistReach = 1_720_000;
  const currentPlaylists = 75;
  const avgPopularity = stats.total_songs > 0
    ? Math.round(Object.values(stats.genre_distribution).reduce((a, b2) => a + b2, 0) / stats.total_songs * 33)
    : 33;
  const streaming = (
    0.30 * norm(monthlyListeners, b.monthlyListenerBenchmark) +
    0.25 * norm(playlistReach, 2_000_000) +
    0.25 * norm(currentPlaylists, 75) +
    0.20 * norm(avgPopularity, 33)
  );

  // Social: from last IG audit
  const engagementRate = 0.021;
  const reelPerformance = 80;
  const reachPct = 0.15;
  const yoyTrend = 35;
  const social = (
    0.35 * norm(engagementRate, 0.05) +
    0.25 * reelPerformance +
    0.20 * norm(reachPct, 0.35) +
    0.20 * yoyTrend
  );

  // Collaborations
  const collabMultiplier = 2.2;
  const musicCollabQuality = 95;
  const collabRate = 0.15;
  const ontoutUtil = 3;
  const collaborations = (
    0.35 * norm(collabMultiplier, 3.0) +
    0.25 * musicCollabQuality +
    0.25 * norm(collabRate, 0.25) +
    0.15 * norm(ontoutUtil, 12)
  );

  // Funnel
  const linkCtr = 0.005;
  const profileVisitRate = 0.02;
  const funnel = (
    0.70 * norm(linkCtr, 0.03) +
    0.30 * norm(profileVisitRate, 0.08)
  );

  // Catalog: uses live data
  const totalSongs = stats.total_songs;
  const genreCount = Object.keys(stats.genre_distribution).length;
  const avgStreams = totalSongs > 0 ? stats.total_streams / totalSongs : 0;
  const catalog = (
    0.40 * norm(totalSongs, b.totalSongsBenchmark) +
    0.30 * norm(genreCount, 10) +
    0.30 * norm(avgStreams, 200_000)
  );

  const composite = Math.round(
    streaming * w.streaming +
    social * w.social +
    collaborations * w.collaborations +
    funnel * w.funnel +
    catalog * w.catalog
  );

  return {
    streaming: Math.round(streaming),
    social: Math.round(social),
    collaborations: Math.round(collaborations),
    funnel: Math.round(funnel),
    catalog: Math.round(catalog),
    composite,
  };
}

// ---------------------------------------------------------------------------
// Catalog Health Score — computed from live catalog data
// ---------------------------------------------------------------------------

interface CatalogScores {
  size: number;
  streaming: number;
  diversity: number;
  sync_readiness: number;
  production: number;
  composite: number;
}

function computeCatalogScores(stats: CatalogStats, benchmarks?: BenchmarkOverrides): CatalogScores {
  const b = benchmarks ?? { monthlyListenerBenchmark: 50_000, totalSongsBenchmark: 75, syncReadinessBenchmark: 50 };

  const releasedPct = stats.total_songs > 0 ? stats.released / stats.total_songs : 0;
  const size = (0.50 * norm(stats.total_songs, b.totalSongsBenchmark) + 0.50 * norm(releasedPct * 100, 80));

  const avgStreams = stats.total_songs > 0 ? stats.total_streams / stats.total_songs : 0;
  const streaming = (0.50 * norm(stats.total_streams, 5_000_000) + 0.50 * norm(avgStreams, 200_000));

  const genreCount = Object.keys(stats.genre_distribution).length;
  const moodCount = Object.keys(stats.mood_distribution).length;
  const artistCount = Object.keys(stats.artist_distribution).length;
  const diversity = (0.40 * norm(genreCount, 10) + 0.30 * norm(moodCount, 10) + 0.30 * norm(artistCount, 5));

  const syncPct = stats.total_songs > 0 ? stats.sync_ready / stats.total_songs : 0;
  const stemPct = stats.total_songs > 0 ? stats.has_stems / stats.total_songs : 0;
  const atmosPct = stats.total_songs > 0 ? stats.has_atmos / stats.total_songs : 0;
  const sync_readiness = (0.40 * norm(syncPct * 100, b.syncReadinessBenchmark) + 0.35 * norm(stemPct * 100, 50) + 0.25 * norm(atmosPct * 100, 30));

  const albumCount = stats.total_albums;
  const production = (
    0.35 * norm(stats.has_atmos, Math.max(stats.total_songs * 0.3, 1)) +
    0.35 * norm(stats.has_stems, Math.max(stats.total_songs * 0.5, 1)) +
    0.30 * norm(albumCount, 5)
  );

  const composite = Math.round(
    size * 0.20 + streaming * 0.25 + diversity * 0.15 + sync_readiness * 0.25 + production * 0.15
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
// SVG Radar Chart — generic for any 5-axis score
// ---------------------------------------------------------------------------

function RadarChart({ categories, targets }: { categories: { label: string; value: number }[]; targets: number[] }) {
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
          fill="none" stroke="#374151" strokeWidth={0.5}
        />
      ))}
      {categories.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#374151" strokeWidth={0.5} />;
      })}
      <polygon points={polygon(targets)} fill="none" stroke="#6b7280" strokeWidth={1} strokeDasharray="4,4" />
      <polygon points={polygon(categories.map(c => c.value))} fill="rgba(29,185,84,0.15)" stroke="#1DB954" strokeWidth={2} />
      {categories.map((c, i) => {
        const [x, y] = point(i, c.value);
        return <circle key={i} cx={x} cy={y} r={4} fill="#1DB954" />;
      })}
      {categories.map((c, i) => {
        const [x, y] = point(i, 115);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-[10px]">
            {c.label}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Insight Cards
// ---------------------------------------------------------------------------

interface InsightCard {
  icon?: string;
  title: string;
  highlight: string;
  explanation: string;
}

// --- Strategic insights (from manual audit data) ---
const STRATEGIC_WORKING: InsightCard[] = [
  { icon: '\uD83C\uDFC6', title: "Your Love's Not Wasted is a breakout hit", highlight: '1.9M streams \u00B7 5x the next closest song \u00B7 Pop: 56', explanation: 'Driving the majority of catalog discovery.' },
  { icon: '\uD83C\uDFAC', title: 'Video/Reels dominate IG engagement', highlight: '202 avg likes/post \u00B7 3.2x photos \u00B7 51.3% of interactions', explanation: 'Every music release post that hit 500+ likes was a Reel.' },
  { icon: '\uD83D\uDCCB', title: 'Currently playlisted songs have momentum', highlight: 'Delicate, Brick by Brick, Late Night \u00B7 Reach: 1,720,000', explanation: 'Being pushed by the algorithm \u2014 lean in.' },
  { icon: '\uD83E\uDD1D', title: 'Collaborations are a cheat code', highlight: '261 avg likes (2.2x solo) \u00B7 @ontout: 13x \u00B7 Allen Blickle: 6 tracks, 2.29M streams', explanation: 'Collab content consistently outperforms solo content.' },
];

const STRATEGIC_OPPORTUNITIES: InsightCard[] = [
  { icon: '\uD83D\uDC8E', title: 'Enjune catalog is underleveraged', highlight: '10.2M Enjune streams disconnected from 15K Jakke listeners', explanation: 'Cross-promote Enjune catalog for quick streaming gains.' },
  { icon: '\uD83D\uDCC8', title: 'Brick by Brick + Late Night rising', highlight: 'Both currently playlisted with recent momentum', explanation: 'Pitch to more playlists while scores are climbing.' },
  { icon: '\uD83C\uDFAF', title: '@ontout is massively under-leveraged', highlight: 'Only 3 posts despite 1,570 avg likes each \u00B7 13x multiplier sitting on the shelf', explanation: 'Even 2 sessions/quarter = 8 high-engagement posts/year.' },
  { icon: '\uD83D\uDCF8', title: 'Stories are 84.3% of IG views but underutilized', highlight: '43,641 views in 30 days \u00B7 Massive reach channel', explanation: 'Could be used for release teasers, behind-the-scenes, session clips.' },
];

const STRATEGIC_RISKS: InsightCard[] = [
  { icon: '\uD83D\uDCC9', title: '2025 IG engagement dropped 55%', highlight: '2024 avg: 216 likes/post \u2192 2025: 98 likes/post \u00B7 Volume up, quality down', explanation: 'Algorithm changes, audience fatigue, or content mix shift.' },
  { icon: '\u23F3', title: 'YLNW streams are mostly legacy', highlight: '1.9M all-time but only 2,569 in recent 3-year window', explanation: 'Current velocity may be near-zero \u2014 focus on recent momentum songs.' },
  { icon: '\uD83D\uDD17', title: 'Link-in-bio conversion is broken', highlight: '5 link taps / 936 profile visits = 0.5% conversion', explanation: 'The funnel from IG \u2192 streaming/website is effectively non-functional.' },
  { icon: '\uD83D\uDCC9', title: 'Solo post engagement declining', highlight: 'Solo: 121 avg likes vs Collab: 261 \u00B7 Negative feedback loop', explanation: 'As the algorithm favors engagement, lower-performing solo posts get less reach.' },
];

// --- Dynamic insights generated from live catalog data ---
function generateWorkingInsights(stats: CatalogStats): InsightCard[] {
  const insights: InsightCard[] = [];
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;
  if (releasedPct >= 60) {
    insights.push({ title: `${releasedPct}% of catalog is released`, highlight: `${stats.released} of ${stats.total_songs} songs released`, explanation: 'Strong release rate keeps the catalog active and discoverable.' });
  }
  if (stats.sync_ready > 0) {
    const syncPct = Math.round((stats.sync_ready / stats.total_songs) * 100);
    insights.push({ title: `${stats.sync_ready} songs are sync-ready`, highlight: `${syncPct}% of catalog available for licensing`, explanation: 'These songs can be pitched for film, TV, and advertising placements.' });
  }
  if (stats.has_atmos > 0) {
    insights.push({ title: `${stats.has_atmos} songs have Dolby Atmos mixes`, highlight: 'Spatial audio catalog positioned for premium placements', explanation: 'Atmos-ready tracks qualify for premium playlist placements on Apple Music.' });
  }
  if (stats.total_streams > 100_000) {
    const avgStreams = Math.round(stats.total_streams / Math.max(stats.total_songs, 1));
    insights.push({ title: `${formatNumber(stats.total_streams)} total catalog streams`, highlight: `${formatNumber(avgStreams)} average streams per song`, explanation: 'Catalog is generating meaningful streaming activity.' });
  }
  return insights.slice(0, 4);
}

function generateOpportunityInsights(stats: CatalogStats): InsightCard[] {
  const insights: InsightCard[] = [];
  const notSyncReady = stats.total_songs - stats.sync_ready;
  if (notSyncReady > 0 && stats.sync_ready > 0) {
    insights.push({ title: `${notSyncReady} songs could be made sync-ready`, highlight: `Only ${Math.round((stats.sync_ready / stats.total_songs) * 100)}% of catalog is sync-available`, explanation: 'Review these songs for sync clearance to expand licensing potential.' });
  }
  const withoutStems = stats.total_songs - stats.has_stems;
  if (withoutStems > 0 && stats.has_stems > 0) {
    insights.push({ title: `${withoutStems} songs are missing stems`, highlight: `Stems complete for ${stats.has_stems} of ${stats.total_songs} songs`, explanation: 'Complete stem packages make songs more attractive for sync and remix opportunities.' });
  }
  if (stats.unreleased > 0) {
    insights.push({ title: `${stats.unreleased} unreleased songs in the catalog`, highlight: 'Potential new releases waiting to be scheduled', explanation: 'Review unreleased tracks for release readiness and strategic timing.' });
  }
  return insights.slice(0, 4);
}

function generateRiskInsights(stats: CatalogStats): InsightCard[] {
  const insights: InsightCard[] = [];
  const syncPct = stats.total_songs > 0 ? Math.round((stats.sync_ready / stats.total_songs) * 100) : 0;
  if (syncPct < 30 && stats.total_songs > 0) {
    insights.push({ title: `Only ${syncPct}% of catalog is sync-ready`, highlight: `${stats.sync_ready} of ${stats.total_songs} songs available for licensing`, explanation: 'Low sync availability limits revenue from film, TV, and ad placements.' });
  }
  if (stats.has_stems === 0 && stats.total_songs > 0) {
    insights.push({ title: 'No songs have stems complete', highlight: 'Stems are required for most sync placements', explanation: 'Prioritize creating stem packages for your highest-streaming songs.' });
  }
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;
  if (releasedPct < 50 && stats.total_songs > 3) {
    insights.push({ title: `${100 - releasedPct}% of catalog is unreleased`, highlight: `${stats.unreleased + stats.in_progress} songs not yet available to listeners`, explanation: 'Unreleased catalog generates zero streams. Review for release readiness.' });
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
            {card.icon && <span className="text-xl">{card.icon}</span>}
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
// Action Items
// ---------------------------------------------------------------------------

interface ActionItem {
  icon: string;
  title: string;
  effort: { label: string; value: number };
  impact: { label: string; value: number };
  dataPoint: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

const ACTION_ITEMS: ActionItem[] = [
  { icon: '\uD83C\uDFAF', title: 'Schedule 2+ @ontout sessions per quarter', effort: { label: 'Low', value: 1 }, impact: { label: 'Very High', value: 5 }, dataPoint: '13x engagement multiplier', priority: 'P0' },
  { icon: '\uD83C\uDFA5', title: 'Create release-day Reels for every drop', effort: { label: 'Medium', value: 2 }, impact: { label: 'Very High', value: 5 }, dataPoint: '3.2x engagement vs photos', priority: 'P0' },
  { icon: '\uD83C\uDFB5', title: 'Pitch Brick by Brick + Late Night to playlists', effort: { label: 'Medium', value: 2 }, impact: { label: 'High', value: 4 }, dataPoint: 'Currently playlisted w/ momentum', priority: 'P0' },
  { icon: '\uD83D\uDD04', title: 'Cross-promote Enjune on Jakke socials', effort: { label: 'Low', value: 1 }, impact: { label: 'High', value: 4 }, dataPoint: '10.2M Enjune streams untapped', priority: 'P1' },
  { icon: '\uD83D\uDD17', title: 'Fix link-in-bio (test Linktree/Stan Store)', effort: { label: 'Low', value: 1 }, impact: { label: 'High', value: 4 }, dataPoint: '0.5% CTR is critically low', priority: 'P1' },
  { icon: '\u23F0', title: 'Test posting schedule (Tu/Th 7pm vs current)', effort: { label: 'Low', value: 1 }, impact: { label: 'Medium', value: 3 }, dataPoint: '55% engagement drop in 2025', priority: 'P1' },
  { icon: '\uD83D\uDCC8', title: 'Increase collaboration ratio to 25%', effort: { label: 'Medium', value: 3 }, impact: { label: 'High', value: 4 }, dataPoint: '2.2x multiplier on collab posts', priority: 'P2' },
  { icon: '\uD83D\uDCF1', title: 'Use Stories for promo (84% of views)', effort: { label: 'Low', value: 1 }, impact: { label: 'Medium', value: 3 }, dataPoint: '43,641 Story views/month', priority: 'P2' },
  { icon: '\uD83D\uDD0D', title: 'Diagnose 2025 engagement drop', effort: { label: 'High', value: 4 }, impact: { label: 'Medium', value: 3 }, dataPoint: '216 \u2192 98 avg likes YoY', priority: 'P3' },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  P0: { label: 'DO NOW', color: '#F44336', bg: 'bg-red-950/30 border-red-800/50' },
  P1: { label: 'DO NEXT', color: '#FFC107', bg: 'bg-yellow-950/30 border-yellow-800/50' },
  P2: { label: 'EXPERIMENT', color: '#2196F3', bg: 'bg-blue-950/30 border-blue-800/50' },
  P3: { label: 'INVESTIGATE', color: '#8b949e', bg: 'bg-gray-800/50 border-gray-700/50' },
};

// ---------------------------------------------------------------------------
// Effort/Impact Matrix (SVG)
// ---------------------------------------------------------------------------

function EffortImpactMatrix({ items }: { items: ActionItem[] }) {
  const w = 400, h = 300;
  const pad = { left: 40, right: 20, top: 20, bottom: 35 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;

  function x(effort: number) { return pad.left + ((effort - 0.5) / 5) * pw; }
  function y(impact: number) { return pad.top + ph - ((impact - 0.5) / 5) * ph; }

  const midX = x(2.5);
  const midY = y(3);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[500px]">
      <rect x={pad.left} y={pad.top} width={midX - pad.left} height={midY - pad.top} fill="rgba(29,185,84,0.05)" />
      <rect x={midX} y={pad.top} width={w - pad.right - midX} height={midY - pad.top} fill="rgba(33,150,243,0.05)" />
      <rect x={pad.left} y={midY} width={midX - pad.left} height={h - pad.bottom - midY} fill="rgba(139,148,158,0.05)" />
      <rect x={midX} y={midY} width={w - pad.right - midX} height={h - pad.bottom - midY} fill="rgba(255,152,0,0.05)" />
      <line x1={midX} y1={pad.top} x2={midX} y2={h - pad.bottom} stroke="#4b5563" strokeWidth={1} strokeDasharray="4,4" />
      <line x1={pad.left} y1={midY} x2={w - pad.right} y2={midY} stroke="#4b5563" strokeWidth={1} strokeDasharray="4,4" />
      <text x={pad.left + 6} y={pad.top + 16} className="fill-green-500/60 text-[9px] font-semibold">QUICK WINS</text>
      <text x={w - pad.right - 6} y={pad.top + 16} textAnchor="end" className="fill-blue-500/60 text-[9px] font-semibold">BIG BETS</text>
      <text x={pad.left + 6} y={h - pad.bottom - 6} className="fill-gray-500/60 text-[9px] font-semibold">LOW PRIORITY</text>
      <text x={w - pad.right - 6} y={h - pad.bottom - 6} textAnchor="end" className="fill-orange-500/60 text-[9px] font-semibold">RESOURCE HEAVY</text>
      <text x={w / 2} y={h - 4} textAnchor="middle" className="fill-gray-500 text-[10px]">Effort</text>
      <text x={10} y={h / 2} textAnchor="middle" transform={`rotate(-90, 10, ${h / 2})`} className="fill-gray-500 text-[10px]">Impact</text>
      {items.map((item, i) => {
        const color = PRIORITY_CONFIG[item.priority].color;
        return (
          <g key={i}>
            <circle cx={x(item.effort.value)} cy={y(item.impact.value)} r={11} fill={color} opacity={0.8} />
            <text x={x(item.effort.value)} y={y(item.impact.value) + 1} textAnchor="middle" dominantBaseline="middle" className="text-[10px]">{item.icon}</text>
          </g>
        );
      })}
      <rect x={pad.left} y={pad.top} width={pw} height={ph} fill="none" stroke="#374151" strokeWidth={1} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Key Metrics (social + platform)
// ---------------------------------------------------------------------------

interface KeyMetric {
  icon: string;
  label: string;
  value: string;
  subMetric: string;
  color: string;
}

const SOCIAL_METRICS: KeyMetric[] = [
  { icon: '\uD83D\uDCCA', label: 'IG Engagement Rate', value: '2.1%', subMetric: '\u25BC from 3.8% (2024)', color: '#F44336' },
  { icon: '\uD83C\uDFA5', label: 'Reel vs Photo', value: '3.2x', subMetric: 'Reels win (202 vs 64 avg)', color: '#1DB954' },
  { icon: '\uD83D\uDD17', label: 'Link-in-Bio CTR', value: '0.5%', subMetric: '\u25BC critically low', color: '#F44336' },
  { icon: '\uD83E\uDD1D', label: 'Collab Multiplier', value: '2.2x', subMetric: 'vs solo posts', color: '#FFC107' },
  { icon: '\uD83C\uDFAF', label: '@ontout Multiplier', value: '13x', subMetric: '3 posts only', color: '#1DB954' },
  { icon: '\uD83C\uDFB5', label: 'Playlist Reach', value: '1.72M', subMetric: '75 playlists', color: '#1DB954' },
  { icon: '\uD83D\uDCF1', label: 'Story % of IG Views', value: '84.3%', subMetric: 'mostly untapped', color: '#FFC107' },
  { icon: '\uD83C\uDFA7', label: 'Enjune Streams', value: '10.2M', subMetric: '145K listeners', color: '#2196F3' },
  { icon: '\u2B50', label: 'Avg Popularity Score', value: '35/100', subMetric: 'catalog average', color: '#8b949e' },
];

// ---------------------------------------------------------------------------
// Data Sources
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
// Tab config
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Strategy', 'Catalog', 'Actions', 'Artist DNA'] as const;
type TabKey = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AIInsightsPage() {
  const { artist, setArtist } = useArtistContext();
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Intake data hook — per artist
  const intakeArtistName = artist !== 'all' ? artist : '';
  const { answers: intakeAnswers, saveAnswer, completionPct, answeredCount, totalQuestions, lastUpdated, mounted: intakeMounted, clearAll: clearIntake } = useIntakeData(intakeArtistName);

  // Compute adjusted weights/benchmarks from intake data
  const hasIntakeData = Object.keys(intakeAnswers).length > 0;
  const adjustedWeights = hasIntakeData ? getAdjustedWeights(intakeAnswers) : undefined;
  const adjustedBenchmarks = hasIntakeData ? getAdjustedBenchmarks(intakeAnswers) : undefined;

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

  const strategyScores = computeStrategyScores(stats, adjustedWeights, adjustedBenchmarks);
  const catalogScores = computeCatalogScores(stats, adjustedBenchmarks);

  const wt = adjustedWeights ?? { streaming: 0.30, social: 0.25, collaborations: 0.20, funnel: 0.15, catalog: 0.10 };
  const strategyCats = [
    { icon: '\uD83C\uDFB5', name: 'Streaming', score: strategyScores.streaming, weight: `${Math.round(wt.streaming * 100)}%` },
    { icon: '\uD83D\uDCF1', name: 'Social', score: strategyScores.social, weight: `${Math.round(wt.social * 100)}%` },
    { icon: '\uD83E\uDD1D', name: 'Collaborations', score: strategyScores.collaborations, weight: `${Math.round(wt.collaborations * 100)}%` },
    { icon: '\uD83D\uDD17', name: 'Funnel', score: strategyScores.funnel, weight: `${Math.round(wt.funnel * 100)}%` },
    { icon: '\uD83D\uDCBF', name: 'Catalog', score: strategyScores.catalog, weight: `${Math.round(wt.catalog * 100)}%` },
  ];

  const catalogCats = [
    { name: 'Catalog Size', score: catalogScores.size, weight: '20%' },
    { name: 'Streaming', score: catalogScores.streaming, weight: '25%' },
    { name: 'Diversity', score: catalogScores.diversity, weight: '15%' },
    { name: 'Sync Readiness', score: catalogScores.sync_readiness, weight: '25%' },
    { name: 'Production', score: catalogScores.production, weight: '15%' },
  ];

  const topP0 = ACTION_ITEMS.find(a => a.priority === 'P0')!;

  // Group action items by priority
  const actionsByPriority: Record<string, ActionItem[]> = {};
  for (const item of ACTION_ITEMS) {
    if (!actionsByPriority[item.priority]) actionsByPriority[item.priority] = [];
    actionsByPriority[item.priority].push(item);
  }

  // Live catalog data
  const workingInsights = generateWorkingInsights(stats);
  const opportunityInsights = generateOpportunityInsights(stats);
  const riskInsights = generateRiskInsights(stats);
  const intakeInsights = hasIntakeData ? generateIntakeInsights(intakeAnswers, stats) : [];

  const topGenres = Object.entries(stats.genre_distribution).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMoods = Object.entries(stats.mood_distribution).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const syncPct = stats.total_songs > 0 ? Math.round((stats.sync_ready / stats.total_songs) * 100) : 0;
  const releasedPct = stats.total_songs > 0 ? Math.round((stats.released / stats.total_songs) * 100) : 0;
  const atmosPct = stats.total_songs > 0 ? Math.round((stats.has_atmos / stats.total_songs) * 100) : 0;
  const avgStreams = stats.total_songs > 0 ? Math.round(stats.total_streams / stats.total_songs) : 0;

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const catalogMetrics = [
    { label: 'Total Songs', value: stats.total_songs.toString(), subMetric: `${stats.released} released, ${stats.unreleased} unreleased`, color: '#1DB954' },
    { label: 'Total Streams', value: formatNumber(stats.total_streams), subMetric: `${formatNumber(avgStreams)} avg per song`, color: stats.total_streams > 100_000 ? '#1DB954' : '#FFC107' },
    { label: 'Est. Revenue', value: formatCurrency(stats.total_estimated_revenue), subMetric: 'based on stream estimates', color: '#2196F3' },
    { label: 'Sync Ready', value: `${syncPct}%`, subMetric: `${stats.sync_ready} of ${stats.total_songs} songs`, color: syncPct >= 50 ? '#1DB954' : syncPct >= 25 ? '#FFC107' : '#F44336' },
    { label: 'Stems Complete', value: stats.has_stems.toString(), subMetric: `of ${stats.total_songs} songs`, color: stats.has_stems > 0 ? '#1DB954' : '#F44336' },
    { label: 'Atmos Mixes', value: `${atmosPct}%`, subMetric: `${stats.has_atmos} songs`, color: stats.has_atmos > 0 ? '#1DB954' : '#8b949e' },
  ];

  return (
    <div>
      <PageHeader title="AI Insights" />

      {/* This Week's Focus — Hero Banner */}
      <div className="mt-4 rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #F4433622, #FFC10722)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">This Week&apos;s Focus</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="text-2xl">{topP0.icon}</span>
          <div>
            <p className="text-lg font-bold text-white">{topP0.title}</p>
            <p className="mt-1 text-sm text-gray-300">{topP0.dataPoint}</p>
            <div className="mt-2 flex gap-3 text-xs text-gray-400">
              <span>Effort: {topP0.effort.label}</span>
              <span>Impact: {topP0.impact.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Score Heroes */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Strategy Score */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Strategy Score</h3>
            <span className="text-xs text-gray-500">{monthYear}</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-4xl font-bold" style={{ color: scoreColor(strategyScores.composite) }}>{strategyScores.composite}</span>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-gray-700">
                <div className="h-3 rounded-full transition-all" style={{ width: `${strategyScores.composite}%`, backgroundColor: scoreColor(strategyScores.composite) }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{scoreLabel(strategyScores.composite)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strategyCats.map(cat => (
              <div key={cat.name} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `${scoreColor(cat.score)}12` }}>
                <span className="text-xs">{cat.icon}</span>
                <span className="text-[10px] text-gray-300">{cat.name}</span>
                <span className="text-[10px] font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Catalog Health Score */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Health</h3>
            <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-[10px] text-green-400">Live Data</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-4xl font-bold" style={{ color: scoreColor(catalogScores.composite) }}>{catalogScores.composite}</span>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-gray-700">
                <div className="h-3 rounded-full transition-all" style={{ width: `${catalogScores.composite}%`, backgroundColor: scoreColor(catalogScores.composite) }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{scoreLabel(catalogScores.composite)} — computed from live data</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {catalogCats.map(cat => (
              <div key={cat.name} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `${scoreColor(cat.score)}12` }}>
                <span className="text-[10px] text-gray-300">{cat.name}</span>
                <span className="text-[10px] font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-gray-800/50 p-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {/* Dual Radars */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Strategy Shape</h3>
                <div className="flex justify-center">
                  <RadarChart
                    categories={strategyCats.map(c => ({ label: c.name, value: c.score }))}
                    targets={[80, 70, 75, 60, 70]}
                  />
                </div>
                <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-[#1DB954]" /> Current</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded border border-gray-500 border-dashed" /> Target</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Shape</h3>
                <div className="flex justify-center">
                  <RadarChart
                    categories={catalogCats.map(c => ({ label: c.name, value: c.score }))}
                    targets={[70, 60, 65, 70, 60]}
                  />
                </div>
                <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-[#1DB954]" /> Current</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded border border-gray-500 border-dashed" /> Target</span>
                </div>
              </div>
            </div>

            {/* Score Breakdowns */}
            <div className="grid gap-4 md:grid-cols-2">
              <ScoreBreakdown title="Strategy Breakdown" categories={strategyCats} />
              <ScoreBreakdown title="Catalog Breakdown" categories={catalogCats.map(c => ({ ...c, icon: undefined }))} />
            </div>

            {/* Key Metrics: Social */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Platform Metrics</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SOCIAL_METRICS.map((metric, i) => (
                  <div key={i} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{metric.icon}</span>
                      <span className="text-xs text-gray-400">{metric.label}</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold" style={{ color: metric.color }}>{metric.value}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{metric.subMetric}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics: Catalog */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Metrics</h3>
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
          </div>
        )}

        {activeTab === 'Strategy' && (
          <div className="space-y-4">
            {intakeInsights.length > 0 && (
              <InsightSection title="From Artist DNA" color="#8B5CF6" cards={intakeInsights} />
            )}
            <InsightSection title="What's Working" color="#1DB954" cards={STRATEGIC_WORKING} />
            <InsightSection title="Opportunities" color="#FFC107" cards={STRATEGIC_OPPORTUNITIES} />
            <InsightSection title="Risks" color="#F44336" cards={STRATEGIC_RISKS} />
            {!hasIntakeData && artist !== 'all' && (
              <div className="rounded-lg border border-dashed border-gray-700 p-4 text-center">
                <p className="text-sm text-gray-400">Fill out the <button onClick={() => setActiveTab('Artist DNA')} className="font-medium text-purple-400 hover:text-purple-300 underline">Artist DNA</button> questionnaire to unlock personalized insights based on this artist&apos;s goals and direction.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Catalog' && (
          <div className="space-y-6">
            {/* Dynamic insights from live data */}
            <div className="space-y-4">
              <InsightSection title="What's Working" color="#1DB954" cards={workingInsights} />
              <InsightSection title="Opportunities" color="#FFC107" cards={opportunityInsights} />
              <InsightSection title="Risks & Gaps" color="#F44336" cards={riskInsights} />
            </div>

            {/* Catalog Intelligence */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Catalog Intelligence</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-400">Catalog Summary</h4>
                  <div className="space-y-3 text-sm">
                    <p className="text-gray-300">Your catalog has <span className="font-semibold text-white">{stats.total_songs} songs</span> with <span className="font-semibold text-white">{formatNumber(stats.total_streams)} total streams</span>.</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-400">{releasedPct}%</span> of your catalog is released ({stats.released} songs).</p>
                    {stats.in_progress > 0 && <p className="text-gray-300"><span className="font-semibold text-orange-400">{stats.in_progress} songs</span> currently in progress.</p>}
                  </div>
                </div>

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

                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-400">Sync Readiness</h4>
                  <div className="space-y-3 text-sm">
                    <p className="text-gray-300"><span className="font-semibold text-white">{syncPct}%</span> of your catalog is sync-ready ({stats.sync_ready} songs).</p>
                    <p className="text-gray-300"><span className="font-semibold text-white">{stats.has_stems}</span> songs have stems complete.</p>
                    <p className="text-gray-300"><span className="font-semibold text-white">{atmosPct}%</span> have Atmos mixes ({stats.has_atmos} songs).</p>
                  </div>
                </div>

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
          </div>
        )}

        {activeTab === 'Actions' && (
          <div className="space-y-6">
            {/* Action Items */}
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Action Items</h3>
              <div className="space-y-4">
                {(['P0', 'P1', 'P2', 'P3'] as const).map(priority => {
                  const items = actionsByPriority[priority];
                  if (!items || items.length === 0) return null;
                  const config = PRIORITY_CONFIG[priority];
                  return (
                    <div key={priority}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: config.color }}>{priority}: {config.label}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className={`rounded-lg border p-3 ${config.bg}`}>
                            <div className="flex items-start gap-3">
                              <span className="text-lg">{item.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{item.title}</p>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                                  <span>Effort: {item.effort.label} ({item.effort.value}/5)</span>
                                  <span>Impact: {item.impact.label} ({item.impact.value}/5)</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Data: {item.dataPoint}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Effort/Impact Matrix */}
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Quick Wins vs Big Bets</h3>
              <div className="flex justify-center">
                <EffortImpactMatrix items={ACTION_ITEMS} />
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-gray-400">{key}: {config.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Artist DNA' && (
          <div className="space-y-6">
            {artist === 'all' ? (
              /* Prompt to select an artist */
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-8 text-center">
                <p className="text-3xl mb-3">🧬</p>
                <h3 className="text-lg font-bold text-white">Select an Artist to Build Their Profile</h3>
                <p className="mt-2 text-sm text-gray-400">Artist DNA questions are answered per artist. Choose one to get started.</p>
                <div className="mt-6 flex justify-center gap-3">
                  {ARTIST_OPTIONS.map(name => (
                    <button
                      key={name}
                      onClick={() => setArtist(name)}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-purple-500 hover:bg-purple-900/20"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Progress Section */}
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                  <div className="flex items-center gap-5">
                    {/* Progress Ring */}
                    <div className="relative shrink-0">
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#374151" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34" fill="none"
                          stroke="#8B5CF6" strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 34}`}
                          strokeDashoffset={`${2 * Math.PI * 34 * (1 - completionPct / 100)}`}
                          transform="rotate(-90 40 40)"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {intakeMounted ? `${completionPct}%` : '—'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">Artist DNA: {artist}</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Help the system learn about {artist}. Your answers shape scoring weights, surface relevant opportunities, and flag risks.
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {intakeMounted ? `${answeredCount} of ${totalQuestions} questions answered` : 'Loading...'}
                        {lastUpdated && ` · Last updated ${new Date(lastUpdated).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {hasIntakeData && (
                    <div className="mt-3 rounded-lg bg-purple-900/20 border border-purple-800/30 px-3 py-2 text-xs text-purple-300">
                      Scoring weights are personalized based on your answers. Strategy and Catalog scores reflect this artist&apos;s priorities.
                    </div>
                  )}
                </div>

                {/* Category Accordions */}
                {INTAKE_CATEGORIES.map(cat => {
                  const isOpen = openCategories.has(cat.id);
                  const questions = getQuestionsByCategory(cat.id);
                  const catAnswered = questions.filter(q => intakeAnswers[q.id]).length;
                  const catTotal = getCategoryQuestionCount(cat.id);

                  return (
                    <div key={cat.id} className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden">
                      <button
                        onClick={() => setOpenCategories(prev => {
                          const next = new Set(prev);
                          if (next.has(cat.id)) next.delete(cat.id);
                          else next.add(cat.id);
                          return next;
                        })}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-700/30"
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{cat.label}</p>
                          <p className="text-xs text-gray-500">{cat.description}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          catAnswered === catTotal
                            ? 'bg-green-900/40 text-green-400'
                            : catAnswered > 0
                              ? 'bg-purple-900/40 text-purple-400'
                              : 'bg-gray-700/50 text-gray-500'
                        }`}>
                          {catAnswered}/{catTotal}
                        </span>
                        <svg className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-700/50 px-5 py-4 space-y-4">
                          {questions.map(q => (
                            <IntakeQuestionCard
                              key={q.id}
                              question={q}
                              value={intakeAnswers[q.id]?.value}
                              onAnswer={(val) => saveAnswer(q.id, val)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Clear All */}
                {hasIntakeData && (
                  <div className="text-center">
                    <button
                      onClick={() => { if (confirm(`Clear all intake answers for ${artist}?`)) clearIntake(); }}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                    >
                      Clear all answers for {artist}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Data Sources (always visible) */}
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
        Strategy insights from manual audit + live catalog data &middot; {monthYear}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Breakdown (reusable)
// ---------------------------------------------------------------------------

function ScoreBreakdown({ title, categories }: { title: string; categories: { icon?: string; name: string; score: number; weight: string }[] }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat.name}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                <span className="text-sm text-gray-300">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                <span className="text-xs text-gray-500">{scoreLabel(cat.score)}</span>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-700">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${cat.score}%`, backgroundColor: scoreColor(cat.score) }} />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{cat.weight}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intake Question Card
// ---------------------------------------------------------------------------

function IntakeQuestionCard({ question, value, onAnswer }: {
  question: IntakeQuestion;
  value: string | string[] | number | undefined;
  onAnswer: (val: string | string[] | number) => void;
}) {
  const isAnswered = value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);

  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      isAnswered ? 'border-purple-800/40 bg-purple-900/10' : 'border-gray-700/50 bg-gray-900/30'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <label className="text-sm font-medium text-white">{question.label}</label>
        {isAnswered && (
          <svg className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {question.helpText && (
        <p className="mt-1 text-xs text-gray-500">{question.helpText}</p>
      )}
      <div className="mt-3">
        {question.type === 'single-select' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map(opt => (
              <button
                key={opt}
                onClick={() => onAnswer(opt)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  value === opt
                    ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === 'multi-select' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map(opt => {
              const selected = Array.isArray(value) && value.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    const next = selected ? current.filter(v => v !== opt) : [...current, opt];
                    onAnswer(next);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    selected
                      ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {selected && <span className="mr-1">&#10003;</span>}
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'scale' && (
          <div>
            <div className="flex items-center gap-2">
              {Array.from({ length: (question.scaleMax ?? 5) - (question.scaleMin ?? 1) + 1 }, (_, i) => {
                const scaleVal = (question.scaleMin ?? 1) + i;
                const isSelected = value === scaleVal;
                return (
                  <button
                    key={scaleVal}
                    onClick={() => onAnswer(scaleVal)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-600 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {scaleVal}
                  </button>
                );
              })}
            </div>
            {question.scaleLabels && (
              <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
                <span>{question.scaleLabels[0]}</span>
                <span>{question.scaleLabels[1]}</span>
              </div>
            )}
          </div>
        )}

        {question.type === 'text' && (
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder={question.placeholder}
            rows={2}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
          />
        )}
      </div>
    </div>
  );
}
