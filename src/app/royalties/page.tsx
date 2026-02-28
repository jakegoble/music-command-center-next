'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { RoyaltyEntry } from '@/lib/types';

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RoyaltiesPage() {
  const { artist } = useArtistContext();
  const [entries, setEntries] = useState<RoyaltyEntry[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [bySource, setBySource] = useState<Record<string, number>>({});
  const [byQuarter, setByQuarter] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';

    fetch(`/api/royalties${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setTotalRevenue(data.total_revenue ?? 0);
        setBySource(data.by_source ?? {});
        setByQuarter(data.by_quarter ?? {});
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [artist]);

  if (error) {
    return (
      <div>
        <PageHeader title="Revenue" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to load revenue data: {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Revenue" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const maxSourceVal = sourceEntries.length > 0 ? sourceEntries[0][1] : 1;
  const quarterEntries = Object.entries(byQuarter).sort((a, b) => a[0].localeCompare(b[0]));
  const maxQuarterVal = quarterEntries.length > 0 ? Math.max(...quarterEntries.map(([, v]) => v)) : 1;

  return (
    <div>
      <PageHeader title="Revenue" />

      {/* Total */}
      <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-500">Total Revenue</p>
        <p className="mt-1 text-4xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
        <p className="mt-1 text-sm text-gray-400">{entries.length} entries</p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Revenue by Source */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Source</h2>
          <div className="space-y-2">
            {sourceEntries.map(([source, amount]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-gray-300">{source}</span>
                <div className="flex-1">
                  <div
                    className="h-5 rounded bg-green-600/60"
                    style={{ width: `${(amount / maxSourceVal) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm text-gray-400">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Quarter */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Quarter</h2>
          <div className="space-y-2">
            {quarterEntries.map(([quarter, amount]) => (
              <div key={quarter} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-gray-300">{quarter}</span>
                <div className="flex-1">
                  <div
                    className="h-5 rounded bg-purple-600/60"
                    style={{ width: `${(amount / maxQuarterVal) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm text-gray-400">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">All Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3">Artist</th>
                <th className="px-3 py-3">Quarter</th>
                <th className="px-3 py-3 text-right">ASCAP</th>
                <th className="px-3 py-3 text-right">Distributor</th>
                <th className="hidden px-3 py-3 text-right md:table-cell">MLC</th>
                <th className="hidden px-3 py-3 text-right md:table-cell">SoundExchange</th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">Sync</th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">YouTube</th>
                <th className="px-3 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No royalty data available.
                  </td>
                </tr>
              ) : (
                entries.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800/50">
                    <td className="px-3 py-3 text-gray-300">{r.artist ?? '\u2014'}</td>
                    <td className="px-3 py-3 text-gray-300">{r.quarter ?? r.period ?? '\u2014'}</td>
                    <td className="px-3 py-3 text-right text-gray-400">{r.ascap_performance ? formatCurrency(r.ascap_performance) : '\u2014'}</td>
                    <td className="px-3 py-3 text-right text-gray-400">{r.distributor_streaming ? formatCurrency(r.distributor_streaming) : '\u2014'}</td>
                    <td className="hidden px-3 py-3 text-right text-gray-400 md:table-cell">{r.mlc_mechanical ? formatCurrency(r.mlc_mechanical) : '\u2014'}</td>
                    <td className="hidden px-3 py-3 text-right text-gray-400 md:table-cell">{r.soundexchange_digital ? formatCurrency(r.soundexchange_digital) : '\u2014'}</td>
                    <td className="hidden px-3 py-3 text-right text-gray-400 lg:table-cell">{r.sync_licensing ? formatCurrency(r.sync_licensing) : '\u2014'}</td>
                    <td className="hidden px-3 py-3 text-right text-gray-400 lg:table-cell">{r.youtube_social ? formatCurrency(r.youtube_social) : '\u2014'}</td>
                    <td className="px-3 py-3 text-right font-medium text-white">{formatCurrency(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
