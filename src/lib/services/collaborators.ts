import { NOTION_DBS } from '@/config/notion';
import {
  queryAll,
  getCached,
  COLLAB_TTL,
  getText,
  getSelect,
  getMultiSelect,
  getEmail,
  getPhone,
  getRelationIds,
} from '@/lib/clients/notion';
import type { CollaboratorDetail, SongSummary } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { toSlug, fetchAllSongs } from '@/lib/services/songs';
import { estimateRevenue } from '@/lib/services/revenue';

interface RawCollaborator extends CollaboratorDetail {
  _songRelationIds: string[];
}

function mapPageToRawCollaborator(page: PageObjectResponse): RawCollaborator {
  const p = page.properties;
  const name = getText(p['Name']) ?? '';
  const relationIds = getRelationIds(p['Songs'] ?? p['Song Catalog']);

  return {
    id: page.id,
    name,
    slug: toSlug(name),
    roles: getMultiSelect(p['Role']),
    pro_affiliation: getSelect(p['PRO Affiliation']) ?? getText(p['PRO Affiliation']),
    ipi_number: getText(p['IPI Number']),
    email: getEmail(p['Email']),
    phone: getPhone(p['Phone']),
    agreement_status: getSelect(p['Agreement Status']),
    song_count: relationIds.length,
    total_streams: 0,
    estimated_revenue: 0,
    songs: [],
    _songRelationIds: relationIds,
  };
}

export async function fetchAllCollaborators(): Promise<CollaboratorDetail[]> {
  return getCached('collaborators:all', COLLAB_TTL, async () => {
    const [pages, allSongs] = await Promise.all([
      queryAll(NOTION_DBS.COLLABORATORS),
      fetchAllSongs('all'),
    ]);

    // Build lookup map from song ID to song summary
    const songMap = new Map<string, SongSummary>();
    for (const song of allSongs) {
      songMap.set(song.id, song);
    }

    const rawCollabs = pages.map(mapPageToRawCollaborator);

    // Hydrate each collaborator with stream/revenue data from linked songs
    return rawCollabs.map(({ _songRelationIds, ...collab }) => {
      const linkedSongs: SongSummary[] = [];
      for (const id of _songRelationIds) {
        const song = songMap.get(id);
        if (song) linkedSongs.push(song);
      }

      const streams = linkedSongs.reduce((sum, s) => sum + s.total_streams, 0);
      return {
        ...collab,
        song_count: _songRelationIds.length,
        total_streams: streams,
        estimated_revenue: estimateRevenue(streams),
        songs: linkedSongs.map(s => ({ title: s.title, slug: s.slug, artist: s.artist })),
      };
    });
  });
}

export async function fetchCollaboratorBySlug(slug: string): Promise<CollaboratorDetail | null> {
  const all = await fetchAllCollaborators();
  return all.find((c) => c.slug === slug) ?? null;
}
