import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { notion, queryAll, getText, getSelect, getUrl, getNumber, getMultiSelect, invalidateCache } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Daily cron endpoint — syncs Spotify popularity + YouTube view counts.
// Triggered by Vercel Cron (GET with CRON_SECRET) or manually with ADMIN_SECRET.
//
// GET /api/cron/daily-sync
//   Auth: Authorization: Bearer <CRON_SECRET>
//   Or query param: ?secret=<ADMIN_SECRET>
// ---------------------------------------------------------------------------

// --- Spotify helpers (Client Credentials — no user auth needed) ---

async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.access_token;
}

interface SpotifyTrackData {
  id: string;
  popularity: number;
}

async function fetchSpotifyTracks(token: string, trackIds: string[]): Promise<Map<string, SpotifyTrackData>> {
  const results = new Map<string, SpotifyTrackData>();
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const resp = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (resp.ok) {
      const data = await resp.json();
      for (const track of data.tracks ?? []) {
        if (track) results.set(track.id, { id: track.id, popularity: track.popularity });
      }
    }
    if (i + 50 < trackIds.length) await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

// --- YouTube helpers ---

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/\/track\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

interface YouTubeStats {
  viewCount: number;
  likeCount: number;
}

async function fetchYouTubeStats(apiKey: string, videoIds: string[]): Promise<Map<string, YouTubeStats>> {
  const results = new Map<string, YouTubeStats>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('part', 'statistics');

    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) continue;

    const data = await resp.json();
    for (const item of data.items ?? []) {
      results.set(item.id, {
        viewCount: parseInt(item.statistics?.viewCount ?? '0', 10),
        likeCount: parseInt(item.statistics?.likeCount ?? '0', 10),
      });
    }
  }
  return results;
}

// --- Auth check ---

function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Manual trigger with ADMIN_SECRET query param
  const adminSecret = process.env.ADMIN_SECRET;
  const secretParam = request.nextUrl.searchParams.get('secret');
  if (adminSecret && secretParam === adminSecret) return true;

  return false;
}

// --- Main handler ---

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const log: string[] = [];

  try {
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
        spotifyLink: getUrl(p['Spotify Link']),
        youtubeLink: getUrl(p['YouTube Link']),
        popularityScore: getNumber(p['Popularity Score']),
        youtubeViews: getNumber(p['YouTube Views']),
        genres: getMultiSelect(p['Genre']),
        moods: getMultiSelect(p['Mood Tags']),
        bpm: getNumber(p['BPM']),
      };
    });
    log.push(`Fetched ${songs.length} songs from Notion`);

    // --- SPOTIFY POPULARITY SYNC ---
    let spotifyUpdated = 0;
    const spotifyToken = await getSpotifyToken();

    if (spotifyToken) {
      // Collect track IDs from Spotify links
      const trackIdToSongs = new Map<string, typeof songs>();
      for (const song of songs) {
        if (!song.spotifyLink) continue;
        const trackId = extractSpotifyTrackId(song.spotifyLink);
        if (!trackId) continue;
        const existing = trackIdToSongs.get(trackId) ?? [];
        existing.push(song);
        trackIdToSongs.set(trackId, existing);
      }

      const trackIds = Array.from(trackIdToSongs.keys());
      log.push(`Found ${trackIds.length} Spotify track IDs`);

      if (trackIds.length > 0) {
        const spotifyData = await fetchSpotifyTracks(spotifyToken, trackIds);

        for (const [trackId, data] of spotifyData) {
          const matchedSongs = trackIdToSongs.get(trackId) ?? [];
          for (const song of matchedSongs) {
            // Only update if popularity changed
            if (song.popularityScore === data.popularity) continue;

            try {
              await notion.pages.update({
                page_id: song.pageId,
                properties: {
                  'Popularity Score': { number: data.popularity },
                } as Parameters<typeof notion.pages.update>[0]['properties'],
              });
              spotifyUpdated++;
            } catch { /* skip individual errors */ }

            if (spotifyUpdated % 3 === 0) await new Promise(r => setTimeout(r, 400));
          }
        }
      }
      log.push(`Updated ${spotifyUpdated} popularity scores`);
    } else {
      log.push('Skipped Spotify sync (no credentials)');
    }

    // --- YOUTUBE VIEW COUNT SYNC ---
    let youtubeUpdated = 0;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    if (youtubeApiKey) {
      const videoIdToSongs = new Map<string, typeof songs>();
      for (const song of songs) {
        if (!song.youtubeLink) continue;
        const videoId = extractYouTubeVideoId(song.youtubeLink);
        if (!videoId) continue;
        const existing = videoIdToSongs.get(videoId) ?? [];
        existing.push(song);
        videoIdToSongs.set(videoId, existing);
      }

      const videoIds = Array.from(videoIdToSongs.keys());
      log.push(`Found ${videoIds.length} YouTube video IDs`);

      if (videoIds.length > 0) {
        const ytStats = await fetchYouTubeStats(youtubeApiKey, videoIds);

        for (const [videoId, stats] of ytStats) {
          const matchedSongs = videoIdToSongs.get(videoId) ?? [];
          for (const song of matchedSongs) {
            // Only update if views changed
            if (song.youtubeViews === stats.viewCount) continue;

            try {
              await notion.pages.update({
                page_id: song.pageId,
                properties: {
                  'YouTube Views': { number: stats.viewCount },
                } as Parameters<typeof notion.pages.update>[0]['properties'],
              });
              youtubeUpdated++;
            } catch { /* skip individual errors */ }

            if (youtubeUpdated % 3 === 0) await new Promise(r => setTimeout(r, 400));
          }
        }
      }
      log.push(`Updated ${youtubeUpdated} YouTube view counts`);
    } else {
      log.push('Skipped YouTube sync (no API key)');
    }

    // Invalidate caches if anything changed
    if (spotifyUpdated > 0 || youtubeUpdated > 0) {
      invalidateCache('songs');
      invalidateCache('song-basic');
      invalidateCache('song-detail');
    }

    const elapsed = Date.now() - startTime;
    log.push(`Done in ${elapsed}ms`);

    return NextResponse.json({
      ok: true,
      spotify_popularity_updated: spotifyUpdated,
      youtube_views_updated: youtubeUpdated,
      songs_total: songs.length,
      elapsed_ms: elapsed,
      log,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Daily sync failed', details: (err as Error).message, log },
      { status: 500 },
    );
  }
}
