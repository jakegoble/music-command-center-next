import { NOTION_DBS, type ArtistFilter } from '@/config/notion';
import {
  queryAll,
  getCached,
  SONG_TTL,
  getText,
  getNumber,
  getSelect,
  getMultiSelect,
  getCheckbox,
  getDate,
  getUrl,
  getRelationIds,
} from '@/lib/clients/notion';
import { estimateRevenue, PLATFORM_DISTRIBUTION } from '@/lib/services/revenue';
import type { SongSummary, PlatformStreams, StreamingPlatform } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { toSlug } from '@/lib/utils/slug';

export { toSlug };

// ---------------------------------------------------------------------------
// Map a Notion page → SongSummary
// ---------------------------------------------------------------------------

export function mapPageToSong(page: PageObjectResponse): SongSummary {
  const p = page.properties;
  const title = getText(p['Song Title']) ?? '';
  const streams = getNumber(p['Total Streams']) ?? 0;

  // Estimate per-platform streams from total using distribution weights
  const platformStreams: PlatformStreams | null = streams > 0
    ? Object.fromEntries(
        Object.entries(PLATFORM_DISTRIBUTION).map(([platform, share]) => [
          platform as StreamingPlatform,
          Math.round(streams * share),
        ]),
      ) as PlatformStreams
    : null;

  return {
    id: page.id,
    slug: toSlug(title),
    title,
    artist: getSelect(p['Artist']) ?? '',
    status: getSelect(p['Status']) ?? '',
    genre: getMultiSelect(p['Genre']),
    mood: getMultiSelect(p['Mood Tags']),
    bpm: getNumber(p['BPM']),
    key: getSelect(p['Key']) ?? getText(p['Key']),
    duration: getText(p['Duration']),
    release_date: getDate(p['Release Date']),
    distributor: getSelect(p['Distributor']),
    total_streams: streams,
    platform_streams: platformStreams,
    popularity_score: getNumber(p['Popularity Score']),
    isrc: getText(p['ISRC']),
    upc: getText(p['UPC']),
    album_ep: getText(p['Album/EP']) ?? getSelect(p['Album/EP']),
    atmos_mix: getCheckbox(p['Atmos Mix']),
    stems_complete: getCheckbox(p['Stems Complete']),
    sync_available: getCheckbox(p['Available for Sync']),
    sync_tier: getSelect(p['Sync Tier']),
    artwork: getCheckbox(p['Artwork']),
    explicit: getCheckbox(p['Explicit']),
    spotify_link: getUrl(p['Spotify Link']),
    apple_music_link: getUrl(p['Apple Music Link']),
    youtube_link: getUrl(p['YouTube Link']),
    collaborator_count: getRelationIds(p['Collaborators']).length,
    contract_count: getRelationIds(p['Contracts']).length,
    estimated_revenue: estimateRevenue(streams),
    ascap_registered: getCheckbox(p['ASCAP Registered']),
    mlc_registered: getCheckbox(p['MLC Registered']),
    soundexchange_registered: getCheckbox(p['SoundExchange Registered']),
    youtube_content_id: getCheckbox(p['YouTube Content ID']),
  };
}

// ---------------------------------------------------------------------------
// Build Notion filter for artist
// ---------------------------------------------------------------------------

function buildArtistFilter(artist: ArtistFilter) {
  if (artist === 'all') return undefined;
  return { property: 'Artist', select: { equals: artist } };
}

// ---------------------------------------------------------------------------
// Fetch all songs (cached), optionally filtered by artist
// ---------------------------------------------------------------------------

export async function fetchAllSongs(artist: ArtistFilter = 'all'): Promise<SongSummary[]> {
  const cacheKey = `songs:${artist}`;
  return getCached(cacheKey, SONG_TTL, async () => {
    const filter = buildArtistFilter(artist);
    const pages = await queryAll(
      NOTION_DBS.SONG_CATALOG,
      filter ? { and: [filter] } : undefined,
      [{ property: 'Release Date', direction: 'descending' }],
    );
    return pages.map(mapPageToSong);
  });
}

// ---------------------------------------------------------------------------
// Stream deduplication
// ---------------------------------------------------------------------------

export interface DeduplicationResult {
  songs: SongSummary[];
  totalStreams: number;
  duplicates: { title: string; isrc: string | null; count: number }[];
}

/**
 * Deduplicate songs by ISRC (or title if ISRC is missing).
 * If duplicates are found, keeps the first occurrence and logs a warning.
 */
export function deduplicateSongs(songs: SongSummary[]): DeduplicationResult {
  const seen = new Map<string, SongSummary>();
  const duplicateCounts = new Map<string, number>();
  const duplicates: DeduplicationResult['duplicates'] = [];

  for (const song of songs) {
    // Use ISRC as primary dedup key, fall back to title+artist
    const key = song.isrc || `${song.title}::${song.artist}`;
    if (!key) continue;

    const existing = seen.get(key);
    if (existing) {
      const count = (duplicateCounts.get(key) ?? 1) + 1;
      duplicateCounts.set(key, count);

      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[dedup] Duplicate song detected: "${song.title}" (ISRC: ${song.isrc ?? 'N/A'}) — keeping first occurrence`,
        );
      }
    } else {
      seen.set(key, song);
    }
  }

  for (const [key, count] of duplicateCounts) {
    const song = seen.get(key)!;
    duplicates.push({ title: song.title, isrc: song.isrc, count });
  }

  const uniqueSongs = Array.from(seen.values());
  const totalStreams = uniqueSongs.reduce((sum, s) => sum + s.total_streams, 0);

  return { songs: uniqueSongs, totalStreams, duplicates };
}
