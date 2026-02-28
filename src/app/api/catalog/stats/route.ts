import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam } from '@/config/notion';
import { fetchAllSongs, deduplicateSongs } from '@/lib/services/songs';
import { estimateRevenue } from '@/lib/services/revenue';
import type { CatalogStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const artist = parseArtistParam(searchParams.get('artist'));

    const allSongs = await fetchAllSongs(artist);
    const { songs } = deduplicateSongs(allSongs);

    const bpms = songs.filter((s) => s.bpm !== null).map((s) => s.bpm!);
    const totalStreams = songs.reduce((sum, s) => sum + s.total_streams, 0);

    const genreDist: Record<string, number> = {};
    const moodDist: Record<string, number> = {};
    const keyDist: Record<string, number> = {};
    const artistDist: Record<string, number> = {};
    const distributorDist: Record<string, number> = {};
    const yearDist: Record<string, number> = {};

    for (const song of songs) {
      // Artist
      if (song.artist) {
        artistDist[song.artist] = (artistDist[song.artist] ?? 0) + 1;
      }

      // Genre
      for (const g of song.genre) {
        genreDist[g] = (genreDist[g] ?? 0) + 1;
      }

      // Mood
      for (const m of song.mood) {
        moodDist[m] = (moodDist[m] ?? 0) + 1;
      }

      // Key
      if (song.key) {
        keyDist[song.key] = (keyDist[song.key] ?? 0) + 1;
      }

      // Distributor
      if (song.distributor) {
        distributorDist[song.distributor] = (distributorDist[song.distributor] ?? 0) + 1;
      }

      // Year
      if (song.release_date) {
        const year = new Date(song.release_date).getFullYear().toString();
        yearDist[year] = (yearDist[year] ?? 0) + 1;
      }
    }

    const stats: CatalogStats = {
      total_songs: songs.length,
      released: songs.filter((s) => s.status === 'Released').length,
      unreleased: songs.filter((s) => s.status === 'Unreleased').length,
      in_progress: songs.filter((s) => s.status === 'In Progress').length,
      total_streams: totalStreams,
      total_estimated_revenue: estimateRevenue(totalStreams),
      avg_bpm: bpms.length > 0 ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null,
      sync_ready: songs.filter((s) => s.sync_available).length,
      has_atmos: songs.filter((s) => s.atmos_mix).length,
      has_stems: songs.filter((s) => s.stems_complete).length,
      genre_distribution: genreDist,
      mood_distribution: moodDist,
      key_distribution: keyDist,
      artist_distribution: artistDist,
      distributor_distribution: distributorDist,
      year_distribution: yearDist,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[/api/catalog/stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog stats', details: String(error) },
      { status: 500 },
    );
  }
}
