import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { queryAll, getText, getSelect, getUrl, invalidateCache } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Admin endpoint to fetch YouTube video view counts for songs with YouTube links.
// Uses YouTube Data API v3 (free tier: 10,000 units/day).
//
// POST /api/admin/youtube-sync
// Body: { secret: string, dry_run?: boolean }
//
// Returns view counts for each song. Does NOT write to Notion since there's
// no "YouTube Views" field — returns data for display/analysis.
// ---------------------------------------------------------------------------

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { high?: { url: string } };
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface SongYouTubeData {
  slug: string;
  title: string;
  artist: string;
  youtube_link: string;
  video_id: string;
  video_title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  thumbnail: string | null;
}

function extractYouTubeVideoId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchVideoStats(apiKey: string, videoIds: string[]): Promise<Map<string, YouTubeVideo>> {
  const results = new Map<string, YouTubeVideo>();

  // YouTube API allows up to 50 video IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('part', 'snippet,statistics');

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const error = await resp.text();
      throw new Error(`YouTube API error ${resp.status}: ${error}`);
    }

    const data = await resp.json();
    for (const item of data.items ?? []) {
      results.set(item.id, item as YouTubeVideo);
    }
  }

  return results;
}

// Also search YouTube for songs WITHOUT a YouTube link
async function searchYouTube(apiKey: string, title: string, artist: string): Promise<{ videoId: string; title: string } | null> {
  try {
    const query = `${artist} ${title} official`;
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'video');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('maxResults', '3');
    url.searchParams.set('videoCategoryId', '10'); // Music category

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const items = data.items ?? [];

    // Find best match — check if channel/title matches artist
    const artistLower = artist.toLowerCase();
    const titleLower = title.toLowerCase();

    for (const item of items) {
      const channel = (item.snippet?.channelTitle ?? '').toLowerCase();
      const vidTitle = (item.snippet?.title ?? '').toLowerCase();
      if ((channel.includes(artistLower) || vidTitle.includes(artistLower)) &&
          (vidTitle.includes(titleLower))) {
        return { videoId: item.id.videoId, title: item.snippet.title };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, dry_run = false } = body as { secret?: string; dry_run?: boolean };

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YOUTUBE_API_KEY not configured' }, { status: 500 });
    }

    // 1. Fetch all songs from Notion
    const pages = await queryAll(NOTION_DBS.SONG_CATALOG);
    const songs = pages.map(page => {
      const p = page.properties;
      const title = getText(p['Song Title']) ?? '';
      return {
        pageId: page.id,
        slug: toSlug(title),
        title,
        artist: getSelect(p['Artist']) ?? '',
        youtubeLink: getUrl(p['YouTube Link']),
      };
    });

    // 2. Extract video IDs from existing YouTube links
    const songsWithLinks = songs
      .filter(s => s.youtubeLink)
      .map(s => ({
        ...s,
        videoId: extractYouTubeVideoId(s.youtubeLink!),
      }))
      .filter(s => s.videoId !== null) as Array<typeof songs[number] & { videoId: string }>;

    const videoIds = songsWithLinks.map(s => s.videoId);

    // 3. Fetch video stats in batch
    const videoStats = videoIds.length > 0
      ? await fetchVideoStats(apiKey, videoIds)
      : new Map<string, YouTubeVideo>();

    // 4. Build results for songs with links
    const results: SongYouTubeData[] = [];

    for (const song of songsWithLinks) {
      const video = videoStats.get(song.videoId);
      if (video) {
        results.push({
          slug: song.slug,
          title: song.title,
          artist: song.artist,
          youtube_link: song.youtubeLink!,
          video_id: song.videoId,
          video_title: video.snippet.title,
          view_count: parseInt(video.statistics.viewCount, 10) || 0,
          like_count: parseInt(video.statistics.likeCount ?? '0', 10),
          comment_count: parseInt(video.statistics.commentCount ?? '0', 10),
          published_at: video.snippet.publishedAt,
          thumbnail: video.snippet.thumbnails.high?.url ?? null,
        });
      }
    }

    // 5. Search YouTube for songs WITHOUT links (discovery mode)
    const songsWithoutLinks = songs.filter(s => !s.youtubeLink && s.title && s.artist);
    const discovered: Array<{ slug: string; title: string; artist: string; videoId: string; videoTitle: string; youtubeUrl: string }> = [];

    if (!dry_run) {
      for (const song of songsWithoutLinks) {
        const found = await searchYouTube(apiKey, song.title, song.artist);
        if (found) {
          discovered.push({
            slug: song.slug,
            title: song.title,
            artist: song.artist,
            videoId: found.videoId,
            videoTitle: found.title,
            youtubeUrl: `https://www.youtube.com/watch?v=${found.videoId}`,
          });
        }
        await new Promise(r => setTimeout(r, 200)); // rate limit
      }
    }

    // Sort results by view count descending
    results.sort((a, b) => b.view_count - a.view_count);

    const totalViews = results.reduce((sum, r) => sum + r.view_count, 0);

    return NextResponse.json({
      songs_with_links: songsWithLinks.length,
      videos_found: results.length,
      total_views: totalViews,
      discovered_videos: discovered.length,
      dry_run,
      results,
      discovered,
      missing_links: songsWithoutLinks.map(s => ({ slug: s.slug, title: s.title })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'YouTube sync failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}
