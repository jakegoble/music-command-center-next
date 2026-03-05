import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { notion, queryAll, getText, getSelect, getUrl, getNumber, getMultiSelect, invalidateCache } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Admin endpoint to auto-sync song metadata from Spotify.
// Uses Spotify's Client Credentials flow (no user auth needed).
//
// POST /api/admin/spotify-sync
// Body: { secret: string, dry_run?: boolean }
//
// Pulls: duration, popularity score (from Spotify track data)
// Generates: mood tags (from genre + BPM heuristics)
// Note: Audio Features API was deprecated by Spotify in late 2024,
//       so BPM/key cannot be fetched from Spotify anymore.
// ---------------------------------------------------------------------------

function msToMinSec(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Generate mood tags from genre + BPM heuristics (since audio features API is dead)
function generateMoodTags(genres: string[], bpm: number | null): string[] {
  const tags: string[] = [];
  const genreSet = new Set(genres.map(g => g.toLowerCase()));

  // Genre-based moods
  if (genreSet.has('ambient') || genreSet.has('deep house')) tags.push('Chill');
  if (genreSet.has('electronic') || genreSet.has('dance')) tags.push('Energetic');
  if (genreSet.has('melodic house')) tags.push('Hypnotic');
  if (genreSet.has('indie pop') || genreSet.has('pop')) tags.push('Feel-Good');
  if (genreSet.has('alternative') || genreSet.has('alternative rock')) tags.push('Reflective');
  if (genreSet.has('folk-rock') || genreSet.has('singer/songwriter')) tags.push('Intimate');
  if (genreSet.has('rock')) tags.push('Driving');

  // BPM-based moods
  if (bpm) {
    if (bpm >= 120 && bpm <= 130 && (genreSet.has('electronic') || genreSet.has('dance') || genreSet.has('melodic house'))) {
      tags.push('Groovy');
    }
    if (bpm < 100) tags.push('Laid-Back');
    if (bpm >= 130) tags.push('Upbeat');
  }

  // Deduplicate and limit to 4
  return [...new Set(tags)].slice(0, 4);
}

interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  artists: { name: string }[];
  external_ids?: { isrc?: string };
}

interface NotionSong {
  pageId: string;
  slug: string;
  title: string;
  artist: string;
  isrc: string | null;
  spotifyLink: string | null;
  bpm: number | null;
  key: string | null;
  duration: string | null;
  popularityScore: number | null;
  genres: string[];
  moods: string[];
}

// ---------------------------------------------------------------------------
// Spotify API helpers
// ---------------------------------------------------------------------------

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

async function searchSpotifyByISRC(token: string, isrc: string): Promise<SpotifyTrack | null> {
  const resp = await fetch(
    `https://api.spotify.com/v1/search?q=isrc:${encodeURIComponent(isrc)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.tracks?.items?.[0] ?? null;
}

async function searchSpotifyByTitle(token: string, title: string, artist: string): Promise<SpotifyTrack | null> {
  // Strip parenthetical remix/feat info for cleaner search
  const cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const query = `track:${cleanTitle} artist:${artist}`;
  const resp = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  const results = data?.tracks?.items as SpotifyTrack[] | undefined;
  if (!results?.length) return null;

  // Find best match — prefer exact title match
  const titleLower = title.toLowerCase();
  const artistLower = artist.toLowerCase();
  return results.find(r => {
    const rTitle = r.name.toLowerCase();
    const rArtists = r.artists.map(a => a.name.toLowerCase()).join(' ');
    return (rTitle === titleLower || rTitle.includes(titleLower) || titleLower.includes(rTitle))
      && (rArtists.includes(artistLower) || artistLower.includes(rArtists.split(',')[0]));
  }) ?? null;
}

// Extract Spotify track ID from a Spotify URL, then fetch full track data
async function fetchTrackById(token: string, trackId: string): Promise<SpotifyTrack | null> {
  const resp = await fetch(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) return null;
  return resp.json();
}

function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/\/track\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, dry_run = false } = body as { secret?: string; dry_run?: boolean };

    // Auth check
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET not configured' }, { status: 500 });
    }

    // 1. Get Spotify access token
    const token = await getSpotifyToken(clientId, clientSecret);

    // 2. Fetch all songs from Notion
    const pages = await queryAll(NOTION_DBS.SONG_CATALOG);
    const songs: NotionSong[] = pages.map(page => {
      const p = page.properties;
      const title = getText(p['Song Title']) ?? '';
      return {
        pageId: page.id,
        slug: toSlug(title),
        title,
        artist: getSelect(p['Artist']) ?? '',
        isrc: getText(p['ISRC']),
        spotifyLink: getUrl(p['Spotify Link']),
        bpm: getNumber(p['BPM']),
        key: (getSelect(p['Key']) ?? getText(p['Key'])) || null,
        duration: getText(p['Duration']),
        popularityScore: getNumber(p['Popularity Score']),
        genres: getMultiSelect(p['Genre']),
        moods: getMultiSelect(p['Mood Tags']),
      };
    });

    // 3. Match each song to a Spotify track
    interface MatchedSong { song: NotionSong; track: SpotifyTrack }
    const matches: MatchedSong[] = [];
    const notFound: string[] = [];

    for (const song of songs) {
      // Skip if already has duration + popularity + mood tags
      if (song.duration && song.popularityScore !== null && song.moods.length > 0) continue;

      let track: SpotifyTrack | null = null;

      // Try extracting from existing Spotify link first
      if (song.spotifyLink) {
        const trackId = extractSpotifyTrackId(song.spotifyLink);
        if (trackId) track = await fetchTrackById(token, trackId);
      }

      // If no track from link, search by ISRC
      if (!track && song.isrc) {
        track = await searchSpotifyByISRC(token, song.isrc);
      }

      // Fallback: search by title + artist
      if (!track && song.title && song.artist) {
        track = await searchSpotifyByTitle(token, song.title, song.artist);
      }

      if (track) {
        matches.push({ song, track });
      } else {
        notFound.push(song.title);
      }

      // Small delay between searches to stay under rate limits
      await new Promise(r => setTimeout(r, 100));
    }

    // 4. Build updates from matched tracks
    interface SyncUpdate {
      slug: string;
      title: string;
      pageId: string;
      fields: Record<string, unknown>;
      fieldsUpdated: string[];
    }

    const updates: SyncUpdate[] = [];

    for (const { song, track } of matches) {
      const fields: Record<string, unknown> = {};
      const fieldsUpdated: string[] = [];

      // Duration — only update if missing
      if (!song.duration && track.duration_ms > 0) {
        fields.duration = msToMinSec(track.duration_ms);
        fieldsUpdated.push('duration');
      }

      // Popularity — always update (changes frequently)
      fields.popularity_score = track.popularity;
      fieldsUpdated.push('popularity');

      // Mood tags — only if missing
      if (song.moods.length === 0) {
        const moods = generateMoodTags(song.genres, song.bpm);
        if (moods.length > 0) {
          fields.mood = moods;
          fieldsUpdated.push('mood');
        }
      }

      if (fieldsUpdated.length > 0) {
        updates.push({ slug: song.slug, title: song.title, pageId: song.pageId, fields, fieldsUpdated });
      }
    }

    // 5. Apply updates to Notion (unless dry_run)
    const results: Array<{ slug: string; title: string; status: string; fields: string[]; details?: Record<string, unknown>; error?: string }> = [];

    if (!dry_run) {
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        try {
          const properties: Record<string, unknown> = {};

          if (update.fields.duration !== undefined) {
            properties['Duration'] = { rich_text: [{ text: { content: String(update.fields.duration) } }] };
          }
          if (update.fields.popularity_score !== undefined) {
            properties['Popularity Score'] = { number: Number(update.fields.popularity_score) };
          }
          if (update.fields.mood !== undefined) {
            const tags = update.fields.mood as string[];
            properties['Mood Tags'] = { multi_select: tags.map(t => ({ name: t })) };
          }

          await notion.pages.update({
            page_id: update.pageId,
            properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
          });
          results.push({ slug: update.slug, title: update.title, status: 'updated', fields: update.fieldsUpdated });
        } catch (err) {
          results.push({ slug: update.slug, title: update.title, status: 'error', fields: update.fieldsUpdated, error: (err as Error).message });
        }

        // Rate limit: 3 req/s for Notion
        if (i % 3 === 2) await new Promise(r => setTimeout(r, 400));
      }

      // Invalidate caches
      invalidateCache('songs');
      invalidateCache('song-basic');
    } else {
      // Dry run — report what would be updated with details
      for (const update of updates) {
        results.push({
          slug: update.slug,
          title: update.title,
          status: 'dry_run',
          fields: update.fieldsUpdated,
          details: update.fields,
        });
      }
    }

    const updated = results.filter(r => r.status === 'updated').length;
    return NextResponse.json({
      matched: matches.length,
      not_found: notFound,
      updated,
      total_updates: updates.length,
      dry_run,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Spotify sync failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}
