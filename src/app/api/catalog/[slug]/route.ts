import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import {
  notion,
  queryAll,
  getCached,
  SONG_TTL,
  getText,
  getNumber,
  getSelect,
  getMultiSelect,
  getCheckbox,
  getDate,
  getUrl,
  getRelationIds,
} from '@/lib/clients/notion';
import { estimateRevenue, parseWriterSplits } from '@/lib/services/revenue';
import { toSlug } from '@/lib/services/songs';
import type { SongDetail, CollaboratorSummary, ContractSummary, LicensingContactSummary, RoyaltyEntry } from '@/lib/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

async function fetchRelatedPage(pageId: string): Promise<PageObjectResponse | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if ('properties' in page) return page as PageObjectResponse;
    return null;
  } catch {
    return null;
  }
}

function mapCollaborator(page: PageObjectResponse): CollaboratorSummary {
  const p = page.properties;
  const name = getText(p['Name']) ?? '';
  return {
    id: page.id,
    name,
    slug: toSlug(name),
    roles: getMultiSelect(p['Roles']) ?? getMultiSelect(p['Role']),
    pro_affiliation: getSelect(p['PRO Affiliation']) ?? getText(p['PRO Affiliation']),
    ipi_number: getText(p['IPI Number']),
    agreement_status: getSelect(p['Agreement Status']),
    song_count: getRelationIds(p['Songs'] ?? p['Song Catalog']).length,
  };
}

function mapContract(page: PageObjectResponse): ContractSummary {
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

function mapLicensingContact(page: PageObjectResponse): LicensingContactSummary {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const songDetail = await getCached(`song-detail:${slug}`, SONG_TTL, async () => {
      // Fetch all songs and find by slug
      const pages = await queryAll(NOTION_DBS.SONG_CATALOG);
      const page = pages.find((p) => {
        const title = getText(p.properties['Song Title']) ?? '';
        return toSlug(title) === slug;
      });

      if (!page) return null;

      const p = page.properties;
      const title = getText(p['Song Title']) ?? '';
      const streams = getNumber(p['Total Streams']) ?? 0;
      const writerSplitsRaw = getText(p['Writer Splits']);

      // Fetch related entities in parallel
      const collabIds = getRelationIds(p['Collaborators']);
      const contractIds = getRelationIds(p['Contracts & Agreements']);
      const contactIds = getRelationIds(p['Licensing Contacts']);

      const [collabPages, contractPages, contactPages] = await Promise.all([
        Promise.all(collabIds.map(fetchRelatedPage)),
        Promise.all(contractIds.map(fetchRelatedPage)),
        Promise.all(contactIds.map(fetchRelatedPage)),
      ]);

      // Fetch royalties for this song's artist
      const artist = getSelect(p['Artist']);
      let royalties: RoyaltyEntry[] = [];
      if (artist) {
        const royaltyPages = await queryAll(NOTION_DBS.ROYALTY_TRACKING, {
          and: [{ property: 'Artist', select: { equals: artist } }],
        });
        royalties = royaltyPages.map((rp) => {
          const rProps = rp.properties;
          const ascap = getNumber(rProps['ASCAP Performance']) ?? 0;
          const dist = getNumber(rProps['Distributor Streaming']) ?? 0;
          const mlc = getNumber(rProps['MLC Mechanical']) ?? 0;
          const ppl = getNumber(rProps['PPL International']) ?? 0;
          const se = getNumber(rProps['SoundExchange Digital']) ?? 0;
          const sync = getNumber(rProps['Sync Licensing']) ?? 0;
          const yt = getNumber(rProps['YouTube/Social']) ?? 0;
          const other = getNumber(rProps['Other']) ?? 0;
          return {
            id: rp.id,
            artist: getSelect(rProps['Artist']),
            period: getText(rProps['Period']),
            quarter: getSelect(rProps['Quarter']),
            ascap_performance: getNumber(rProps['ASCAP Performance']),
            distributor_streaming: getNumber(rProps['Distributor Streaming']),
            mlc_mechanical: getNumber(rProps['MLC Mechanical']),
            ppl_international: getNumber(rProps['PPL International']),
            soundexchange_digital: getNumber(rProps['SoundExchange Digital']),
            sync_licensing: getNumber(rProps['Sync Licensing']),
            youtube_social: getNumber(rProps['YouTube/Social']),
            other: getNumber(rProps['Other']),
            total: ascap + dist + mlc + ppl + se + sync + yt + other,
          };
        });
      }

      const splits = parseWriterSplits(writerSplitsRaw);

      const detail: SongDetail = {
        id: page.id,
        slug: toSlug(title),
        title,
        artist: artist ?? '',
        status: getSelect(p['Status']) ?? '',
        genre: getMultiSelect(p['Genre']),
        mood: getMultiSelect(p['Mood Tags']),
        bpm: getNumber(p['BPM']),
        key: getSelect(p['Key']) ?? getText(p['Key']),
        duration: getText(p['Duration']),
        release_date: getDate(p['Release Date']),
        distributor: getSelect(p['Distributor']),
        total_streams: streams,
        popularity_score: getNumber(p['Popularity Score']),
        isrc: getText(p['ISRC']),
        upc: getText(p['UPC']),
        album_ep: getText(p['Album/EP']) ?? getSelect(p['Album/EP']),
        atmos_mix: getCheckbox(p['Atmos Mix']),
        stems_complete: getCheckbox(p['Stems Complete']),
        sync_available: getCheckbox(p['Available for Sync']),
        sync_tier: getSelect(p['Sync Tier']),
        artwork: getCheckbox(p['Artwork']),
        explicit: getCheckbox(p['Explicit']),
        spotify_link: getUrl(p['Spotify Link']),
        apple_music_link: getUrl(p['Apple Music Link']),
        youtube_link: getUrl(p['YouTube Link']),
        collaborator_count: collabIds.length,
        contract_count: contractIds.length,
        estimated_revenue: estimateRevenue(streams),
        ascap_registered: getCheckbox(p['ASCAP Registered']),
        mlc_registered: getCheckbox(p['MLC Registered']),
        soundexchange_registered: getCheckbox(p['SoundExchange Registered']),
        youtube_content_id: getCheckbox(p['YouTube Content ID']),

        // Extended fields
        producers: getText(p['Producers']),
        songwriters: getText(p['Songwriters']),
        publisher: getText(p['Publisher']),
        writer_splits: writerSplitsRaw,
        writer_splits_parsed: splits.map((s) => ({
          ...s,
          ipi: null,
          pro: null,
        })),
        notes: getText(p['Notes']),
        lyrics_status: getSelect(p['Lyrics Status']) ?? getText(p['Lyrics Status']),
        similar_artists: getText(p['Similar Artists']),
        usage_scenarios: getMultiSelect(p['Usage Scenarios']),
        scene_suggestions: getText(p['Scene Suggestions']),
        songtrust_id: getText(p['Songtrust ID']),
        ppl_registered: getCheckbox(p['PPL Registered']),
        songtrust_registered: getCheckbox(p['Songtrust Registered']),
        lyricfind_submitted: getCheckbox(p['LyricFind Submitted']),
        musixmatch_submitted: getCheckbox(p['Musixmatch Submitted']),
        genius_submitted: getCheckbox(p['Genius Submitted']),
        music_gateway_submitted: getCheckbox(p['Music Gateway Submitted']),
        disco_submitted: getCheckbox(p['DISCO Submitted']),
        songtradr_submitted: getCheckbox(p['Songtradr Submitted']),
        discogs_submitted: getCheckbox(p['Discogs Submitted']),
        has_instrumental: getCheckbox(p['Has Instrumental']),
        has_acapella: getCheckbox(p['Has Acapella']),
        has_15s_edit: getCheckbox(p['Has 15s Edit']),
        has_30s_edit: getCheckbox(p['Has 30s Edit']),
        has_60s_edit: getCheckbox(p['Has 60s Edit']),
        has_360ra: getCheckbox(p['Has 360RA']),
        has_project_file: getCheckbox(p['Has Project File']),
        sync_status: getSelect(p['Sync Status']),
        sync_edit_status: getSelect(p['Sync Edit Status']),
        sync_restrictions: getText(p['Sync Restrictions']),
        disco_link: getUrl(p['DISCO Link']),
        master_ownership: getText(p['Master Ownership']),

        // Hydrated relations
        collaborators: collabPages
          .filter((cp): cp is PageObjectResponse => cp !== null)
          .map(mapCollaborator),
        contracts: contractPages
          .filter((cp): cp is PageObjectResponse => cp !== null)
          .map(mapContract),
        licensing_contacts: contactPages
          .filter((cp): cp is PageObjectResponse => cp !== null)
          .map(mapLicensingContact),
        royalties,
      };

      return detail;
    });

    if (!songDetail) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    return NextResponse.json(songDetail);
  } catch (error) {
    console.error('[/api/catalog/[slug]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch song detail', details: String(error) },
      { status: 500 },
    );
  }
}
