import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam } from '@/config/notion';
import { fetchAlbumDetail } from '@/lib/services/albums';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const artist = parseArtistParam(request.nextUrl.searchParams.get('artist'));
    const album = await fetchAlbumDetail(slug, artist);

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (error) {
    console.error('[/api/catalog/albums/[slug]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch album detail', details: String(error) }, { status: 500 });
  }
}
