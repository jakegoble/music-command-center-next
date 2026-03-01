import { NOTION_DBS } from '@/config/notion';
import {
  notion,
  queryAll,
  getCached,
  invalidateCache,
  getText,
  getSelect,
  getDate,
} from '@/lib/clients/notion';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityType = 'song' | 'collaborator' | 'royalty' | 'playlist' | 'licensing' | 'content';
export type ChangeSource = 'api_songstats' | 'api_spotify' | 'api_distributor' | 'csv_import' | 'manual' | 'bulk_update';
export type Confidence = 'high' | 'medium' | 'low';
export type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'superseded';

export interface PendingChange {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  fieldName: string;
  currentValue: string | null;
  proposedValue: string;
  source: ChangeSource;
  confidence: Confidence;
  status: ChangeStatus;
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  entityType: EntityType;
  entityLabel: string;
  action: 'approve' | 'reject' | 'auto_approve';
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  source: ChangeSource;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// DB availability check
// ---------------------------------------------------------------------------

const APPROVAL_TTL = 5 * 60 * 1000; // 5 minutes

function getDbId(): string {
  const id = NOTION_DBS.APPROVAL_QUEUE;
  if (!id) throw new Error('APPROVAL_QUEUE database not configured. Set NOTION_APPROVAL_QUEUE_DB env var or add the ID to src/config/notion.ts');
  return id;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapPageToChange(page: PageObjectResponse): PendingChange {
  const p = page.properties;
  return {
    id: page.id,
    entityType: (getSelect(p['Entity Type']) ?? 'song') as EntityType,
    entityId: getText(p['Entity ID']) ?? '',
    entityLabel: getText(p['Entity Label']) ?? getText(p['Name']) ?? '',
    fieldName: getText(p['Field Name']) ?? '',
    currentValue: getText(p['Current Value']),
    proposedValue: getText(p['Proposed Value']) ?? '',
    source: (getSelect(p['Source']) ?? 'manual') as ChangeSource,
    confidence: (getSelect(p['Confidence']) ?? 'medium') as Confidence,
    status: (getSelect(p['Status']) ?? 'pending') as ChangeStatus,
    reason: getText(p['Reason']),
    createdAt: page.created_time,
    reviewedAt: getDate(p['Reviewed At']),
  };
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function fetchPendingChanges(): Promise<PendingChange[]> {
  const dbId = getDbId();
  return getCached('approvals:pending', APPROVAL_TTL, async () => {
    const pages = await queryAll(dbId, {
      and: [{ property: 'Status', select: { equals: 'pending' } }],
    });
    return pages.map(mapPageToChange);
  });
}

export async function fetchAllChanges(): Promise<PendingChange[]> {
  const dbId = getDbId();
  return getCached('approvals:all', APPROVAL_TTL, async () => {
    const pages = await queryAll(dbId);
    return pages.map(mapPageToChange);
  });
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const dbId = getDbId();
  return getCached('approvals:audit', APPROVAL_TTL, async () => {
    const pages = await queryAll(dbId, {
      and: [{
        or: [
          { property: 'Status', select: { equals: 'approved' } },
          { property: 'Status', select: { equals: 'rejected' } },
          { property: 'Status', select: { equals: 'auto_approved' } },
        ],
      }],
    });
    return pages.map((page): AuditLogEntry => {
      const change = mapPageToChange(page);
      const actionMap: Record<string, 'approve' | 'reject' | 'auto_approve'> = {
        approved: 'approve',
        rejected: 'reject',
        auto_approved: 'auto_approve',
      };
      return {
        id: change.id,
        entityType: change.entityType,
        entityLabel: change.entityLabel,
        action: actionMap[change.status] ?? 'approve',
        fieldName: change.fieldName,
        previousValue: change.currentValue,
        newValue: change.proposedValue,
        source: change.source,
        timestamp: change.reviewedAt ?? change.createdAt,
      };
    });
  });
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export async function updateChangeStatus(
  pageId: string,
  status: 'approved' | 'rejected' | 'auto_approved',
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      'Status': { select: { name: status } },
      'Reviewed At': { date: { start: new Date().toISOString() } },
    },
  });
  invalidateCache('approvals:');
}

export async function batchUpdateStatus(
  pageIds: string[],
  status: 'approved' | 'rejected' | 'auto_approved',
): Promise<void> {
  await Promise.all(pageIds.map(id => updateChangeStatus(id, status)));
}

export async function createChange(data: {
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  fieldName: string;
  currentValue: string | null;
  proposedValue: string;
  source: ChangeSource;
  confidence: Confidence;
  reason?: string;
}): Promise<PendingChange> {
  const dbId = getDbId();
  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      'Name': { title: [{ text: { content: `${data.entityLabel}: ${data.fieldName}` } }] },
      'Entity Type': { select: { name: data.entityType } },
      'Entity ID': { rich_text: [{ text: { content: data.entityId } }] },
      'Entity Label': { rich_text: [{ text: { content: data.entityLabel } }] },
      'Field Name': { rich_text: [{ text: { content: data.fieldName } }] },
      'Current Value': { rich_text: [{ text: { content: data.currentValue ?? '' } }] },
      'Proposed Value': { rich_text: [{ text: { content: data.proposedValue } }] },
      'Source': { select: { name: data.source } },
      'Confidence': { select: { name: data.confidence } },
      'Status': { select: { name: 'pending' } },
      ...(data.reason ? { 'Reason': { rich_text: [{ text: { content: data.reason } }] } } : {}),
    },
  });
  invalidateCache('approvals:');
  if ('properties' in page) {
    return mapPageToChange(page as PageObjectResponse);
  }
  throw new Error('Failed to create approval change');
}
