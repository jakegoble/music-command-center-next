export const PLATFORM_RATES: Record<string, number> = {
  spotify: 0.004,
  apple_music: 0.01,
  youtube_music: 0.002,
  amazon_music: 0.004,
  tidal: 0.013,
  deezer: 0.004,
  other: 0.003,
};

export const PLATFORM_DISTRIBUTION: Record<string, number> = {
  spotify: 0.60,
  apple_music: 0.15,
  youtube_music: 0.08,
  amazon_music: 0.05,
  tidal: 0.03,
  deezer: 0.03,
  other: 0.06,
};

/** Blended per-stream rate ≈ $0.00478 */
export const BLENDED_RATE = Object.entries(PLATFORM_DISTRIBUTION).reduce(
  (sum, [platform, share]) => sum + (PLATFORM_RATES[platform] ?? 0.003) * share,
  0,
);

export function estimateRevenue(streams: number, ownershipPct: number = 1.0): number {
  return Math.round(streams * BLENDED_RATE * ownershipPct * 100) / 100;
}

export interface WriterSplit {
  name: string;
  percentage: number;
}

export function parseWriterSplits(raw: string | null): WriterSplit[] {
  if (!raw) return [{ name: 'Jake Goble', percentage: 100 }];
  return raw.split('/').map((part) => {
    const match = part.trim().match(/^(.+?)\s+(\d+)%$/);
    if (!match) return { name: part.trim(), percentage: 0 };
    return { name: match[1].trim(), percentage: parseInt(match[2]) };
  });
}
