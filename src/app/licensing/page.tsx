'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { LicensingContactSummary } from '@/lib/types';

type ViewMode = 'table' | 'kanban';

const PIPELINE_STAGES = ['Prospect', 'Outreach', 'In Discussion', 'Pitched', 'Active', 'Inactive'] as const;

const STAGE_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Prospect: { bg: 'bg-gray-800/50', border: 'border-gray-600/50', text: 'text-gray-300', badge: 'bg-gray-600/50 text-gray-300' },
  Outreach: { bg: 'bg-blue-900/20', border: 'border-blue-700/50', text: 'text-blue-300', badge: 'bg-blue-900/50 text-blue-300' },
  'In Discussion': { bg: 'bg-amber-900/20', border: 'border-amber-700/50', text: 'text-amber-300', badge: 'bg-amber-900/50 text-amber-300' },
  Pitched: { bg: 'bg-purple-900/20', border: 'border-purple-700/50', text: 'text-purple-300', badge: 'bg-purple-900/50 text-purple-300' },
  Active: { bg: 'bg-green-900/20', border: 'border-green-700/50', text: 'text-green-300', badge: 'bg-green-900/50 text-green-300' },
  Inactive: { bg: 'bg-red-900/20', border: 'border-red-700/50', text: 'text-red-300', badge: 'bg-red-900/50 text-red-300' },
};

function getStage(contact: LicensingContactSummary): string {
  const s = contact.status;
  if (!s) return 'Prospect';
  if (s === 'Active' || s === 'Signed') return 'Active';
  if (s === 'Inactive' || s === 'Declined') return 'Inactive';
  if (s === 'Pitched' || s === 'Submitted') return 'Pitched';
  if (s === 'In Discussion' || s === 'Negotiating') return 'In Discussion';
  if (s === 'Outreach' || s === 'Contacted') return 'Outreach';
  if (s === 'Pending') return 'Outreach';
  return 'Prospect';
}

function timeAgo(date: string | null): string {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function LicensingPage() {
  const [contacts, setContacts] = useState<LicensingContactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [genreFilter, setGenreFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/licensing-contacts')
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setContacts(data.contacts ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // All unique genres
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) {
      for (const g of c.genre_focus) set.add(g);
    }
    return [...set].sort();
  }, [contacts]);

  // Filter
  const filtered = useMemo(() => {
    if (!genreFilter) return contacts;
    return contacts.filter(c => c.genre_focus.includes(genreFilter));
  }, [contacts, genreFilter]);

  // Group by stage
  const byStage = useMemo(() => {
    const map: Record<string, LicensingContactSummary[]> = {};
    for (const stage of PIPELINE_STAGES) map[stage] = [];
    for (const c of filtered) {
      const stage = getStage(c);
      if (map[stage]) map[stage].push(c);
      else map['Prospect'].push(c);
    }
    return map;
  }, [filtered]);

  // KPIs
  const active = filtered.filter(c => getStage(c) === 'Active').length;
  const pitched = filtered.filter(c => getStage(c) === 'Pitched').length;
  const inDiscussion = filtered.filter(c => getStage(c) === 'In Discussion').length;
  const stale = filtered.filter(c => {
    if (!c.last_contact) return true;
    const days = (Date.now() - new Date(c.last_contact).getTime()) / (24 * 60 * 60 * 1000);
    return days > 90;
  }).length;

  if (error) {
    return (
      <div>
        <PageHeader title="Licensing Pipeline" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to load licensing contacts: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Licensing Pipeline" />

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Total Contacts', value: filtered.length.toString(), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Active', value: active.toString(), color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Pitched', value: pitched.toString(), color: 'text-purple-400', border: 'border-l-purple-500' },
          { label: 'In Discussion', value: inDiscussion.toString(), color: 'text-amber-400', border: 'border-l-amber-500' },
          { label: 'Stale (>90d)', value: stale.toString(), color: 'text-red-400', border: 'border-l-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={genreFilter}
          onChange={e => setGenreFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Genres</option>
          {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-1 rounded-lg bg-gray-800/50 p-1">
          {(['kanban', 'table'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                viewMode === mode ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >{mode}</button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const items = byStage[stage];
            const style = STAGE_STYLES[stage] ?? STAGE_STYLES.Prospect;
            return (
              <div key={stage} className={`w-64 shrink-0 rounded-xl border ${style.border} ${style.bg} p-3`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>{stage}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-600">No contacts</p>
                  ) : (
                    items.map(c => (
                      <div key={c.id} className="rounded-lg border border-gray-700/30 bg-gray-900/60 p-3">
                        <p className="text-sm font-medium text-white">{c.company}</p>
                        {c.contact_name && (
                          <p className="mt-0.5 text-xs text-gray-400">{c.contact_name}</p>
                        )}
                        {c.genre_focus.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {c.genre_focus.slice(0, 3).map(g => (
                              <span key={g} className="rounded bg-gray-700/50 px-1.5 py-0.5 text-[10px] text-gray-400">{g}</span>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[10px] text-gray-500">Last contact: {timeAgo(c.last_contact)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Contact Name</th>
                <th className="px-3 py-3">Stage</th>
                <th className="hidden px-3 py-3 md:table-cell">Genre Focus</th>
                <th className="hidden px-3 py-3 lg:table-cell">Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No licensing contacts found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const stage = getStage(c);
                  const style = STAGE_STYLES[stage] ?? STAGE_STYLES.Prospect;
                  return (
                    <tr key={c.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                      <td className="px-3 py-3 font-medium text-white">{c.company}</td>
                      <td className="px-3 py-3 text-gray-300">{c.contact_name ?? '\u2014'}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>{stage}</span>
                      </td>
                      <td className="hidden px-3 py-3 text-gray-400 md:table-cell">{c.genre_focus.join(', ') || '\u2014'}</td>
                      <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{timeAgo(c.last_contact)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
