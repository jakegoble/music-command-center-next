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

/**
 * Gross revenue the recording generated across all rightsholders.
 * This is NOT Jake's share. Use estimateJakeRevenue for that.
 */
export function estimateGrossRevenue(streams: number): number {
  return Math.round(streams * BLENDED_RATE * 100) / 100;
}

/**
 * Jake's estimated share.
 *
 * Returns null when ownership is unknown — deliberately. Assuming 100% is how
 * six works ended up overclaimed at the MLC, and a confident wrong number is
 * worse than an absent one. Callers must render null as "unknown", not zero.
 */
export function estimateJakeRevenue(streams: number, ownershipPct: number | null): number | null {
  if (ownershipPct === null || !Number.isFinite(ownershipPct)) return null;
  return Math.round(streams * BLENDED_RATE * ownershipPct * 100) / 100;
}

/** @deprecated Ambiguous about whose revenue it is. Use estimateGrossRevenue or estimateJakeRevenue. */
export function estimateRevenue(streams: number, ownershipPct: number = 1.0): number {
  return Math.round(streams * BLENDED_RATE * ownershipPct * 100) / 100;
}

export interface WriterSplit {
  name: string;
  percentage: number;
  ipi: string | null;
  pro: string | null;
}

const PRO_NAMES = ['ASCAP', 'BMI', 'SESAC', 'SOCAN', 'PRS', 'GEMA', 'SACEM'];

/** Names that mean Jake, in any of the forms that appear across the catalogue. */
const JAKE_ALIASES = [
  'jake goble',
  'john goble',
  'jake',
  'john',
  'jakke',
  'norcal electric',
];

function isJake(name: string): boolean {
  const n = name.trim().toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
  return JAKE_ALIASES.includes(n);
}

/**
 * Parse the free-text "Writer Splits" field.
 *
 * The data is inconsistent by nature — it is prose typed by humans over several
 * years. Observed separators are "|", "/" and ","; percentages may be decimal;
 * entries often carry trailing commentary, IPI numbers, PRO names and ASCAP
 * dates. The previous implementation split on "/", which shattered any entry
 * containing a date like 07/27/2022, and required whole-number percentages,
 * which silently zeroed every 33.33% split.
 *
 * Strategy: ignore separators entirely and scan for "<name> <number>%" pairs,
 * which survives arbitrary surrounding prose.
 *
 * Returns an empty array when nothing parses. It never invents a 100% claim.
 */
export function parseWriterSplits(raw: string | null): WriterSplit[] {
  if (!raw) return [];

  // Cut trailing commentary that follows an em dash or a "Publishers:" marker,
  // so publisher percentages are not mistaken for writer shares.
  const writerPart = raw.split(/—|\bPublishers?:|\bMaster(?:\s+royalty)?:/i)[0] ?? raw;

  const out: WriterSplit[] = [];
  const seen = new Set<string>();

  // "|" is the separator this catalogue actually uses. Splitting on it first
  // keeps each writer's name attached to their own percentage, including names
  // carrying parentheses ("Matthew Whalen Cohen (matty co.)") or symbols ("niko+").
  // Split on "|" and ";", and on a *spaced* slash — " / " separates writers,
  // while an unspaced one is part of a date (07/27/2022) or a ratio (50/50).
  const chunks = writerPart
    .split(/[|;]|\s\/\s/)
    .flatMap((c) => (/%.*%/.test(c) ? c.split(',') : [c]));

  for (const chunk of chunks) {
    const numMatch = chunk.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!numMatch) continue;
    const percentage = parseFloat(numMatch[1]);

    let name = chunk.slice(0, numMatch.index ?? 0);
    // Strip leading separators, list prefixes and stray digits.
    name = name.replace(/^[\s|,/\-–:]+/, '').replace(/^\d+\s*[/-]\s*\d+\s*[-–]\s*/, '');
    // Drop role words and IPI/PRO annotations that sit inside the name run.
    name = name.replace(/\b(writer|pub|publishing|publisher|master|each|split|splits|royalty)\b/gi, '');
    name = name.replace(/\bIPI#?\s*\d+/gi, '');
    name = name.replace(new RegExp(`\\b(${PRO_NAMES.join('|')})\\b`, 'gi'), '');
    name = name.replace(/[\s,+\-–:/]+$/, '').trim();

    if (!name || !/[A-Za-zÀ-ÿ]/.test(name) || !Number.isFinite(percentage)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const ipiMatch = raw.match(new RegExp(`${name}[^|]{0,60}?IPI#?\\s*(\\d{9,11})`, 'i'));
    const proMatch = raw.match(new RegExp(`${name}[^|]{0,60}?\\b(${PRO_NAMES.join('|')})\\b`, 'i'));

    out.push({
      name,
      percentage,
      ipi: ipiMatch ? ipiMatch[1] : null,
      pro: proMatch ? proMatch[1].toUpperCase() : null,
    });
  }

  return out;
}

/**
 * Jake's writer share as a 0–1 fraction, or null when it cannot be determined.
 *
 * Null is a real answer here. It means "we do not know", and the UI should say so.
 */
export function jakeSharePct(raw: string | null): number | null {
  const splits = parseWriterSplits(raw);
  if (splits.length === 0) return null;

  const mine = splits.filter((s) => isJake(s.name));
  if (mine.length === 0) return null;

  // Where a work lists both a writer share and a publisher share for Jake,
  // take the largest single figure rather than summing them.
  const pct = Math.max(...mine.map((s) => s.percentage));
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null;

  return pct / 100;
}

/** Do the parsed writer shares add up? Returns null when nothing parsed. */
export function splitsTotal(raw: string | null): number | null {
  const splits = parseWriterSplits(raw);
  if (splits.length === 0) return null;
  return Math.round(splits.reduce((sum, s) => sum + s.percentage, 0) * 100) / 100;
}
