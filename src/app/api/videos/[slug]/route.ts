import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { queryAll, SONG_TTL, getCached, getText, getSelect } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const videoCache = new Map<string, { data: VideoResult[]; ts: number }>();
const VIDEO_TTL = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Check cache
    const cached = videoCache.get(slug);
    if (cached && Date.now() - cached.ts < VIDEO_TTL) {
      return NextResponse.json({ videos: cached.data });
    }

    // Check for YouTube API key
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        videos: [],
        message: 'YOUTUBE_API_KEY not configured. Add it to your environment variables.',
      });
    }

    // Look up song in Notion by slug
    const songInfo = await getCached(`song-basic:${slug}`, SONG_TTL, async () => {
      const pages = await queryAll(NOTION_DBS.SONG_CATALOG);
      const page = pages.find(p => {
        const t = getText(p.properties['Song Title']) ?? '';
        return toSlug(t) === slug;
      });
      if (!page) return null;
      return {
        title: getText(page.properties['Song Title']) ?? '',
        artist: getSelect(page.properties['Artist']) ?? '',
      };
    });

    if (!songInfo) {
      return NextResponse.json({ videos: [], message: 'Song not found' }, { status: 404 });
    }

    // Search YouTube Data API v3
    const query = `"${songInfo.title}" "${songInfo.artist}"`;
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', '8');
    searchUrl.searchParams.set('key', apiKey);

    const searchRes = await fetch(searchUrl.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      return NextResponse.json(
        { videos: [], message: `YouTube API error: ${searchRes.status}`, details: errBody },
        { status: 502 },
      );
    }

    const searchData = await searchRes.json();
    const items = searchData.items ?? [];

    // Map to our video format
    const videos: VideoResult[] = items
      .filter((item: { id?: { videoId?: string } }) => item?.id?.videoId)
      .map((item: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } }; publishedAt: string } }) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url ?? '',
        publishedAt: item.snippet.publishedAt,
      }));

    // Cache results
    videoCache.set(slug, { data: videos, ts: Date.now() });

    return NextResponse.json({ videos });
  } catch (err) {
    return NextResponse.json(
      { videos: [], message: (err as Error).message },
      { status: 500 },
    );
  }
}
