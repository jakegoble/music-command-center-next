import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { notion, queryAll, getText, getSelect, getUrl, invalidateCache } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Admin endpoint to sync REAL Spotify play counts from the Partner API.
//
// POST /api/admin/spotify-playcount-sync
// Body: {
//   secret: string,
//   token: string,        // Spotify Partner API bearer token (from web player)
//   client_token: string, // Spotify client token header
//   dry_run?: boolean
// }
//
// How to get the tokens:
// 1. Open any album page on open.spotify.com
// 2. Open DevTools → Network → filter "api-partner"
// 3. Copy "authorization: Bearer ..." and "client-token" headers
//
// The endpoint:
// 1. Reads all songs from Notion with Spotify links
// 2. Extracts album IDs from Spotify URLs
// 3. Queries Partner API for each album to get per-track play counts
// 4. Writes estimated Total Streams (Spotify / 0.60) to Notion
// ---------------------------------------------------------------------------

const PARTNER_API = 'https://api-partner.spotify.com/pathfinder/v2/query';
const ALBUM_QUERY_HASH = 'b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10';

interface AlbumTrack {
  name: string;
  playcount: string;
  uri: string;
  duration?: { totalMilliseconds: number };
}

function extractSpotifyId(url: string, type: 'track' | 'album'): string | null {
  const pattern = new RegExp(`${type}/([a-zA-Z0-9]{22})`);
  const match = url.match(pattern);
  return match?.[1] ?? null;
}

async function fetchAlbumPlayCounts(
  albumId: string,
  bearerToken: string,
  clientToken: string,
): Promise<AlbumTrack[]> {
  const body = JSON.stringify({
    variables: { uri: `spotify:album:${albumId}`, locale: '', offset: 0, limit: 50 },
    operationName: 'getAlbum',
    extensions: { persistedQuery: { version: 1, sha256Hash: ALBUM_QUERY_HASH } },
  });

  const resp = await fetch(PARTNER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json',
      'Origin': 'https://open.spotify.com',
      'Referer': 'https://open.spotify.com/',
      'client-token': clientToken,
      'app-platform': 'WebPlayer',
      'spotify-app-version': '896000000',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    throw new Error(`Partner API ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  const album = data?.data?.albumUnion;
  if (!album?.tracksV2?.items) return [];

  return album.tracksV2.items.map((item: { track: AlbumTrack }) => item.track);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, token, client_token, dry_run = false } = body as {
      secret?: string;
      token?: string;
      client_token?: string;
      dry_run?: boolean;
    };

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!token || !client_token) {
      return NextResponse.json(
        { error: 'Missing token or client_token. Get these from browser DevTools on open.spotify.com.' },
        { status: 400 },
      );
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
        spotifyLink: getUrl(p['Spotify Link']),
      };
    });

    // 2. Group songs by album ID
    const albumSongs = new Map<string, typeof songs>();
    const trackIdToSong = new Map<string, typeof songs[number]>();

    for (const song of songs) {
      if (!song.spotifyLink) continue;
      const trackId = extractSpotifyId(song.spotifyLink, 'track');
      if (trackId) trackIdToSong.set(trackId, song);
    }

    // We need album IDs. Use Spotify Web API to get album IDs for each track.
    const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
    const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    let webApiToken: string | null = null;

    if (spotifyClientId && spotifyClientSecret) {
      const authResp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      if (authResp.ok) {
        const authData = await authResp.json();
        webApiToken = authData.access_token;
      }
    }

    // Batch fetch track details to get album IDs (50 tracks per request)
    const trackIds = Array.from(trackIdToSong.keys());
    const trackToAlbum = new Map<string, string>();

    if (webApiToken && trackIds.length > 0) {
      for (let i = 0; i < trackIds.length; i += 50) {
        const batch = trackIds.slice(i, i + 50);
        const resp = await fetch(
          `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
          { headers: { Authorization: `Bearer ${webApiToken}` } },
        );
        if (resp.ok) {
          const data = await resp.json();
          for (const track of data.tracks ?? []) {
            if (track?.album?.id) {
              trackToAlbum.set(track.id, track.album.id);
              const existing = albumSongs.get(track.album.id) ?? [];
              const song = trackIdToSong.get(track.id);
              if (song) existing.push(song);
              albumSongs.set(track.album.id, existing);
            }
          }
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // 3. Query Partner API for each album
    const results: Array<{
      slug: string;
      title: string;
      spotify_plays: number;
      estimated_total: number;
      status: string;
      error?: string;
    }> = [];

    const processedSlugs = new Set<string>();

    for (const [albumId] of albumSongs) {
      try {
        const albumTracks = await fetchAlbumPlayCounts(albumId, token, client_token);

        for (const aTrack of albumTracks) {
          const trackId = aTrack.uri?.replace('spotify:track:', '');
          const song = trackIdToSong.get(trackId);
          if (!song || processedSlugs.has(song.slug)) continue;
          processedSlugs.add(song.slug);

          const spotifyPlays = parseInt(aTrack.playcount, 10) || 0;
          const estimatedTotal = spotifyPlays > 0 ? Math.round(spotifyPlays / 0.60) : 0;

          if (!dry_run) {
            await notion.pages.update({
              page_id: song.pageId,
              properties: {
                'Total Streams': { number: estimatedTotal },
              } as Parameters<typeof notion.pages.update>[0]['properties'],
            });
          }

          results.push({
            slug: song.slug,
            title: song.title,
            spotify_plays: spotifyPlays,
            estimated_total: estimatedTotal,
            status: dry_run ? 'dry_run' : 'updated',
          });
        }
      } catch (err) {
        results.push({
          slug: albumId,
          title: `Album ${albumId}`,
          spotify_plays: 0,
          estimated_total: 0,
          status: 'error',
          error: (err as Error).message,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (!dry_run) {
      invalidateCache('songs');
      invalidateCache('song-basic');
      invalidateCache('song-detail');
    }

    results.sort((a, b) => b.spotify_plays - a.spotify_plays);
    const totalSpotify = results.reduce((s, r) => s + r.spotify_plays, 0);

    return NextResponse.json({
      total_songs: results.length,
      total_spotify_plays: totalSpotify,
      estimated_total_streams: Math.round(totalSpotify / 0.60),
      albums_queried: albumSongs.size,
      dry_run,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Spotify playcount sync failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}
