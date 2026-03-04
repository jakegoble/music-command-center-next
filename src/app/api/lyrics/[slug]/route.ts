import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { queryAll, SONG_TTL, getCached, getText, getSelect } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// In-memory lyrics cache (slug → result)
// ---------------------------------------------------------------------------

interface LyricsResult {
  lyrics: string | null;
  genius_url: string | null;
  source?: 'genius' | 'lrclib';
  title: string;
  artist: string;
  error?: string;
}

const lyricsCache = new Map<string, { data: LyricsResult; ts: number }>();
const LYRICS_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Genius API helpers
// ---------------------------------------------------------------------------

async function searchGenius(title: string, artist: string, token: string): Promise<{ url: string; title: string } | null> {
  const query = `${title} ${artist}`;
  const res = await fetch(
    `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) return null;

  const data = await res.json();
  const hits = data?.response?.hits;
  if (!Array.isArray(hits) || hits.length === 0) return null;

  // Find best match — check if the primary artist matches
  const artistLower = artist.toLowerCase();
  const titleLower = title.toLowerCase();

  for (const hit of hits) {
    const result = hit?.result;
    if (!result) continue;
    const hitArtist = (result.primary_artist?.name ?? '').toLowerCase();
    const hitTitle = (result.title ?? '').toLowerCase();

    if (hitArtist.includes(artistLower) || artistLower.includes(hitArtist)) {
      if (hitTitle.includes(titleLower) || titleLower.includes(hitTitle)) {
        return { url: result.url, title: result.full_title };
      }
    }
  }

  // Fallback: return first hit if artist partially matches
  const first = hits[0]?.result;
  if (first) {
    const hitArtist = (first.primary_artist?.name ?? '').toLowerCase();
    if (hitArtist.includes(artistLower) || artistLower.includes(hitArtist)) {
      return { url: first.url, title: first.full_title };
    }
  }

  return null;
}

async function scrapeLyrics(geniusUrl: string): Promise<string | null> {
  try {
    const res = await fetch(geniusUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MusicCommandCenter/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Genius serves lyrics in <div data-lyrics-container="true"> elements
    const containers: string[] = [];
    const regex = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      containers.push(match[1]);
    }

    if (containers.length === 0) return null;

    // Clean HTML tags, convert <br> to newlines
    const raw = containers.join('\n');
    const text = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();

    return text || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// LRCLIB fallback (free, no auth)
// ---------------------------------------------------------------------------

async function fetchLrclib(title: string, artist: string): Promise<string | null> {
  try {
    const url = new URL('https://lrclib.net/api/get');
    url.searchParams.set('artist_name', artist);
    url.searchParams.set('track_name', title);
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer plain lyrics; fall back to synced lyrics with timestamps stripped
    return data?.plainLyrics ?? data?.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]\s*/g, '').trim() ?? null;
  } catch {
    return null;
  }
}

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
    const cached = lyricsCache.get(slug);
    if (cached && Date.now() - cached.ts < LYRICS_TTL) {
      return NextResponse.json(cached.data);
    }

    // Genius API token (optional — LRCLIB fallback works without it)
    const token = process.env.GENIUS_ACCESS_TOKEN;

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
      return NextResponse.json(
        { lyrics: null, genius_url: null, title: '', artist: '', error: 'Song not found' },
        { status: 404 },
      );
    }

    // Search Genius
    const geniusResult = token ? await searchGenius(songInfo.title, songInfo.artist, token) : null;

    if (!geniusResult) {
      // Try LRCLIB as fallback
      const lrclibLyrics = await fetchLrclib(songInfo.title, songInfo.artist);
      if (lrclibLyrics) {
        const result: LyricsResult = {
          lyrics: lrclibLyrics,
          genius_url: null,
          source: 'lrclib',
          title: songInfo.title,
          artist: songInfo.artist,
        };
        lyricsCache.set(slug, { data: result, ts: Date.now() });
        return NextResponse.json(result);
      }
      const result: LyricsResult = {
        lyrics: null,
        genius_url: null,
        title: songInfo.title,
        artist: songInfo.artist,
        error: token ? 'No matching lyrics found on Genius or LRCLIB' : 'GENIUS_ACCESS_TOKEN not configured. Add it to your environment variables.',
      };
      lyricsCache.set(slug, { data: result, ts: Date.now() });
      return NextResponse.json(result);
    }

    // Scrape lyrics from Genius page
    const geniusLyrics = await scrapeLyrics(geniusResult.url);
    // If Genius scraping failed, try LRCLIB as fallback
    const lyrics = geniusLyrics ?? await fetchLrclib(songInfo.title, songInfo.artist);
    const source = geniusLyrics ? 'genius' as const : lyrics ? 'lrclib' as const : undefined;
    const result: LyricsResult = {
      lyrics,
      genius_url: geniusLyrics ? geniusResult.url : null,
      source,
      title: songInfo.title,
      artist: songInfo.artist,
      error: lyrics ? undefined : 'Could not extract lyrics from Genius page',
    };

    lyricsCache.set(slug, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { lyrics: null, genius_url: null, title: '', artist: '', error: (err as Error).message },
      { status: 500 },
    );
  }
}
