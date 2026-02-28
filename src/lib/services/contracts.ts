import { NOTION_DBS } from '@/config/notion';
import {
  queryAll,
  getCached,
  CONTRACT_TTL,
  getText,
  getSelect,
  getDate,
} from '@/lib/clients/notion';
import type { ContractSummary } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function mapPageToContract(page: PageObjectResponse): ContractSummary {
  const p = page.properties;

  return {
    id: page.id,
    document_name: getText(p['Document Name']) ?? getText(p['Name']) ?? '',
    type: getSelect(p['Type']),
    parties: getText(p['Parties']) ?? getText(p['Parties Involved']),
    date_signed: getDate(p['Date Signed']),
    expiration: getDate(p['Expiration']),
    status: getSelect(p['Status']),
    key_terms: getText(p['Key Terms']),
  };
}

export async function fetchContracts(
  status?: string,
  type?: string,
): Promise<ContractSummary[]> {
  const cacheKey = `contracts:${status ?? 'all'}:${type ?? 'all'}`;
  return getCached(cacheKey, CONTRACT_TTL, async () => {
    const filters = [];
    if (status) filters.push({ property: 'Status', select: { equals: status } });
    if (type) filters.push({ property: 'Type', select: { equals: type } });

    const pages = await queryAll(
      NOTION_DBS.CONTRACTS,
      filters.length > 0 ? { and: filters } : undefined,
    );
    return pages.map(mapPageToContract);
  });
}
