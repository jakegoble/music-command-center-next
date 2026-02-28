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
import type { CollaboratorDetail } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { toSlug } from '@/lib/services/songs';

function mapPageToCollaborator(page: PageObjectResponse): CollaboratorDetail {
  const p = page.properties;
  const name = getText(p['Name']) ?? '';

  return {
    id: page.id,
    name,
    slug: toSlug(name),
    roles: getMultiSelect(p['Roles']) ?? getMultiSelect(p['Role']),
    pro_affiliation: getSelect(p['PRO Affiliation']) ?? getText(p['PRO Affiliation']),
    ipi_number: getText(p['IPI Number']),
    email: getEmail(p['Email']),
    phone: getPhone(p['Phone']),
    agreement_status: getSelect(p['Agreement Status']),
    song_count: getRelationIds(p['Songs'] ?? p['Song Catalog']).length,
    total_streams: 0, // Calculated after hydration
    estimated_revenue: 0,
    songs: [],
  };
}

export async function fetchAllCollaborators(): Promise<CollaboratorDetail[]> {
  return getCached('collaborators:all', COLLAB_TTL, async () => {
    const pages = await queryAll(NOTION_DBS.COLLABORATORS);
    return pages.map(mapPageToCollaborator);
  });
}

export async function fetchCollaboratorBySlug(slug: string): Promise<CollaboratorDetail | null> {
  const all = await fetchAllCollaborators();
  return all.find((c) => c.slug === slug) ?? null;
}
