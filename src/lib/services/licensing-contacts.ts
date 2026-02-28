import { NOTION_DBS } from '@/config/notion';
import {
  queryAll,
  getCached,
  CONTRACT_TTL,
  getText,
  getSelect,
  getMultiSelect,
  getDate,
} from '@/lib/clients/notion';
import type { LicensingContactSummary } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function mapPageToContact(page: PageObjectResponse): LicensingContactSummary {
  const p = page.properties;

  return {
    id: page.id,
    company: getText(p['Company']) ?? getText(p['Name']) ?? '',
    contact_name: getText(p['Contact Name']),
    status: getSelect(p['Status']),
    last_contact: getDate(p['Last Contact']),
    genre_focus: getMultiSelect(p['Genre Focus']),
  };
}

export async function fetchLicensingContacts(
  status?: string,
  genreFocus?: string,
): Promise<LicensingContactSummary[]> {
  const cacheKey = `licensing-contacts:${status ?? 'all'}:${genreFocus ?? 'all'}`;
  return getCached(cacheKey, CONTRACT_TTL, async () => {
    const filters = [];
    if (status) filters.push({ property: 'Status', select: { equals: status } });
    if (genreFocus) {
      filters.push({ property: 'Genre Focus', multi_select: { contains: genreFocus } });
    }

    const pages = await queryAll(
      NOTION_DBS.LICENSING_CONTACTS,
      filters.length > 0 ? { and: filters } : undefined,
    );
    return pages.map(mapPageToContact);
  });
}
