import { NOTION_DBS } from '@/config/notion';
import {
  notion,
  queryAll,
  getCached,
  invalidateCache,
  getText,
  getSelect,
  getNumber,
  getDate,
} from '@/lib/clients/notion';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentType = 'youtube_video' | 'youtube_short' | 'instagram_reel' | 'instagram_post' | 'instagram_story' | 'tiktok' | 'blog_post' | 'press_release' | 'other';
export type ContentStage = 'idea' | 'production' | 'mastering' | 'scheduled' | 'published' | 'promoted';

export interface ChecklistItem {
  id: string;
  stepName: string;
  isComplete: boolean;
}

export interface ContentProject {
  id: string;
  title: string;
  type: ContentType;
  stage: ContentStage;
  checklist: ChecklistItem[];
  publishDate: string | null;
  assignedTo: string | null;
  notes: string | null;
  views: number | null;
  likes: number | null;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CHECKLISTS: Record<ContentType, string[]> = {
  youtube_video: ['Concept & outline', 'Script/storyboard', 'Film A-roll', 'Film B-roll', 'Edit video', 'Color grade', 'Add music/SFX', 'Create thumbnail', 'Write title & description', 'Add tags & cards', 'Schedule upload', 'Promote on socials'],
  youtube_short: ['Concept', 'Film clip', 'Edit (< 60s)', 'Add caption/text', 'Upload', 'Cross-post'],
  instagram_reel: ['Concept', 'Film content', 'Edit in app', 'Write caption', 'Select audio', 'Add hashtags', 'Schedule/post'],
  instagram_post: ['Concept', 'Create visual', 'Write caption', 'Add hashtags', 'Schedule/post'],
  instagram_story: ['Create content', 'Add stickers/links', 'Post', 'Save to highlights'],
  tiktok: ['Concept', 'Film content', 'Edit with effects', 'Write caption', 'Add sounds/hashtags', 'Post'],
  blog_post: ['Topic research', 'Outline', 'First draft', 'Edit/revise', 'Add images', 'SEO optimization', 'Publish', 'Promote'],
  press_release: ['Draft release', 'Internal review', 'Media list', 'Send to contacts', 'Follow up', 'Track coverage', 'Archive'],
  other: ['Plan', 'Create', 'Review', 'Publish'],
};

// ---------------------------------------------------------------------------
// DB availability check
// ---------------------------------------------------------------------------

const CONTENT_TTL = 5 * 60 * 1000; // 5 minutes

function getDbId(): string {
  const id = NOTION_DBS.CONTENT_PIPELINE;
  if (!id) throw new Error('CONTENT_PIPELINE database not configured. Set NOTION_CONTENT_PIPELINE_DB env var or add the ID to src/config/notion.ts');
  return id;
}

// ---------------------------------------------------------------------------
// Checklist serialization (stored as JSON in a rich_text property)
// ---------------------------------------------------------------------------

function parseChecklist(raw: string | null): ChecklistItem[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function serializeChecklist(items: ChecklistItem[]): string {
  return JSON.stringify(items);
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapPageToProject(page: PageObjectResponse): ContentProject {
  const p = page.properties;
  return {
    id: page.id,
    title: getText(p['Name']) ?? '',
    type: (getSelect(p['Type']) ?? 'other') as ContentType,
    stage: (getSelect(p['Stage']) ?? 'idea') as ContentStage,
    checklist: parseChecklist(getText(p['Checklist'])),
    publishDate: getDate(p['Publish Date']),
    assignedTo: getText(p['Assigned To']),
    notes: getText(p['Notes']),
    views: getNumber(p['Views']),
    likes: getNumber(p['Likes']),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function fetchAllProjects(): Promise<ContentProject[]> {
  const dbId = getDbId();
  return getCached('content:all', CONTENT_TTL, async () => {
    const pages = await queryAll(dbId);
    return pages.map(mapPageToProject);
  });
}

export async function fetchProject(pageId: string): Promise<ContentProject | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if ('properties' in page) return mapPageToProject(page as PageObjectResponse);
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export async function createProject(data: {
  title: string;
  type: ContentType;
  publishDate?: string;
  assignedTo?: string;
  notes?: string;
}): Promise<ContentProject> {
  const dbId = getDbId();
  const checklist = (DEFAULT_CHECKLISTS[data.type] ?? DEFAULT_CHECKLISTS.other).map((step, i) => ({
    id: `step_${i}`,
    stepName: step,
    isComplete: false,
  }));

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      'Name': { title: [{ text: { content: data.title } }] },
      'Type': { select: { name: data.type } },
      'Stage': { select: { name: 'idea' } },
      'Checklist': { rich_text: [{ text: { content: serializeChecklist(checklist) } }] },
      ...(data.publishDate ? { 'Publish Date': { date: { start: data.publishDate } } } : {}),
      ...(data.assignedTo ? { 'Assigned To': { rich_text: [{ text: { content: data.assignedTo } }] } } : {}),
      ...(data.notes ? { 'Notes': { rich_text: [{ text: { content: data.notes } }] } } : {}),
    },
  });
  invalidateCache('content:');
  if ('properties' in page) return mapPageToProject(page as PageObjectResponse);
  throw new Error('Failed to create content project');
}

export async function updateProject(
  pageId: string,
  data: Partial<{
    title: string;
    type: ContentType;
    stage: ContentStage;
    checklist: ChecklistItem[];
    publishDate: string | null;
    assignedTo: string | null;
    notes: string | null;
    views: number | null;
    likes: number | null;
  }>,
): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.title !== undefined) {
    properties['Name'] = { title: [{ text: { content: data.title } }] };
  }
  if (data.type !== undefined) {
    properties['Type'] = { select: { name: data.type } };
  }
  if (data.stage !== undefined) {
    properties['Stage'] = { select: { name: data.stage } };
  }
  if (data.checklist !== undefined) {
    properties['Checklist'] = { rich_text: [{ text: { content: serializeChecklist(data.checklist) } }] };
  }
  if (data.publishDate !== undefined) {
    properties['Publish Date'] = data.publishDate ? { date: { start: data.publishDate } } : { date: null };
  }
  if (data.assignedTo !== undefined) {
    properties['Assigned To'] = { rich_text: [{ text: { content: data.assignedTo ?? '' } }] };
  }
  if (data.notes !== undefined) {
    properties['Notes'] = { rich_text: [{ text: { content: data.notes ?? '' } }] };
  }
  if (data.views !== undefined) {
    properties['Views'] = { number: data.views };
  }
  if (data.likes !== undefined) {
    properties['Likes'] = { number: data.likes };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await notion.pages.update({ page_id: pageId, properties: properties as any });
  invalidateCache('content:');
}

export async function deleteProject(pageId: string): Promise<void> {
  await notion.pages.update({ page_id: pageId, archived: true });
  invalidateCache('content:');
}

export async function updateStage(pageId: string, stage: ContentStage): Promise<void> {
  await updateProject(pageId, { stage });
}

export async function updateChecklist(
  pageId: string,
  itemId: string,
  isComplete: boolean,
): Promise<void> {
  const project = await fetchProject(pageId);
  if (!project) throw new Error('Project not found');

  const updated = project.checklist.map(item =>
    item.id === itemId ? { ...item, isComplete } : item,
  );
  await updateProject(pageId, { checklist: updated });
}
