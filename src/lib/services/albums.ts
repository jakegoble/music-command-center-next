import { fetchAllSongs, deduplicateSongs } from './songs';
import { toSlug } from '@/lib/utils/slug';
import { estimateRevenue } from '@/lib/services/revenue';
import type { ArtistFilter } from '@/config/notion';
import type { SongSummary, AlbumSummary, AlbumDetail } from '@/lib/types';

function groupSongsByAlbum(songs: SongSummary[]): Map<string, SongSummary[]> {
  const groups = new Map<string, SongSummary[]>();
  for (const song of songs) {
    if (!song.album_ep) continue;
    const existing = groups.get(song.album_ep) ?? [];
    existing.push(song);
    groups.set(song.album_ep, existing);
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
  };
}

export async function fetchAllAlbums(artist: ArtistFilter = 'all'): Promise<AlbumSummary[]> {
  const all = await fetchAllSongs(artist);
  const { songs } = deduplicateSongs(all);
  const groups = groupSongsByAlbum(songs);
  return [...groups.entries()].map(([name, tracks]) => buildAlbumSummary(name, tracks));
}

export async function fetchAlbumDetail(albumSlug: string, artist: ArtistFilter = 'all'): Promise<AlbumDetail | null> {
  const all = await fetchAllSongs(artist);
  const { songs } = deduplicateSongs(all);
  const groups = groupSongsByAlbum(songs);

  for (const [name, tracks] of groups) {
    if (toSlug(name) === albumSlug) {
      const summary = buildAlbumSummary(name, tracks);
      const bpms = tracks.filter(t => t.bpm !== null).map(t => t.bpm!);
      return {
        ...summary,
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
