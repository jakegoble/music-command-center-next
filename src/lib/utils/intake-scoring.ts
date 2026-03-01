// ---------------------------------------------------------------------------
// Intake → Scoring Integration
// Adjusts strategy weights and benchmarks based on Artist DNA answers
// ---------------------------------------------------------------------------

import type { IntakeAnswer } from '@/lib/hooks/useIntakeData';
import type { CatalogStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// Weight adjustment
// ---------------------------------------------------------------------------

export interface StrategyWeights {
  streaming: number;
  social: number;
  collaborations: number;
  funnel: number;
  catalog: number;
}

const DEFAULT_WEIGHTS: StrategyWeights = {
  streaming: 0.30,
  social: 0.25,
  collaborations: 0.20,
  funnel: 0.15,
  catalog: 0.10,
};

export function getAdjustedWeights(
  answers: Record<string, IntakeAnswer>,
): StrategyWeights {
  const w = { ...DEFAULT_WEIGHTS };

  // Primary goal shifts emphasis
  const goal = answers['goals-primary']?.value as string | undefined;
  if (goal === 'Grow streaming numbers') {
    w.streaming += 0.10;
    w.catalog -= 0.05;
    w.funnel -= 0.05;
  } else if (goal === 'Land sync placements') {
    w.catalog += 0.15;
    w.streaming -= 0.10;
    w.funnel -= 0.05;
  } else if (goal === 'Grow social media following') {
    w.social += 0.10;
    w.streaming -= 0.05;
    w.catalog -= 0.05;
  } else if (goal === 'Generate more revenue') {
    w.catalog += 0.05;
    w.streaming += 0.05;
    w.collaborations -= 0.05;
    w.funnel -= 0.05;
  }

  // Streaming vs sync scale (1 = streaming, 5 = sync)
  const scale = answers['goals-streaming-vs-sync']?.value as number | undefined;
  if (typeof scale === 'number') {
    const shift = ((scale - 3) / 2) * 0.10; // -0.10 to +0.10
    w.streaming -= shift;
    w.catalog += shift;
  }

  // Collaboration openness (1–5) adjusts collab weight
  const collabOpen = answers['collab-openness']?.value as number | undefined;
  if (typeof collabOpen === 'number') {
    const delta = ((collabOpen - 3) / 2) * 0.05; // -0.05 to +0.05
    w.collaborations += delta;
    w.funnel -= delta;
  }

  // Normalize to sum = 1.0
  const sum = w.streaming + w.social + w.collaborations + w.funnel + w.catalog;
  if (sum > 0) {
    w.streaming /= sum;
    w.social /= sum;
    w.collaborations /= sum;
    w.funnel /= sum;
    w.catalog /= sum;
  }

  return w;
}

// ---------------------------------------------------------------------------
// Benchmark overrides
// ---------------------------------------------------------------------------

export interface BenchmarkOverrides {
  monthlyListenerBenchmark: number;
  totalSongsBenchmark: number;
  syncReadinessBenchmark: number;
}

const DEFAULT_BENCHMARKS: BenchmarkOverrides = {
  monthlyListenerBenchmark: 50_000,
  totalSongsBenchmark: 75,
  syncReadinessBenchmark: 50,
};

export function getAdjustedBenchmarks(
  answers: Record<string, IntakeAnswer>,
): BenchmarkOverrides {
  const b = { ...DEFAULT_BENCHMARKS };

  // Target monthly listeners → streaming benchmark
  const target = answers['goals-listener-target']?.value as string | undefined;
  if (target === 'Under 10K') b.monthlyListenerBenchmark = 10_000;
  else if (target === '10K–50K') b.monthlyListenerBenchmark = 50_000;
  else if (target === '50K–100K') b.monthlyListenerBenchmark = 100_000;
  else if (target === '100K–500K') b.monthlyListenerBenchmark = 500_000;
  else if (target === '500K+') b.monthlyListenerBenchmark = 1_000_000;

  // Release cadence → catalog size benchmark
  const cadence = answers['goals-release-cadence']?.value as string | undefined;
  if (cadence === 'Single every month') b.totalSongsBenchmark = 100;
  else if (cadence === 'Single every 6–8 weeks') b.totalSongsBenchmark = 75;
  else if (cadence === 'EP every quarter') b.totalSongsBenchmark = 60;
  else if (cadence === 'Album per year') b.totalSongsBenchmark = 50;

  // Sync pursuit level → sync readiness benchmark
  const syncPursuit = answers['revenue-sync-pursuit']?.value as string | undefined;
  if (syncPursuit === 'Yes, actively pitching') b.syncReadinessBenchmark = 70;
  else if (syncPursuit === 'Yes, but passively') b.syncReadinessBenchmark = 50;
  else if (syncPursuit === 'Interested but not started') b.syncReadinessBenchmark = 30;
  else if (syncPursuit === 'Not a priority') b.syncReadinessBenchmark = 20;

  return b;
}

// ---------------------------------------------------------------------------
// Intake-derived insight cards
// ---------------------------------------------------------------------------

interface InsightCard {
  icon?: string;
  title: string;
  highlight: string;
  explanation: string;
}

export function generateIntakeInsights(
  answers: Record<string, IntakeAnswer>,
  stats: CatalogStats,
): InsightCard[] {
  const insights: InsightCard[] = [];

  // Goal: sync but sync readiness is low
  const goal = answers['goals-primary']?.value as string | undefined;
  const syncPct = stats.total_songs > 0 ? Math.round((stats.sync_ready / stats.total_songs) * 100) : 0;
  if ((goal === 'Land sync placements' || answers['revenue-sync-pursuit']?.value === 'Yes, actively pitching') && syncPct < 40) {
    insights.push({
      icon: '⚠️',
      title: 'Sync goal vs. catalog readiness mismatch',
      highlight: `Only ${syncPct}% of catalog is sync-ready — goal requires at least 50%+`,
      explanation: 'Prioritize clearing songs for sync licensing and completing stem packages.',
    });
  }

  // High collab openness but low collab score
  const collabOpen = answers['collab-openness']?.value as number | undefined;
  if (typeof collabOpen === 'number' && collabOpen >= 4) {
    const collabArtists = Object.keys(stats.artist_distribution).length;
    if (collabArtists <= 2) {
      insights.push({
        icon: '🤝',
        title: 'Collaboration interest not reflected in catalog',
        highlight: `Artist is open to collabs (${collabOpen}/5) but only ${collabArtists} artists in catalog`,
        explanation: 'Actively seek featured artists or production collaborators to match stated intent.',
      });
    }
  }

  // Streaming goal but low stream count
  if (goal === 'Grow streaming numbers' && stats.total_streams < 100_000) {
    insights.push({
      icon: '📈',
      title: 'Streaming growth goal — early stage',
      highlight: `${stats.total_streams.toLocaleString()} total streams — building from base`,
      explanation: 'Focus on playlist pitching, consistent releases, and social promotion to build momentum.',
    });
  }

  // Revenue focus on sync but no stems
  if (answers['revenue-top-priority']?.value === 'Sync/licensing' && stats.has_stems === 0) {
    insights.push({
      icon: '🎛️',
      title: 'Sync revenue priority but zero stems available',
      highlight: 'Stems are required for most sync placements',
      explanation: 'Create stem packages for your top-performing songs first.',
    });
  }

  // High release cadence target but low catalog
  const cadence = answers['goals-release-cadence']?.value as string | undefined;
  if ((cadence === 'Single every month' || cadence === 'Single every 6–8 weeks') && stats.total_songs < 20) {
    insights.push({
      icon: '🚀',
      title: 'Ambitious release cadence — catalog is still small',
      highlight: `Target: ${cadence} — current catalog: ${stats.total_songs} songs`,
      explanation: 'Great trajectory if sustained. Ensure each release has proper metadata, artwork, and sync clearance.',
    });
  }

  return insights.slice(0, 4);
}
