import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from '@notionhq/client/build/src/api-endpoints';

if (!process.env.NOTION_TOKEN) {
  console.warn('NOTION_TOKEN not set — Notion API calls will fail');
}

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.data as T);
  return fetcher().then((data) => {
    cache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// TTLs
export const SONG_TTL = 5 * 60 * 1000; // 5 minutes
export const COLLAB_TTL = 15 * 60 * 1000; // 15 minutes
export const CONTRACT_TTL = 15 * 60 * 1000; // 15 minutes
export const ROYALTY_TTL = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Pagination helper — Notion SDK v5 uses dataSources.query
// ---------------------------------------------------------------------------

export async function queryAll(
  dataSourceId: string,
  filter?: QueryDataSourceParameters['filter'],
  sorts?: QueryDataSourceParameters['sorts'],
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter,
      sorts,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const result of response.results) {
      if ('properties' in result) {
        pages.push(result as PageObjectResponse);
      }
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

// ---------------------------------------------------------------------------
// Property extraction helpers
// ---------------------------------------------------------------------------

type Props = PageObjectResponse['properties'];
type PropValue = Props[string];

export function getText(prop: PropValue | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'title') {
    return prop.title.map((t) => t.plain_text).join('') || null;
  }
  if (prop.type === 'rich_text') {
    return prop.rich_text.map((t) => t.plain_text).join('') || null;
  }
  return null;
}

export function getNumber(prop: PropValue | undefined): number | null {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

export function getSelect(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== 'select') return null;
  return prop.select?.name ?? null;
}

export function getMultiSelect(prop: PropValue | undefined): string[] {
  if (!prop || prop.type !== 'multi_select') return [];
  return prop.multi_select.map((s) => s.name);
}

export function getCheckbox(prop: PropValue | undefined): boolean {
  if (!prop || prop.type !== 'checkbox') return false;
  return prop.checkbox;
}

export function getDate(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== 'date') return null;
  return prop.date?.start ?? null;
}

export function getUrl(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== 'url') return null;
  return prop.url;
}

export function getEmail(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== 'email') return null;
  return prop.email;
}

export function getPhone(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== 'phone_number') return null;
  return prop.phone_number;
}

export function getRelationIds(prop: PropValue | undefined): string[] {
  if (!prop || prop.type !== 'relation') return [];
  return prop.relation.map((r) => r.id);
}

export function getRollupNumber(prop: PropValue | undefined): number | null {
  if (!prop || prop.type !== 'rollup') return null;
  if (prop.rollup.type === 'number') return prop.rollup.number;
  return null;
}

export function getFormula(prop: PropValue | undefined): string | number | boolean | null {
  if (!prop || prop.type !== 'formula') return null;
  const f = prop.formula;
  if (f.type === 'string') return f.string;
  if (f.type === 'number') return f.number;
  if (f.type === 'boolean') return f.boolean;
  return null;
}
