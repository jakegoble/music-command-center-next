import { NOTION_DBS, type ArtistFilter } from '@/config/notion';
import {
  queryAll,
  getCached,
  ROYALTY_TTL,
  getText,
  getNumber,
  getSelect,
} from '@/lib/clients/notion';
import type { RoyaltyEntry } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function mapPageToRoyalty(page: PageObjectResponse): RoyaltyEntry {
  const p = page.properties;

  const ascap = getNumber(p['ASCAP Performance']) ?? 0;
  const distributor = getNumber(p['Distributor Streaming']) ?? 0;
  const mlc = getNumber(p['MLC Mechanical']) ?? 0;
  const ppl = getNumber(p['PPL International']) ?? 0;
  const soundexchange = getNumber(p['SoundExchange Digital']) ?? 0;
  const sync = getNumber(p['Sync Licensing']) ?? 0;
  const youtube = getNumber(p['YouTube/Social']) ?? 0;
  const other = getNumber(p['Other']) ?? 0;

  return {
    id: page.id,
    artist: getSelect(p['Artist']),
    period: getText(p['Period']),
    quarter: getSelect(p['Quarter']),
    ascap_performance: getNumber(p['ASCAP Performance']),
    distributor_streaming: getNumber(p['Distributor Streaming']),
    mlc_mechanical: getNumber(p['MLC Mechanical']),
    ppl_international: getNumber(p['PPL International']),
    soundexchange_digital: getNumber(p['SoundExchange Digital']),
    sync_licensing: getNumber(p['Sync Licensing']),
    youtube_social: getNumber(p['YouTube/Social']),
    other: getNumber(p['Other']),
    total: ascap + distributor + mlc + ppl + soundexchange + sync + youtube + other,
  };
}

export async function fetchRoyalties(artist: ArtistFilter = 'all'): Promise<RoyaltyEntry[]> {
  const cacheKey = `royalties:${artist}`;
  return getCached(cacheKey, ROYALTY_TTL, async () => {
    const filters = [];
    if (artist !== 'all') {
      filters.push({ property: 'Artist', select: { equals: artist } });
    }

    const pages = await queryAll(
      NOTION_DBS.ROYALTY_TRACKING,
      filters.length > 0 ? { and: filters } : undefined,
    );
    return pages.map(mapPageToRoyalty);
  });
}
