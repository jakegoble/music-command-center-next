'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';

// ---------------------------------------------------------------------------
// Types (match API response)
// ---------------------------------------------------------------------------

type EntityType = 'song' | 'collaborator' | 'royalty' | 'playlist' | 'licensing' | 'content';
type ChangeSource = 'api_songstats' | 'api_spotify' | 'api_distributor' | 'csv_import' | 'manual' | 'bulk_update';
type Confidence = 'high' | 'medium' | 'low';
type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'superseded';

interface PendingChange {
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

interface AuditLogEntry {
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

const ENTITY_COLORS: Record<EntityType, string> = {
  song: '#3B82F6',
  collaborator: '#F59E0B',
  royalty: '#10B981',
  playlist: '#8B5CF6',
  licensing: '#EC4899',
  content: '#6366F1',
};

const CONFIDENCE_STYLES: Record<Confidence, { bg: string; text: string }> = {
  high: { bg: 'bg-green-900/50', text: 'text-green-300' },
  medium: { bg: 'bg-amber-900/50', text: 'text-amber-300' },
  low: { bg: 'bg-red-900/50', text: 'text-red-300' },
};

const SOURCE_LABELS: Record<ChangeSource, string> = {
  api_songstats: 'Songstats API',
  api_spotify: 'Spotify API',
  api_distributor: 'Distributor API',
  csv_import: 'CSV Import',
  manual: 'Manual',
  bulk_update: 'Bulk Update',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS = ['Queue', 'Audit Log'] as const;
type Tab = (typeof TABS)[number];

export default function ApprovalsPage() {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Queue');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [changesRes, auditRes] = await Promise.all([
        fetch('/api/approvals'),
        fetch('/api/approvals?view=audit'),
      ]);

      if (!changesRes.ok || !auditRes.ok) {
        const errData = await (changesRes.ok ? auditRes : changesRes).json();
        throw new Error(errData.details ?? errData.error ?? 'Failed to load');
      }

      const changesData = await changesRes.json();
      const auditData = await auditRes.json();
      setChanges(changesData.changes ?? []);
      setAudit(auditData.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pending = changes.filter(c => c.status === 'pending');

  // KPIs
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);
  const autoApprovedThisWeek = changes.filter(c => c.status === 'auto_approved' && c.reviewedAt && new Date(c.reviewedAt) >= weekAgo).length;
  const reviewedToday = changes.filter(c => (c.status === 'approved' || c.status === 'rejected') && c.reviewedAt?.startsWith(today)).length;
  const rejectedThisWeek = changes.filter(c => c.status === 'rejected' && c.reviewedAt && new Date(c.reviewedAt) >= weekAgo).length;
  const approvedThisWeek = changes.filter(c => c.status === 'approved' && c.reviewedAt && new Date(c.reviewedAt) >= weekAgo).length;
  const rejectionRate = (approvedThisWeek + rejectedThisWeek) > 0 ? Math.round((rejectedThisWeek / (approvedThisWeek + rejectedThisWeek)) * 100) : 0;

  const handleAction = useCallback(async (id: string, status: 'approved' | 'rejected') => {
    setActionInProgress(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      await fetchData();
    } catch {
      setError('Failed to update approval');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchData]);

  const approveAllHighConfidence = useCallback(async () => {
    const highConfIds = pending.filter(c => c.confidence === 'high').map(c => c.id);
    if (highConfIds.length === 0) return;

    setActionInProgress('batch');
    try {
      const res = await fetch('/api/approvals/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: highConfIds, status: 'auto_approved' }),
      });
      if (!res.ok) throw new Error('Batch update failed');
      await fetchData();
    } catch {
      setError('Failed to batch approve');
    } finally {
      setActionInProgress(null);
    }
  }, [pending, fetchData]);

  // Group pending by entity type
  const grouped: Record<string, PendingChange[]> = {};
  for (const c of pending) {
    if (!grouped[c.entityType]) grouped[c.entityType] = [];
    grouped[c.entityType].push(c);
  }

  if (error?.includes('not configured')) {
    return (
      <div>
        <PageHeader title="Approvals" />
        <div className="mt-6 rounded-xl border border-dashed border-amber-700/50 bg-amber-950/20 p-6 text-center">
          <p className="text-lg font-medium text-amber-400">Approval Queue Not Configured</p>
          <p className="mt-2 text-sm text-gray-400">
            Create an &quot;Approval Queue&quot; database in Notion with the required properties,
            then set the <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-amber-300">NOTION_APPROVAL_QUEUE_DB</code> environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Approvals" />

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Pending', value: isLoading ? '...' : pending.length.toString(), color: 'text-amber-400', border: 'border-l-amber-500' },
          { label: 'Auto-Approved (Week)', value: isLoading ? '...' : autoApprovedThisWeek.toString(), color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Reviewed Today', value: isLoading ? '...' : reviewedToday.toString(), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Rejection Rate', value: isLoading ? '...' : `${rejectionRate}%`, color: 'text-red-400', border: 'border-l-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && !error.includes('not configured') && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
            {tab === 'Queue' && pending.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-600 px-2 py-0.5 text-xs text-white">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
      ) : activeTab === 'Queue' ? (
        <div className="mt-6">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
              <p className="text-lg font-medium text-gray-400">No pending changes.</p>
              <p className="mt-2 text-sm text-gray-500">Changes from API imports, CSV uploads, and bulk updates will appear here for review.</p>
            </div>
          ) : (
            <>
              {pending.some(c => c.confidence === 'high') && (
                <button
                  onClick={approveAllHighConfidence}
                  disabled={actionInProgress === 'batch'}
                  className="mb-4 rounded-lg bg-green-900/30 border border-green-800/50 px-4 py-2 text-sm font-medium text-green-300 hover:bg-green-900/50 disabled:opacity-50"
                >
                  {actionInProgress === 'batch' ? 'Approving...' : `Approve All High-Confidence (${pending.filter(c => c.confidence === 'high').length})`}
                </button>
              )}

              {Object.entries(grouped).map(([entityType, items]) => (
                <div key={entityType} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ENTITY_COLORS[entityType as EntityType] }} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{entityType}</span>
                    <span className="text-xs text-gray-500">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(change => (
                      <div key={change.id} className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: ENTITY_COLORS[change.entityType] }}>
                              {change.entityType}
                            </span>
                            <span className="text-sm font-medium text-white truncate">{change.entityLabel}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-gray-500">{change.fieldName}:</span>
                            <span className="text-red-400 line-through">{change.currentValue ?? 'null'}</span>
                            <span className="text-gray-500">&rarr;</span>
                            <span className="text-green-400">{change.proposedValue}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                            <span className={`rounded-full px-1.5 py-0.5 ${CONFIDENCE_STYLES[change.confidence].bg} ${CONFIDENCE_STYLES[change.confidence].text}`}>
                              {change.confidence}
                            </span>
                            <span>{SOURCE_LABELS[change.source]}</span>
                            <span>{timeAgo(change.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            onClick={() => handleAction(change.id, 'approved')}
                            disabled={actionInProgress === change.id}
                            className="rounded-lg bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-900/50 disabled:opacity-50"
                          >
                            {actionInProgress === change.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(change.id, 'rejected')}
                            disabled={actionInProgress === change.id}
                            className="rounded-lg bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                          >
                            {actionInProgress === change.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {audit.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
              <p className="text-lg font-medium text-gray-400">No audit log entries.</p>
              <p className="mt-2 text-sm text-gray-500">Approved and rejected changes will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Old Value</th>
                    <th className="px-3 py-2">New Value</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.slice(0, 50).map(entry => (
                    <tr key={entry.id} className="border-b border-gray-800/50">
                      <td className="px-3 py-2 text-xs text-gray-400">{timeAgo(entry.timestamp)}</td>
                      <td className="px-3 py-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: ENTITY_COLORS[entry.entityType] }}>
                          {entry.entityLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-300">{entry.fieldName}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.action === 'approve' ? 'bg-green-900/50 text-green-300' :
                          entry.action === 'reject' ? 'bg-red-900/50 text-red-300' :
                          'bg-blue-900/50 text-blue-300'
                        }`}>{entry.action}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{entry.previousValue ?? '\u2014'}</td>
                      <td className="px-3 py-2 text-xs text-gray-300">{entry.newValue ?? '\u2014'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{SOURCE_LABELS[entry.source]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
