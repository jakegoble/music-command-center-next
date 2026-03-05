import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { notion, queryAll, getText, getSelect, getUrl, getNumber, invalidateCache } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Admin endpoint to auto-sync song metadata from Deezer (free, no auth).
//
// POST /api/admin/deezer-sync
// Body: { secret: string, dry_run?: boolean }
//
// Pulls: ISRC, duration (when missing)
// Matches by: ISRC → title+artist fuzzy search
// ---------------------------------------------------------------------------

const DEEZER_ARTIST_IDS: Record<string, number> = {
  Jakke: 198605217,
  Enjune: 58537372,
};

interface DeezerTrack {
  id: number;
  title: string;
  isrc: string;
  duration: number; // seconds
  bpm: number;
  preview: string;
  artist: { id: number; name: string };
  album: { id: number; title: string };
}

interface NotionSong {
  pageId: string;
  slug: string;
  title: string;
  artist: string;
  isrc: string | null;
  duration: string | null;
  bpm: number | null;
}

// ---------------------------------------------------------------------------
// Deezer API helpers
// ---------------------------------------------------------------------------

async function deezerFetch<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'MusicCommandCenter/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Deezer API error: ${resp.status}`);
  return resp.json();
}

async function fetchArtistCatalog(artistId: number): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = [];
  const seenIsrcs = new Set<string>();

  // Get all albums
  const albums = await deezerFetch<{ data: Array<{ id: number; title: string }> }>(
    `https://api.deezer.com/artist/${artistId}/albums?limit=100`,
  );

  for (const album of albums.data) {
    await new Promise(r => setTimeout(r, 250)); // rate limit
    try {
      const albumTracks = await deezerFetch<{ data: Array<{ id: number; title: string }> }>(
        `https://api.deezer.com/album/${album.id}/tracks?limit=100`,
      );

      for (const t of albumTracks.data) {
        await new Promise(r => setTimeout(r, 200));
        try {
          const detail = await deezerFetch<DeezerTrack>(
            `https://api.deezer.com/track/${t.id}`,
          );
          // Dedupe by ISRC
          if (detail.isrc && !seenIsrcs.has(detail.isrc)) {
            seenIsrcs.add(detail.isrc);
            tracks.push(detail);
          }
        } catch { /* skip individual track errors */ }
      }
    } catch { /* skip album errors */ }
  }

  return tracks;
}

async function searchDeezerTrack(title: string, artist: string): Promise<DeezerTrack | null> {
  try {
    const query = `${artist} ${title}`;
    const data = await deezerFetch<{ data: Array<{ id: number; title: string; artist: { name: string } }> }>(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`,
    );
    if (!data.data?.length) return null;

    const titleLower = title.toLowerCase();
    const artistLower = artist.toLowerCase();

    for (const result of data.data) {
      const rTitle = result.title.toLowerCase();
      const rArtist = result.artist.name.toLowerCase();
      if ((rTitle.includes(titleLower) || titleLower.includes(rTitle)) &&
          (rArtist.includes(artistLower) || artistLower.includes(rArtist))) {
        // Fetch full track details for ISRC
        return await deezerFetch<DeezerTrack>(`https://api.deezer.com/track/${result.id}`);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function secToMinSec(sec: number): string {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Match Notion songs to Deezer tracks
// ---------------------------------------------------------------------------

function matchSongToTrack(song: NotionSong, tracks: DeezerTrack[]): DeezerTrack | null {
  // Match by ISRC first
  if (song.isrc) {
    const match = tracks.find(t => t.isrc === song.isrc);
    if (match) return match;
  }

  // Fuzzy title+artist match
  const titleLower = song.title.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
  return tracks.find(t => {
    const dTitle = t.title.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
    return dTitle === titleLower || dTitle.includes(titleLower) || titleLower.includes(dTitle);
  }) ?? null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, dry_run = false } = body as { secret?: string; dry_run?: boolean };

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all songs from Notion
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
        duration: getText(p['Duration']),
        bpm: getNumber(p['BPM']),
      };
    });

    // 2. Fetch Deezer catalogs for known artists
    const allDeezerTracks: DeezerTrack[] = [];
    const catalogStatus: Record<string, number> = {};

    for (const [artist, artistId] of Object.entries(DEEZER_ARTIST_IDS)) {
      const tracks = await fetchArtistCatalog(artistId);
      allDeezerTracks.push(...tracks);
      catalogStatus[artist] = tracks.length;
    }

    // 3. Match songs and build updates
    interface SyncUpdate {
      slug: string;
      title: string;
      pageId: string;
      fields: Record<string, unknown>;
      fieldsUpdated: string[];
      deezerTrack: string;
    }

    const updates: SyncUpdate[] = [];
    const matched: string[] = [];
    const notFound: string[] = [];

    for (const song of songs) {
      // Try catalog match first, then search API
      let track = matchSongToTrack(song, allDeezerTracks);
      if (!track && song.title && song.artist) {
        await new Promise(r => setTimeout(r, 300));
        track = await searchDeezerTrack(song.title, song.artist);
      }

      if (!track) {
        notFound.push(song.title);
        continue;
      }

      matched.push(song.title);
      const fields: Record<string, unknown> = {};
      const fieldsUpdated: string[] = [];

      // ISRC — fill if missing
      if (!song.isrc && track.isrc) {
        fields.isrc = track.isrc;
        fieldsUpdated.push('isrc');
      }

      // Duration — fill if missing
      if (!song.duration && track.duration > 0) {
        fields.duration = secToMinSec(track.duration);
        fieldsUpdated.push('duration');
      }

      if (fieldsUpdated.length > 0) {
        updates.push({
          slug: song.slug,
          title: song.title,
          pageId: song.pageId,
          fields,
          fieldsUpdated,
          deezerTrack: `${track.title} (${track.isrc})`,
        });
      }
    }

    // 4. Apply updates
    const results: Array<{ slug: string; title: string; status: string; fields: string[]; deezerMatch?: string; error?: string }> = [];

    if (!dry_run) {
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        try {
          const properties: Record<string, unknown> = {};

          if (update.fields.isrc !== undefined) {
            properties['ISRC'] = { rich_text: [{ text: { content: String(update.fields.isrc) } }] };
          }
          if (update.fields.duration !== undefined) {
            properties['Duration'] = { rich_text: [{ text: { content: String(update.fields.duration) } }] };
          }

          await notion.pages.update({
            page_id: update.pageId,
            properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
          });
          results.push({ slug: update.slug, title: update.title, status: 'updated', fields: update.fieldsUpdated, deezerMatch: update.deezerTrack });
        } catch (err) {
          results.push({ slug: update.slug, title: update.title, status: 'error', fields: update.fieldsUpdated, error: (err as Error).message });
        }

        if (i % 3 === 2) await new Promise(r => setTimeout(r, 400));
      }

      invalidateCache('songs');
      invalidateCache('song-basic');
    } else {
      for (const update of updates) {
        results.push({
          slug: update.slug,
          title: update.title,
          status: 'dry_run',
          fields: update.fieldsUpdated,
          deezerMatch: update.deezerTrack,
        });
      }
    }

    return NextResponse.json({
      deezer_catalogs: catalogStatus,
      matched: matched.length,
      not_found: notFound,
      updates_applied: results.filter(r => r.status === 'updated').length,
      total_updates: updates.length,
      dry_run,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Deezer sync failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}
