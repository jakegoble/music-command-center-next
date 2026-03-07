'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { ClientSummary } from '@/lib/types';

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type SortField = 'company_name' | 'deal_value' | 'priority' | 'warmth';
type SortOrder = 'asc' | 'desc';

const WARMTH_COLORS: Record<string, string> = {
  Hot: 'bg-red-900/50 text-red-300',
  Warm: 'bg-orange-900/50 text-orange-300',
  Cool: 'bg-blue-900/50 text-blue-300',
  Cold: 'bg-gray-700/50 text-gray-300',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-900/50 text-green-300',
  Dormant: 'bg-orange-900/50 text-orange-300',
  Lost: 'bg-red-900/50 text-red-300',
  'One-and-Done': 'bg-gray-700/50 text-gray-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  '1 - Call This Week': 'bg-red-900/50 text-red-300',
  '2 - High': 'bg-orange-900/50 text-orange-300',
  '3 - Medium': 'bg-yellow-900/50 text-yellow-300',
  '4 - Low': 'bg-blue-900/50 text-blue-300',
  '5 - Backburner': 'bg-gray-700/50 text-gray-300',
};

const FIT_COLORS: Record<string, string> = {
  'Perfect Fit': 'bg-green-900/50 text-green-300',
  'Strong Fit': 'bg-blue-900/50 text-blue-300',
  'Possible Fit': 'bg-yellow-900/50 text-yellow-300',
  'Not a Fit': 'bg-red-900/50 text-red-300',
};

const INDUSTRY_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#22C55E', '#F97316', '#F59E0B', '#92400E', '#EF4444', '#9CA3AF'];

const PRIORITY_ORDER: Record<string, number> = {
  '1 - Call This Week': 1,
  '2 - High': 2,
  '3 - Medium': 3,
  '4 - Low': 4,
  '5 - Backburner': 5,
};

const WARMTH_ORDER: Record<string, number> = {
  Hot: 1,
  Warm: 2,
  Cool: 3,
  Cold: 4,
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/clients')
      .then(r => { if (!r.ok) throw new Error(`Fetch failed: ${r.status}`); return r.json(); })
      .then(data => { if (!cancelled) setClients(data.clients ?? []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter !== 'all' && c.relationship_status !== statusFilter) return false;
      if (industryFilter !== 'all' && c.industry !== industryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.company_name.toLowerCase().includes(q) &&
          !(c.key_contact_name ?? '').toLowerCase().includes(q) &&
          !(c.industry ?? '').toLowerCase().includes(q) &&
          !(c.hq_location ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [clients, statusFilter, industryFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'company_name': cmp = a.company_name.localeCompare(b.company_name); break;
        case 'deal_value': cmp = (a.deal_value ?? 0) - (b.deal_value ?? 0); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99); break;
        case 'warmth': cmp = (WARMTH_ORDER[a.warmth ?? ''] ?? 99) - (WARMTH_ORDER[b.warmth ?? ''] ?? 99); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'deal_value' ? 'desc' : 'asc');
    }
  };

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  // KPIs
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.relationship_status === 'Active').length;
  const hotLeads = clients.filter(c => c.warmth === 'Hot' || c.warmth === 'Warm').length;
  const totalDealValue = clients.reduce((s, c) => s + (c.deal_value ?? 0), 0);
  const highPriority = clients.filter(c => c.priority === '1 - Call This Week' || c.priority === '2 - High').length;

  // Industry breakdown
  const industryMap: Record<string, number> = {};
  for (const c of clients) {
    const ind = c.industry ?? 'Unknown';
    industryMap[ind] = (industryMap[ind] ?? 0) + 1;
  }
  const industryEntries = Object.entries(industryMap).sort((a, b) => b[1] - a[1]);
  const maxIndustry = industryEntries.length > 0 ? industryEntries[0][1] : 1;

  // Status breakdown
  const statusMap: Record<string, number> = {};
  for (const c of clients) {
    const status = c.relationship_status ?? 'Unknown';
    statusMap[status] = (statusMap[status] ?? 0) + 1;
  }

  // Warmth breakdown
  const warmthMap: Record<string, number> = {};
  for (const c of clients) {
    const w = c.warmth ?? 'Unknown';
    warmthMap[w] = (warmthMap[w] ?? 0) + 1;
  }

  // Unique industries and statuses for filters
  const industries = [...new Set(clients.map(c => c.industry).filter(Boolean))] as string[];
  const statuses = [...new Set(clients.map(c => c.relationship_status).filter(Boolean))] as string[];

  if (error) {
    return (
      <div>
        <PageHeader title="Clients" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load clients: {error}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Clients" />

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Total Clients', value: totalClients.toString(), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Active', value: activeClients.toString(), color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Hot / Warm Leads', value: hotLeads.toString(), color: 'text-orange-400', border: 'border-l-orange-500' },
          { label: 'High Priority', value: highPriority.toString(), color: 'text-red-400', border: 'border-l-red-500' },
          { label: 'Total Deal Value', value: formatCurrency(totalDealValue), color: 'text-emerald-400', border: 'border-l-emerald-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-xl font-bold ${kpi.color} truncate`}>{isLoading ? '...' : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Breakdowns */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Industry */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">By Industry</h2>
          {industryEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No data.</p>
          ) : (
            <div className="space-y-2">
              {industryEntries.map(([ind, count], i) => (
                <div key={ind} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-gray-300">{ind}</span>
                  <div className="flex-1">
                    <div className="h-4 rounded" style={{ width: `${(count / maxIndustry) * 100}%`, backgroundColor: `${INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]}99` }} />
                  </div>
                  <span className="w-6 text-right text-xs text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relationship Status */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Relationship Status</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-3 text-center">
                <p className="text-2xl font-bold text-white">{count}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-700/50 text-gray-300'}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warmth */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Lead Warmth</h2>
          <div className="grid grid-cols-2 gap-3">
            {['Hot', 'Warm', 'Cool', 'Cold'].map(w => (
              <div key={w} className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-3 text-center">
                <p className="text-2xl font-bold text-white">{warmthMap[w] ?? 0}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${WARMTH_COLORS[w]}`}>
                  {w}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-700 bg-gray-800/50 px-2 text-sm text-gray-300"
        >
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={industryFilter}
          onChange={e => setIndustryFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-700 bg-gray-800/50 px-2 text-sm text-gray-300"
        >
          <option value="all">All Industries</option>
          {industries.sort().map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <span className="text-xs text-gray-500">{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => handleSort('company_name')}>Company{sortArrow('company_name')}</th>
              <th className="px-3 py-3">Industry</th>
              <th className="hidden px-3 py-3 md:table-cell">Contact</th>
              <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => handleSort('warmth')}>Warmth{sortArrow('warmth')}</th>
              <th className="cursor-pointer hidden px-3 py-3 hover:text-gray-300 md:table-cell" onClick={() => handleSort('priority')}>Priority{sortArrow('priority')}</th>
              <th className="hidden px-3 py-3 lg:table-cell">Fit</th>
              <th className="cursor-pointer hidden px-3 py-3 hover:text-gray-300 lg:table-cell" onClick={() => handleSort('deal_value')}>Deal Value{sortArrow('deal_value')}</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50"><td colSpan={8} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-800/50" /></td></tr>
              ))
            ) : sorted.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">No clients found.</td></tr>
            ) : (
              sorted.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-3 py-3">
                    <div>
                      <span className="font-medium text-white">{c.company_name}</span>
                      {c.hq_location && <p className="text-[11px] text-gray-500">{c.hq_location}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-400">{c.industry ?? '\u2014'}</td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    {c.key_contact_name ? (
                      <div>
                        <span className="text-gray-300">{c.key_contact_name}</span>
                        {c.contact_title && <p className="text-[11px] text-gray-500">{c.contact_title}</p>}
                      </div>
                    ) : <span className="text-gray-500">&mdash;</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${WARMTH_COLORS[c.warmth ?? ''] ?? 'bg-gray-700/50 text-gray-300'}`}>
                      {c.warmth ?? '\u2014'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[c.priority ?? ''] ?? 'bg-gray-700/50 text-gray-300'}`}>
                      {c.priority ?? '\u2014'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FIT_COLORS[c.fit_score ?? ''] ?? 'bg-gray-700/50 text-gray-300'}`}>
                      {c.fit_score ?? '\u2014'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-gray-300 lg:table-cell">
                    {c.deal_value ? formatCurrency(c.deal_value) : '\u2014'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.relationship_status ?? ''] ?? 'bg-gray-700/50 text-gray-300'}`}>
                      {c.relationship_status ?? '\u2014'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
