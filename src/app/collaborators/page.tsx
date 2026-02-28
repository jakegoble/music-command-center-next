'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { CollaboratorDetail } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type SortField = 'name' | 'song_count' | 'total_streams' | 'estimated_revenue';
type SortOrder = 'asc' | 'desc';

const ROLE_COLORS: Record<string, string> = {
  Producer: '#8B5CF6',
  Songwriter: '#3B82F6',
  'Featured Artist': '#F97316',
  Engineer: '#22C55E',
  Mixer: '#EC4899',
  'Master Engineer': '#14B8A6',
  Vocalist: '#F59E0B',
};

const AGREEMENT_STYLES: Record<string, string> = {
  Active: 'bg-green-900/50 text-green-300',
  Pending: 'bg-yellow-900/50 text-yellow-300',
  Expired: 'bg-red-900/50 text-red-300',
  'Not Started': 'bg-gray-700/50 text-gray-300',
};

const TABS = ['Table', 'Leaderboard'] as const;
type Tab = (typeof TABS)[number];

export default function CollaboratorsPage() {
  const { artist } = useArtistContext();
  const [collaborators, setCollaborators] = useState<CollaboratorDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('total_streams');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeTab, setActiveTab] = useState<Tab>('Table');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/collaborators')
      .then(r => { if (!r.ok) throw new Error(`Fetch failed: ${r.status}`); return r.json(); })
      .then(data => { if (!cancelled) setCollaborators(data.collaborators ?? []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    return [...collaborators].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'song_count': cmp = a.song_count - b.song_count; break;
        case 'total_streams': cmp = a.total_streams - b.total_streams; break;
        case 'estimated_revenue': cmp = a.estimated_revenue - b.estimated_revenue; break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [collaborators, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  // KPIs
  const totalCollabs = collaborators.length;
  const totalCollabStreams = collaborators.reduce((s, c) => s + c.total_streams, 0);
  const totalCollabRevenue = collaborators.reduce((s, c) => s + c.estimated_revenue, 0);
  const topCollab = sorted.length > 0 ? sorted[0] : null;
  const activeAgreements = collaborators.filter(c => c.agreement_status === 'Active').length;

  // Role breakdown
  const roleMap: Record<string, number> = {};
  for (const c of collaborators) {
    for (const r of c.roles) {
      roleMap[r] = (roleMap[r] ?? 0) + 1;
    }
  }
  const roleEntries = Object.entries(roleMap).sort((a, b) => b[1] - a[1]);
  const maxRole = roleEntries.length > 0 ? roleEntries[0][1] : 1;

  // Agreement status breakdown
  const agreementMap: Record<string, number> = {};
  for (const c of collaborators) {
    const status = c.agreement_status ?? 'Unknown';
    agreementMap[status] = (agreementMap[status] ?? 0) + 1;
  }

  // Top by streams for leaderboard
  const leaderboard = [...collaborators].sort((a, b) => b.total_streams - a.total_streams);
  const maxLeaderStreams = leaderboard.length > 0 ? leaderboard[0].total_streams : 1;

  if (error) {
    return (
      <div>
        <PageHeader title="Collaborators" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load collaborators: {error}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Collaborators" />

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Total', value: totalCollabs.toString(), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Active Agreements', value: activeAgreements.toString(), color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Total Streams', value: formatNumber(totalCollabStreams), color: 'text-purple-400', border: 'border-l-purple-500' },
          { label: 'Est. Revenue', value: formatCurrency(totalCollabRevenue), color: 'text-emerald-400', border: 'border-l-emerald-500' },
          { label: 'Top Collaborator', value: topCollab?.name ?? '\u2014', color: 'text-orange-400', border: 'border-l-orange-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-xl font-bold ${kpi.color} truncate`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Role Breakdown + Agreement Status */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Role Breakdown */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Roles</h2>
          {roleEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No role data.</p>
          ) : (
            <div className="space-y-2">
              {roleEntries.map(([role, count]) => (
                <div key={role} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-gray-300">{role}</span>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded"
                      style={{
                        width: `${(count / maxRole) * 100}%`,
                        backgroundColor: `${ROLE_COLORS[role] ?? '#6366F1'}99`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agreement Status */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Agreement Status</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(agreementMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-3 text-center">
                <p className="text-2xl font-bold text-white">{count}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${AGREEMENT_STYLES[status] ?? 'bg-gray-700/50 text-gray-300'}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          </button>
        ))}
      </div>

      {activeTab === 'Table' ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => handleSort('name')}>Name{sortArrow('name')}</th>
                <th className="px-3 py-3">Roles</th>
                <th className="hidden px-3 py-3 md:table-cell">PRO</th>
                <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => handleSort('song_count')}>Songs{sortArrow('song_count')}</th>
                <th className="cursor-pointer hidden px-3 py-3 hover:text-gray-300 md:table-cell" onClick={() => handleSort('total_streams')}>Streams{sortArrow('total_streams')}</th>
                <th className="cursor-pointer hidden px-3 py-3 hover:text-gray-300 lg:table-cell" onClick={() => handleSort('estimated_revenue')}>Est. Revenue{sortArrow('estimated_revenue')}</th>
                <th className="px-3 py-3">Agreement</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-800/50"><td colSpan={7} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-800/50" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No collaborators found.</td></tr>
              ) : (
                sorted.map(c => (
                  <tr key={c.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                    <td className="px-3 py-3">
                      <Link
                        href={artist !== 'all' ? `/collaborators/${c.slug}?artist=${artistToParam(artist)}` : `/collaborators/${c.slug}`}
                        className="font-medium text-white hover:text-orange-400"
                      >{c.name}</Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.roles.length > 0 ? c.roles.map(r => (
                          <span
                            key={r}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: ROLE_COLORS[r] ?? '#6366F1' }}
                          >{r}</span>
                        )) : <span className="text-gray-500">&mdash;</span>}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-gray-400 md:table-cell">{c.pro_affiliation ?? '\u2014'}</td>
                    <td className="px-3 py-3 text-gray-300">{c.song_count}</td>
                    <td className="hidden px-3 py-3 text-gray-300 md:table-cell">{formatNumber(c.total_streams)}</td>
                    <td className="hidden px-3 py-3 text-gray-300 lg:table-cell">{formatCurrency(c.estimated_revenue)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${AGREEMENT_STYLES[c.agreement_status ?? ''] ?? 'bg-gray-700/50 text-gray-300'}`}>
                        {c.agreement_status ?? '\u2014'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Leaderboard View */
        <div className="mt-6 space-y-3">
          {leaderboard.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No collaborators to rank.</p>
          ) : (
            leaderboard.map((c, i) => (
              <Link
                key={c.id}
                href={artist !== 'all' ? `/collaborators/${c.slug}?artist=${artistToParam(artist)}` : `/collaborators/${c.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 transition-colors hover:bg-gray-800/80"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-amber-500/20 text-amber-400' :
                  i === 1 ? 'bg-gray-400/20 text-gray-300' :
                  i === 2 ? 'bg-orange-600/20 text-orange-400' :
                  'bg-gray-800 text-gray-500'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white group-hover:text-orange-400">{c.name}</span>
                    <div className="flex gap-1">
                      {c.roles.slice(0, 2).map(r => (
                        <span key={r} className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: ROLE_COLORS[r] ?? '#6366F1' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full rounded-full bg-gray-900">
                    <div
                      className="h-2.5 rounded-full bg-purple-500/70"
                      style={{ width: maxLeaderStreams > 0 ? `${(c.total_streams / maxLeaderStreams) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span>{c.song_count} song{c.song_count !== 1 ? 's' : ''}</span>
                    <span>{c.pro_affiliation ?? 'No PRO'}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${AGREEMENT_STYLES[c.agreement_status ?? ''] ?? 'bg-gray-700/50 text-gray-300'}`}>
                      {c.agreement_status ?? 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-purple-400">{formatNumber(c.total_streams)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(c.estimated_revenue)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
