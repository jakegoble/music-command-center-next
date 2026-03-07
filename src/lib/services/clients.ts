import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NOTION_DBS } from '@/config/notion';
import {
  getCached,
  queryAll,
  getText,
  getSelect,
  getMultiSelect,
  getNumber,
  getEmail,
  getPhone,
  getUrl,
} from '@/lib/clients/notion';
import type { ClientSummary } from '@/lib/types';

export const CLIENT_TTL = 10 * 60 * 1000; // 10 minutes

function mapPageToClient(page: PageObjectResponse): ClientSummary {
  const p = page.properties;
  return {
    id: page.id,
    company_name: getText(p['Company Name']) ?? 'Untitled',
    industry: getSelect(p['Industry']),
    company_size: getSelect(p['Company Size']),
    type: getMultiSelect(p['Type']),
    relationship_status: getSelect(p['Relationship Status']),
    warmth: getSelect(p['Warmth']),
    priority: getSelect(p['Priority']),
    fit_score: getSelect(p['Fit Score']),
    estimated_budget: getSelect(p['Estimated Budget']),
    pitch_type: getSelect(p['Pitch Type']),
    how_originated: getSelect(p['How Originated']),
    would_repeat: getSelect(p['Would They Do Another Deal?']),
    deal_value: getNumber(p['Deal Value']),
    key_contact_name: getText(p['Key Contact Name']),
    contact_title: getText(p['Contact Title']),
    contact_email: getEmail(p['Contact Email']),
    contact_phone: getPhone(p['Contact Phone']),
    hq_location: getText(p['HQ Location']),
    website: getUrl(p['Website']),
    what_we_did: getText(p['What We Did']),
    when: getText(p['When']),
    how_it_went: getText(p['How It Went']),
    notes: getText(p['Notes']),
    venue_used: getText(p['Venue Used']),
    referral_potential: getText(p['Referral Potential']),
    other_contacts: getText(p['Other Contacts']),
  };
}

export async function fetchClients(
  status?: string,
  warmth?: string,
  industry?: string,
): Promise<ClientSummary[]> {
  const cacheKey = `clients:${status ?? 'all'}:${warmth ?? 'all'}:${industry ?? 'all'}`;
  return getCached(cacheKey, CLIENT_TTL, async () => {
    const conditions: Array<{ property: string; select: { equals: string } }> = [];
    if (status) conditions.push({ property: 'Relationship Status', select: { equals: status } });
    if (warmth) conditions.push({ property: 'Warmth', select: { equals: warmth } });
    if (industry) conditions.push({ property: 'Industry', select: { equals: industry } });

    const filter = conditions.length > 0
      ? { and: conditions }
      : undefined;

    const pages = await queryAll(NOTION_DBS.CLIENT_HISTORY, filter);
    return pages.map(mapPageToClient);
  });
}
