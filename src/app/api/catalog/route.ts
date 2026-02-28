import { NextRequest, NextResponse } from 'next/server';
import { parseArtistParam } from '@/config/notion';
import { fetchAllSongs, deduplicateSongs } from '@/lib/services/songs';
import type { CatalogResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse artist filter
    const artist = parseArtistParam(searchParams.get('artist'));

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));

    // Parse sort
    const sort = searchParams.get('sort') ?? 'release_date';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Parse filters
    const status = searchParams.get('status');
    const genre = searchParams.get('genre');
    const mood = searchParams.get('mood');
    const key = searchParams.get('key');
    const bpmMin = searchParams.get('bpm_min') ? parseInt(searchParams.get('bpm_min')!) : null;
    const bpmMax = searchParams.get('bpm_max') ? parseInt(searchParams.get('bpm_max')!) : null;
    const distributor = searchParams.get('distributor');
    const syncAvailable = searchParams.get('sync_available');
    const atmos = searchParams.get('atmos');
    const hasStems = searchParams.get('has_stems');
    const yearMin = searchParams.get('year_min') ? parseInt(searchParams.get('year_min')!) : null;
    const yearMax = searchParams.get('year_max') ? parseInt(searchParams.get('year_max')!) : null;
    const search = searchParams.get('search')?.toLowerCase();
    const albumEp = searchParams.get('album_ep');

    // Fetch all songs for this artist (Notion-level artist filter applied)
    const allSongs = await fetchAllSongs(artist);

    // Deduplicate
    const { songs: dedupedSongs } = deduplicateSongs(allSongs);

    // Apply additional filters in-memory
    let filtered = dedupedSongs;

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      filtered = filtered.filter((s) => statuses.includes(s.status));
    }

    if (genre) {
      const genres = genre.split(',').map((g) => g.trim());
      filtered = filtered.filter((s) => s.genre.some((g) => genres.includes(g)));
    }

    if (mood) {
      const moods = mood.split(',').map((m) => m.trim());
      filtered = filtered.filter((s) => s.mood.some((m) => moods.includes(m)));
    }

    if (key) {
      filtered = filtered.filter((s) => s.key === key);
    }

    if (bpmMin !== null) {
      filtered = filtered.filter((s) => s.bpm !== null && s.bpm >= bpmMin);
    }

    if (bpmMax !== null) {
      filtered = filtered.filter((s) => s.bpm !== null && s.bpm <= bpmMax);
    }

    if (distributor) {
      filtered = filtered.filter((s) => s.distributor === distributor);
    }

    if (syncAvailable === 'true') {
      filtered = filtered.filter((s) => s.sync_available);
    } else if (syncAvailable === 'false') {
      filtered = filtered.filter((s) => !s.sync_available);
    }

    if (atmos === 'true') {
      filtered = filtered.filter((s) => s.atmos_mix);
    } else if (atmos === 'false') {
      filtered = filtered.filter((s) => !s.atmos_mix);
    }

    if (hasStems === 'true') {
      filtered = filtered.filter((s) => s.stems_complete);
    } else if (hasStems === 'false') {
      filtered = filtered.filter((s) => !s.stems_complete);
    }

    if (yearMin !== null || yearMax !== null) {
      filtered = filtered.filter((s) => {
        if (!s.release_date) return false;
        const year = new Date(s.release_date).getFullYear();
        if (yearMin !== null && year < yearMin) return false;
        if (yearMax !== null && year > yearMax) return false;
        return true;
      });
    }

    if (albumEp) {
      filtered = filtered.filter((s) => s.album_ep === albumEp);
    }

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(search) ||
          s.artist.toLowerCase().includes(search) ||
          s.genre.some((g) => g.toLowerCase().includes(search)) ||
          (s.distributor?.toLowerCase().includes(search) ?? false),
      );
    }

    // Sort (whitelist to prevent sorting on array fields)
    const SORTABLE = new Set([
      'title', 'artist', 'status', 'bpm', 'key', 'release_date',
      'total_streams', 'popularity_score', 'distributor', 'estimated_revenue',
      'album_ep', 'sync_tier', 'duration',
    ]);
    const validSort = SORTABLE.has(sort) ? sort : 'release_date';

    filtered.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[validSort];
      const bVal = (b as unknown as Record<string, unknown>)[validSort];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return order === 'desc' ? -cmp : cmp;
    });

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const response: CatalogResponse = {
      songs: paginated,
      total,
      page,
      limit,
      has_more: start + limit < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[/api/catalog] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog', details: String(error) },
      { status: 500 },
    );
  }
}
