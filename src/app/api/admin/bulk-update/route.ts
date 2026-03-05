import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DBS } from '@/config/notion';
import { notion, queryAll, getText, invalidateCache } from '@/lib/clients/notion';
import { toSlug } from '@/lib/utils/slug';

// ---------------------------------------------------------------------------
// Admin endpoint to bulk-update song properties in Notion.
// Protected by a shared secret (ADMIN_SECRET env var).
//
// POST /api/admin/bulk-update
// Body: { secret: string, updates: Array<{ slug: string, fields: Record<string, any> }> }
//
// Supported fields: bpm (number), key (rich_text), total_streams (number),
//                   spotify_link (url), apple_music_link (url),
//                   duration (rich_text), popularity_score (number),
//                   mood (multi_select — array of strings)
// ---------------------------------------------------------------------------

const FIELD_MAP: Record<string, { prop: string; type: 'number' | 'select' | 'rich_text' | 'url' | 'multi_select' }> = {
  bpm: { prop: 'BPM', type: 'number' },
  key: { prop: 'Key', type: 'rich_text' },
  total_streams: { prop: 'Total Streams', type: 'number' },
  spotify_link: { prop: 'Spotify Link', type: 'url' },
  apple_music_link: { prop: 'Apple Music Link', type: 'url' },
  duration: { prop: 'Duration', type: 'rich_text' },
  popularity_score: { prop: 'Popularity Score', type: 'number' },
  mood: { prop: 'Mood Tags', type: 'multi_select' },
};

function buildProperties(fields: Record<string, unknown>) {
  const properties: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(fields)) {
    const mapping = FIELD_MAP[field];
    if (!mapping || value === undefined || value === null) continue;
    if (mapping.type === 'number') {
      properties[mapping.prop] = { number: Number(value) };
    } else if (mapping.type === 'select') {
      properties[mapping.prop] = { select: { name: String(value) } };
    } else if (mapping.type === 'rich_text') {
      properties[mapping.prop] = { rich_text: [{ text: { content: String(value) } }] };
    } else if (mapping.type === 'url') {
      properties[mapping.prop] = { url: String(value) };
    } else if (mapping.type === 'multi_select') {
      const tags = Array.isArray(value) ? value : [value];
      properties[mapping.prop] = { multi_select: tags.map(t => ({ name: String(t) })) };
    }
  }
  return properties;
}

interface UpdateItem {
  slug: string;
  fields: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, updates } = body as { secret?: string; updates?: UpdateItem[] };

    // Auth check
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 });
    }
    if (secret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Fetch all song pages to resolve slugs → page IDs
    const pages = await queryAll(NOTION_DBS.SONG_CATALOG);
    const slugToPage = new Map<string, string>();
    for (const page of pages) {
      const title = getText(page.properties['Song Title']) ?? '';
      slugToPage.set(toSlug(title), page.id);
    }

    const results: Array<{ slug: string; status: string; error?: string }> = [];

    // Process updates (Notion rate limit ~3 req/s)
    for (let i = 0; i < updates.length; i++) {
      const { slug, fields } = updates[i];
      const pageId = slugToPage.get(slug);
      if (!pageId) {
        results.push({ slug, status: 'not_found' });
        continue;
      }

      // Special: archive (soft-delete) the page
      if (fields._archive === true) {
        try {
          await notion.pages.update({ page_id: pageId, archived: true });
          results.push({ slug, status: 'archived' });
        } catch (err) {
          results.push({ slug, status: 'error', error: (err as Error).message });
        }
        if (i % 3 === 2) await new Promise(r => setTimeout(r, 400));
        continue;
      }

      const properties = buildProperties(fields);
      if (Object.keys(properties).length === 0) {
        results.push({ slug, status: 'no_valid_fields' });
        continue;
      }
      try {
        await notion.pages.update({ page_id: pageId, properties: properties as Parameters<typeof notion.pages.update>[0]['properties'] });
        results.push({ slug, status: 'updated' });
      } catch (err) {
        results.push({ slug, status: 'error', error: (err as Error).message });
      }
      // Small delay to stay under rate limits
      if (i % 3 === 2) await new Promise(r => setTimeout(r, 400));
    }

    // Invalidate song cache so changes are visible immediately
    invalidateCache('songs');
    invalidateCache('song-basic');

    const updated = results.filter(r => r.status === 'updated').length;
    return NextResponse.json({ updated, total: updates.length, results });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to process updates', details: (err as Error).message },
      { status: 500 },
    );
  }
}
