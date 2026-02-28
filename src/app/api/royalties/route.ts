import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam } from '@/config/notion';
import { fetchRoyalties } from '@/lib/services/royalties';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const artist = parseArtistParam(searchParams.get('artist'));

    const entries = await fetchRoyalties(artist);

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
    });
  } catch (error) {
    console.error('[/api/royalties] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch royalties', details: String(error) },
      { status: 500 },
    );
  }
}
