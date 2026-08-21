import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam } from '@/config/notion';
import { fetchRoyalties } from '@/lib/services/royalties';
import { fetchAllSongs } from '@/lib/services/songs';
import { PLATFORM_RATES, PLATFORM_DISTRIBUTION } from '@/lib/services/revenue';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const artist = parseArtistParam(searchParams.get('artist'));

    const entries = await fetchRoyalties(artist);

    // If we have actual royalty data, return it as-is
    if (entries.length > 0) {
      const totalRevenue = entries.reduce((sum, e) => sum + e.total, 0);

      const bySource: Record<string, number> = {};
      for (const e of entries) {
        if (e.ascap_performance) bySource['ASCAP Performance'] = (bySource['ASCAP Performance'] ?? 0) + e.ascap_performance;
        if (e.distributor_streaming) bySource['Distributor Streaming'] = (bySource['Distributor Streaming'] ?? 0) + e.distributor_streaming;
        if (e.mlc_mechanical) bySource['MLC Mechanical'] = (bySource['MLC Mechanical'] ?? 0) + e.mlc_mechanical;
        if (e.ppl_international) bySource['PPL International'] = (bySource['PPL International'] ?? 0) + e.ppl_international;
        if (e.soundexchange_digital) bySource['SoundExchange Digital'] = (bySource['SoundExchange Digital'] ?? 0) + e.soundexchange_digital;
        if (e.sync_licensing) bySource['Sync Licensing'] = (bySource['Sync Licensing'] ?? 0) + e.sync_licensing;
        if (e.youtube_social) bySource['YouTube/Social'] = (bySource['YouTube/Social'] ?? 0) + e.youtube_social;
        if (e.other) bySource['Other'] = (bySource['Other'] ?? 0) + e.other;
      }

      const byQuarter: Record<string, number> = {};
      for (const e of entries) {
        const key = e.quarter ?? e.period ?? 'Unknown';
        byQuarter[key] = (byQuarter[key] ?? 0) + e.total;
      }

      return NextResponse.json({
        entries,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        by_source: bySource,
        by_quarter: byQuarter,
        data_type: 'reported',
      });
    }

    // No actual royalty data — compute estimated revenue from song streams
    const songs = await fetchAllSongs(artist);
    const totalStreams = songs.reduce((sum, s) => sum + s.total_streams, 0);
    // Jake's share, summed per song. Songs with unknown ownership are excluded
    // from the total and reported separately rather than assumed to be 100% his.
    let totalEstRevenue = 0;
    let unknownOwnershipStreams = 0;
    for (const s of songs) {
      const share = s.estimated_revenue;
      if (share === null) unknownOwnershipStreams += s.total_streams;
      else totalEstRevenue += share;
    }

    // Estimate revenue by platform source using distribution weights
    const bySource: Record<string, number> = {};
    const platformLabels: Record<string, string> = {
      spotify: 'Spotify (gross est.)',
      apple_music: 'Apple Music (gross est.)',
      youtube_music: 'YouTube Music (gross est.)',
      amazon_music: 'Amazon Music (gross est.)',
      tidal: 'Tidal (gross est.)',
      deezer: 'Deezer (gross est.)',
      other: 'Other (gross est.)',
    };
    for (const [platform, share] of Object.entries(PLATFORM_DISTRIBUTION)) {
      const rate = PLATFORM_RATES[platform] ?? 0.003;
      const platformRevenue = Math.round(totalStreams * share * rate * 100) / 100;
      if (platformRevenue > 0) {
        bySource[platformLabels[platform] ?? platform] = platformRevenue;
      }
    }

    // Estimate revenue by year from release dates
    const byQuarter: Record<string, number> = {};
    for (const song of songs) {
      const year = song.release_date?.slice(0, 4) ?? 'Unknown';
      byQuarter[year] = (byQuarter[year] ?? 0) + (song.estimated_revenue ?? 0);
    }

    // Estimate revenue by artist
    const byArtist: Record<string, number> = {};
    for (const song of songs) {
      const a = song.artist || 'Unknown';
      byArtist[a] = (byArtist[a] ?? 0) + (song.estimated_revenue ?? 0);
    }

    return NextResponse.json({
      entries: [],
      total_revenue: Math.round(totalEstRevenue * 100) / 100,
      unknown_ownership_streams: unknownOwnershipStreams,
      total_streams: totalStreams,
      by_source: bySource,
      by_quarter: byQuarter,
      by_artist: byArtist,
      data_type: 'estimated',
    });
  } catch (error) {
    console.error('[/api/royalties] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch royalties', details: String(error) },
      { status: 500 },
    );
  }
}
