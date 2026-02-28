import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam, ARTIST_OPTIONS } from '@/config/notion';
import { fetchAllSongs, deduplicateSongs } from '@/lib/services/songs';
import type { DataAuditResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const artist = parseArtistParam(searchParams.get('artist'));

    // If a specific artist is requested, only audit that artist
    if (artist !== 'all') {
      const songs = await fetchAllSongs(artist);
      const { songs: deduped, totalStreams, duplicates } = deduplicateSongs(songs);

      const missingISRC = deduped.filter((s) => !s.isrc).map((s) => s.title);
      const missingStreams = deduped
        .filter((s) => s.total_streams === 0)
        .map((s) => s.title);

      const response: DataAuditResponse = {
        totalSongs: deduped.length,
        songsByArtist: { [artist]: deduped.length },
        totalStreams,
        streamsByArtist: { [artist]: totalStreams },
        duplicateSongs: duplicates,
        nullFields: { missingISRC, missingStreams },
        allArtistSum: totalStreams,
        individualArtistSum: totalStreams,
        sumsMatch: true,
        allSongCount: deduped.length,
        perArtistSongCount: deduped.length,
        countsMatch: true,
      };

      return NextResponse.json(response);
    }

    // Full audit: fetch "all" songs in one query
    const allSongs = await fetchAllSongs('all');
    const { songs: allDeduped, totalStreams: allStreams, duplicates } = deduplicateSongs(allSongs);

    // Fetch per-artist SEPARATELY (independent Notion queries for real cross-check)
    const perArtistResults = await Promise.all(
      ARTIST_OPTIONS.map(async (a) => {
        const songs = await fetchAllSongs(a);
        const { songs: deduped } = deduplicateSongs(songs);
        return { artist: a, songs: deduped };
      }),
    );

    const songsByArtist: Record<string, number> = {};
    const streamsByArtist: Record<string, number> = {};

    for (const { artist: a, songs: artistSongs } of perArtistResults) {
      songsByArtist[a] = artistSongs.length;
      streamsByArtist[a] = artistSongs.reduce((sum, s) => sum + s.total_streams, 0);
    }

    // Cross-check: sum of independently-fetched per-artist streams vs "all" query
    const individualSum = Object.values(streamsByArtist).reduce((a, b) => a + b, 0);

    const missingISRC = allDeduped.filter((s) => !s.isrc).map((s) => s.title);
    const missingStreams = allDeduped
      .filter((s) => s.total_streams === 0)
      .map((s) => s.title);

    // Also cross-check song counts
    const allSongCount = allDeduped.length;
    const perArtistSongCount = Object.values(songsByArtist).reduce((a, b) => a + b, 0);

    const response: DataAuditResponse = {
      totalSongs: allDeduped.length,
      songsByArtist,
      totalStreams: allStreams,
      streamsByArtist,
      duplicateSongs: duplicates,
      nullFields: { missingISRC, missingStreams },
      allArtistSum: allStreams,
      individualArtistSum: individualSum,
      sumsMatch: allStreams === individualSum,
      allSongCount,
      perArtistSongCount,
      countsMatch: allSongCount === perArtistSongCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[/api/data-audit] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run data audit', details: String(error) },
      { status: 500 },
    );
  }
}
