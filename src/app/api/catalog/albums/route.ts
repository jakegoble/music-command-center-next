import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam } from '@/config/notion';
import { fetchAllAlbums } from '@/lib/services/albums';
import type { AlbumsResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const artist = parseArtistParam(searchParams.get('artist'));
    const sort = searchParams.get('sort') ?? 'release_date';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    const albums = await fetchAllAlbums(artist);

    const SORTABLE = new Set(['name', 'track_count', 'total_streams', 'release_date', 'artist', 'status']);
    const validSort = SORTABLE.has(sort) ? sort : 'release_date';

    albums.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[validSort];
      const bVal = (b as unknown as Record<string, unknown>)[validSort];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));
      return order === 'desc' ? -cmp : cmp;
    });

    return NextResponse.json({ albums, total: albums.length } satisfies AlbumsResponse);
  } catch (error) {
    console.error('[/api/catalog/albums] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch albums', details: String(error) }, { status: 500 });
  }
}
