import { fetchAllSongs, deduplicateSongs } from './songs';
import { toSlug } from '@/lib/utils/slug';
import { estimateRevenue } from '@/lib/services/revenue';
import type { ArtistFilter } from '@/config/notion';
import type { SongSummary, AlbumSummary, AlbumDetail } from '@/lib/types';

// ---------------------------------------------------------------------------
// Normalize album names so variants like "All Ways, Always EP (Track 2) +
// Standalone Single" group correctly under "All Ways, Always EP".
// ---------------------------------------------------------------------------

function normalizeAlbumName(raw: string): string {
  return raw
    // Strip "(Track N)" or "(Track N of M)" annotations
    .replace(/\s*\(Track\s+\d+(?:\s+of\s+\d+)?\)/gi, '')
    // Strip "+ Standalone Single", "+ Single", etc.
    .replace(/\s*\+\s*Standalone\s+Single/gi, '')
    .replace(/\s*\+\s*Single/gi, '')
    // Clean up leftover whitespace
    .trim();
}

// ---------------------------------------------------------------------------
// Fetch artwork for an album.
// Fallback chain: Spotify oEmbed → Apple Music (iTunes Lookup) → iTunes Search
// ---------------------------------------------------------------------------

async function fetchSpotifyArt(url: string): Promise<string | null> {
  // Only use track/album URLs — artist URLs return profile photos
  if (!url.includes('/track/') && !url.includes('/album/')) return null;
  try {
    const resp = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

async function fetchAppleMusicArt(url: string): Promise<string | null> {
  try {
    const albumMatch = url.match(/\/album\/[^/]+\/(\d+)/);
    if (!albumMatch) return null;
    const lookupUrl = new URL('https://itunes.apple.com/lookup');
    const trackIdMatch = url.match(/[?&]i=(\d+)/);
    lookupUrl.searchParams.set('id', trackIdMatch?.[1] ?? albumMatch[1]);
    const resp = await fetch(lookupUrl.toString(), { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.results?.[0];
    if (!result?.artworkUrl100) return null;
    return (result.artworkUrl100 as string).replace('100x100', '600x600');
  } catch {
    return null;
  }
}

/** Strip common release-type suffixes for fuzzy title comparison */
function stripReleaseSuffix(name: string): string {
  return name
    .replace(/\s*[-–—]\s*(single|ep|album)\s*$/i, '')
    .replace(/\s*\((?:single|ep|album|[^)]*music[^)]*)\)\s*$/i, '')
    .trim();
}

async function fetchITunesSearchArt(title: string, artist: string): Promise<string | null> {
  try {
    // Use the core title (without "(Single)" etc.) for the search query
    const coreTitle = stripReleaseSuffix(title);
    const resp = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${coreTitle} ${artist}`)}&media=music&entity=album&limit=5`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const results = data?.results;
    if (!Array.isArray(results) || results.length === 0) return null;
    const artistLower = artist.toLowerCase();
    const coreLower = coreTitle.toLowerCase();
    for (const r of results) {
      const rArtist = (r.artistName ?? '').toLowerCase();
      const rTitle = stripReleaseSuffix(r.collectionName ?? '').toLowerCase();
      if ((rArtist.includes(artistLower) || artistLower.includes(rArtist)) &&
          (rTitle.includes(coreLower) || coreLower.includes(rTitle))) {
        return (r.artworkUrl100 as string)?.replace('100x100', '600x600') ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchAlbumArtwork(tracks: SongSummary[], albumName: string, albumArtist: string): Promise<string | null> {
  // Try Spotify links from tracks
  for (const track of tracks) {
    if (track.spotify_link) {
      const art = await fetchSpotifyArt(track.spotify_link);
      if (art) return art;
    }
  }
  // Try Apple Music links from tracks
  for (const track of tracks) {
    if (track.apple_music_link) {
      const art = await fetchAppleMusicArt(track.apple_music_link);
      if (art) return art;
    }
  }
  // Fall back to iTunes Search by album name + artist
  return fetchITunesSearchArt(albumName, albumArtist);
}

function groupSongsByAlbum(songs: SongSummary[]): Map<string, SongSummary[]> {
  const groups = new Map<string, SongSummary[]>();
  for (const song of songs) {
    if (!song.album_ep) continue;
    const albumName = normalizeAlbumName(song.album_ep);
    if (!albumName) continue;
    const existing = groups.get(albumName) ?? [];
    existing.push(song);
    groups.set(albumName, existing);
  }
  return groups;
}

function buildAlbumSummary(name: string, tracks: SongSummary[]): AlbumSummary {
  // Primary artist by frequency
  const artistCounts = new Map<string, number>();
  for (const t of tracks) {
    artistCounts.set(t.artist, (artistCounts.get(t.artist) ?? 0) + 1);
  }
  const primaryArtist = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  const totalStreams = tracks.reduce((sum, t) => sum + t.total_streams, 0);
  const genres = [...new Set(tracks.flatMap(t => t.genre))];
  const dates = tracks.filter(t => t.release_date).map(t => t.release_date!).sort();
  const allReleased = tracks.every(t => t.status === 'Released');
  const allUnreleased = tracks.every(t => t.status === 'Unreleased');
  const status = allReleased ? 'Released' : allUnreleased ? 'Unreleased' : 'Mixed';

  return {
    slug: toSlug(name),
    name,
    artist: primaryArtist,
    track_count: tracks.length,
    total_streams: totalStreams,
    estimated_revenue: estimateRevenue(totalStreams),
    release_date: dates[0] ?? null,
    genres,
    status,
    artwork_url: null, // populated async in detail/list fetchers
  };
}

export async function fetchAllAlbums(artist: ArtistFilter = 'all'): Promise<AlbumSummary[]> {
  const all = await fetchAllSongs(artist);
  const { songs } = deduplicateSongs(all);
  const groups = groupSongsByAlbum(songs);
  const albums = [...groups.entries()].map(([name, tracks]) => buildAlbumSummary(name, tracks));

  // Fetch artwork in parallel for all albums
  const artworkPromises = [...groups.entries()].map(([name, tracks]) =>
    fetchAlbumArtwork(tracks, name, albums.find(a => a.name === name)?.artist ?? ''),
  );
  const artworks = await Promise.all(artworkPromises);
  for (let i = 0; i < albums.length; i++) {
    albums[i].artwork_url = artworks[i];
  }

  return albums;
}

export async function fetchAlbumDetail(albumSlug: string, artist: ArtistFilter = 'all'): Promise<AlbumDetail | null> {
  const all = await fetchAllSongs(artist);
  const { songs } = deduplicateSongs(all);
  const groups = groupSongsByAlbum(songs);

  for (const [name, tracks] of groups) {
    if (toSlug(name) === albumSlug) {
      const summary = buildAlbumSummary(name, tracks);
      const bpms = tracks.filter(t => t.bpm !== null).map(t => t.bpm!);

      // Fetch artwork for this album
      const artworkUrl = await fetchAlbumArtwork(tracks, name, summary.artist);

      return {
        ...summary,
        artwork_url: artworkUrl,
        tracks,
        avg_bpm: bpms.length > 0 ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null,
        sync_ready_count: tracks.filter(t => t.sync_available).length,
        has_atmos_count: tracks.filter(t => t.atmos_mix).length,
        has_stems_count: tracks.filter(t => t.stems_complete).length,
      };
    }
  }
  return null;
}
