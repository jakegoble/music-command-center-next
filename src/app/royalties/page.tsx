'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { RoyaltyEntry } from '@/lib/types';

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

type RoyaltyTab = 'Overview' | 'Gap Detection' | 'Forecast' | 'Detail';

// All revenue source keys
const SOURCES = [
  { key: 'ascap_performance' as const, label: 'ASCAP Performance', color: '#3B82F6' },
  { key: 'distributor_streaming' as const, label: 'Distributor Streaming', color: '#22C55E' },
  { key: 'mlc_mechanical' as const, label: 'MLC Mechanical', color: '#F59E0B' },
  { key: 'ppl_international' as const, label: 'PPL International', color: '#EC4899' },
  { key: 'soundexchange_digital' as const, label: 'SoundExchange Digital', color: '#8B5CF6' },
  { key: 'sync_licensing' as const, label: 'Sync Licensing', color: '#F97316' },
  { key: 'youtube_social' as const, label: 'YouTube/Social', color: '#EF4444' },
  { key: 'other' as const, label: 'Other', color: '#6B7280' },
];

export default function RoyaltiesPage() {
  const { artist } = useArtistContext();
  const [entries, setEntries] = useState<RoyaltyEntry[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [bySource, setBySource] = useState<Record<string, number>>({});
  const [byQuarter, setByQuarter] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RoyaltyTab>('Overview');
  const [dataType, setDataType] = useState<'reported' | 'estimated'>('reported');
  const [byArtistData, setByArtistData] = useState<Record<string, number>>({});
  const [totalStreams, setTotalStreams] = useState(0);

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
        setDataType(data.data_type ?? 'reported');
        setByArtistData(data.by_artist ?? {});
        setTotalStreams(data.total_streams ?? 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [artist]);

  // Derived data
  const sourceEntries = useMemo(() => Object.entries(bySource).sort((a, b) => b[1] - a[1]), [bySource]);
  const maxSourceVal = sourceEntries.length > 0 ? sourceEntries[0][1] : 1;
  const quarterEntries = useMemo(() => Object.entries(byQuarter).sort((a, b) => a[0].localeCompare(b[0])), [byQuarter]);
  const maxQuarterVal = quarterEntries.length > 0 ? Math.max(...quarterEntries.map(([, v]) => v)) : 1;

  // Per-artist breakdown — use API data when estimated, derive from entries when reported
  const byArtist = useMemo(() => {
    if (dataType === 'estimated' && Object.keys(byArtistData).length > 0) {
      return Object.entries(byArtistData).sort((a, b) => b[1] - a[1]);
    }
    const map: Record<string, number> = {};
    for (const e of entries) {
      const a = e.artist ?? 'Unknown';
      map[a] = (map[a] ?? 0) + e.total;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entries, dataType, byArtistData]);

  // Gap detection: find missing source-quarter combos
  const gaps = useMemo(() => {
    if (entries.length === 0) return [];
    const quarters = [...new Set(entries.map(e => e.quarter ?? e.period).filter(Boolean))] as string[];
    quarters.sort();
    const artists = [...new Set(entries.map(e => e.artist).filter(Boolean))] as string[];

    const found: { artist: string; quarter: string; source: string }[] = [];

    for (const a of artists) {
      const artistEntries = entries.filter(e => e.artist === a);
      for (const q of quarters) {
        const qEntry = artistEntries.find(e => (e.quarter ?? e.period) === q);
        if (!qEntry) {
          found.push({ artist: a, quarter: q, source: 'All sources (no entry)' });
          continue;
        }
        // Check which sources are 0 or null
        for (const src of SOURCES) {
          const val = qEntry[src.key];
          if (val === null || val === undefined || val === 0) {
            // Only flag if this source has revenue in other quarters
            const hasOtherQuarter = artistEntries.some(e => (e.quarter ?? e.period) !== q && (e[src.key] ?? 0) > 0);
            if (hasOtherQuarter) {
              found.push({ artist: a, quarter: q, source: src.label });
            }
          }
        }
      }
    }
    return found;
  }, [entries]);

  // Forecast: simple linear trend per quarter
  const forecast = useMemo(() => {
    if (quarterEntries.length < 2) return null;
    const values = quarterEntries.map(([, v]) => v);
    const n = values.length;
    const avgX = (n - 1) / 2;
    const avgY = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - avgX) * (values[i] - avgY);
      den += (i - avgX) * (i - avgX);
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = avgY - slope * avgX;

    // Predict next 4 quarters
    const lastQ = quarterEntries[quarterEntries.length - 1][0];
    const predictions: { quarter: string; predicted: number }[] = [];
    let [year, q] = lastQ.includes('Q') ? [parseInt(lastQ), parseInt(lastQ.split('Q')[1])] : [2025, 4];
    if (lastQ.match(/^\d{4}\sQ\d$/)) {
      year = parseInt(lastQ.slice(0, 4));
      q = parseInt(lastQ.slice(-1));
    }

    for (let i = 1; i <= 4; i++) {
      q++;
      if (q > 4) { q = 1; year++; }
      const predicted = Math.max(0, intercept + slope * (n - 1 + i));
      predictions.push({ quarter: `${year} Q${q}`, predicted });
    }

    const growth = values.length >= 2
      ? ((values[values.length - 1] - values[0]) / (values[0] || 1)) * 100
      : 0;

    return { predictions, slope, growth: Math.round(growth) };
  }, [quarterEntries]);

  // KPIs
  const avgPerQuarter = quarterEntries.length > 0 ? totalRevenue / quarterEntries.length : 0;
  const lastQuarterRevenue = quarterEntries.length > 0 ? quarterEntries[quarterEntries.length - 1][1] : 0;
  const topSource = sourceEntries.length > 0 ? sourceEntries[0] : null;

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
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Revenue" />

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: dataType === 'estimated' ? 'Est. Revenue' : 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Last Quarter', value: formatCurrency(lastQuarterRevenue), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Avg / Quarter', value: formatCurrency(avgPerQuarter), color: 'text-purple-400', border: 'border-l-purple-500' },
          { label: 'Top Source', value: topSource ? topSource[0] : '\u2014', color: 'text-orange-400', border: 'border-l-orange-500' },
          { label: 'Data Gaps', value: gaps.length.toString(), color: gaps.length > 0 ? 'text-red-400' : 'text-green-400', border: gaps.length > 0 ? 'border-l-red-500' : 'border-l-green-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-xl font-bold ${kpi.color} truncate`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Estimated data banner */}
      {dataType === 'estimated' && (
        <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Revenue estimated from streaming data ({formatNumber(totalStreams)} streams × $0.00478 blended rate).
          Import royalty statements to the Royalty Tracking database in Notion for actual figures.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-800">
        {(['Overview', 'Gap Detection', 'Forecast', 'Detail'] as RoyaltyTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
            {tab === 'Gap Detection' && gaps.length > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{gaps.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Revenue by Source */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Source</h2>
            {sourceEntries.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No source data.</p>
            ) : (
              <div className="space-y-2">
                {sourceEntries.map(([source, amount]) => {
                  const srcDef = SOURCES.find(s => s.label === source || s.key === source);
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-gray-300">{source}</span>
                      <div className="flex-1">
                        <div
                          className="h-5 rounded"
                          style={{ width: `${(amount / maxSourceVal) * 100}%`, backgroundColor: `${srcDef?.color ?? '#6B7280'}99` }}
                        />
                      </div>
                      <span className="w-20 text-right text-sm text-gray-400">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue by Quarter */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Quarter</h2>
            {quarterEntries.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No quarterly data.</p>
            ) : (
              <div className="flex items-end gap-2" style={{ height: 200 }}>
                {quarterEntries.map(([quarter, amount]) => {
                  const barH = maxQuarterVal > 0 ? (amount / maxQuarterVal) * 170 : 0;
                  return (
                    <div key={quarter} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400">{formatCurrency(amount)}</span>
                      <div className="w-full rounded-t bg-emerald-500/70" style={{ height: barH }} />
                      <span className="text-[10px] text-gray-500">{quarter}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue by Artist */}
          {byArtist.length > 0 && (
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Artist</h2>
              <div className="space-y-3">
                {byArtist.map(([name, amount]) => {
                  const color = ARTIST_COLORS[name as Artist] ?? '#6b7280';
                  const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{name}</span>
                        <span className="text-sm text-gray-400">{formatCurrency(amount)} ({pct}%)</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-gray-900">
                        <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source Share Donut-style list */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Source Share</h2>
            <div className="space-y-2">
              {sourceEntries.map(([source, amount]) => {
                const pct = totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : '0';
                const srcDef = SOURCES.find(s => s.label === source || s.key === source);
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: srcDef?.color ?? '#6B7280' }} />
                    <span className="flex-1 text-sm text-gray-300">{source}</span>
                    <span className="text-sm font-medium text-white">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gap Detection Tab */}
      {activeTab === 'Gap Detection' && (
        <div className="mt-6">
          {gaps.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
              <p className="text-lg font-medium text-green-400">No gaps detected</p>
              <p className="mt-2 text-sm text-gray-500">All expected revenue sources have data for all quarters.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-400">
                Found {gaps.length} gap{gaps.length !== 1 ? 's' : ''} — quarters or sources where revenue data is missing but expected based on other periods.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2">Artist</th>
                      <th className="px-3 py-2">Quarter</th>
                      <th className="px-3 py-2">Missing Source</th>
                      <th className="px-3 py-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.slice(0, 50).map((gap, i) => {
                      const isFullGap = gap.source.includes('All sources');
                      return (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="px-3 py-2 text-gray-300">{gap.artist}</td>
                          <td className="px-3 py-2 text-gray-300">{gap.quarter}</td>
                          <td className="px-3 py-2 text-gray-400">{gap.source}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isFullGap ? 'bg-red-900/50 text-red-300' : 'bg-amber-900/50 text-amber-300'
                            }`}>{isFullGap ? 'High' : 'Medium'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {gaps.length > 50 && (
                <p className="mt-2 text-xs text-gray-500">Showing 50 of {gaps.length} gaps</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'Forecast' && (
        <div className="mt-6">
          {!forecast ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
              <p className="text-lg font-medium text-gray-400">Not enough data</p>
              <p className="mt-2 text-sm text-gray-500">Need at least 2 quarters of data to generate a forecast.</p>
            </div>
          ) : (
            <>
              {/* Growth indicator */}
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Period Growth</p>
                  <p className={`mt-1 text-2xl font-bold ${forecast.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {forecast.growth >= 0 ? '+' : ''}{forecast.growth}%
                  </p>
                </div>
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Trend per Quarter</p>
                  <p className={`mt-1 text-2xl font-bold ${forecast.slope >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {forecast.slope >= 0 ? '+' : ''}{formatCurrency(forecast.slope)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Next Year Forecast</p>
                  <p className="mt-1 text-2xl font-bold text-blue-400">
                    {formatCurrency(forecast.predictions.reduce((s, p) => s + p.predicted, 0))}
                  </p>
                </div>
              </div>

              {/* Combined actual + forecast chart */}
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Actual + Forecast</h2>
                <div className="flex items-end gap-2" style={{ height: 220 }}>
                  {(() => {
                    const all = [
                      ...quarterEntries.map(([q, v]) => ({ quarter: q, value: v, type: 'actual' as const })),
                      ...forecast.predictions.map(p => ({ quarter: p.quarter, value: p.predicted, type: 'forecast' as const })),
                    ];
                    const maxVal = Math.max(...all.map(a => a.value), 1);
                    return all.map(item => {
                      const barH = (item.value / maxVal) * 180;
                      return (
                        <div key={item.quarter} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[9px] text-gray-400">{formatCurrency(item.value)}</span>
                          <div
                            className={`w-full rounded-t ${item.type === 'actual' ? 'bg-emerald-500/70' : 'bg-blue-500/40 border border-dashed border-blue-400/50'}`}
                            style={{ height: barH }}
                          />
                          <span className={`text-[9px] ${item.type === 'forecast' ? 'text-blue-400' : 'text-gray-500'}`}>{item.quarter}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-emerald-500/70" /> Actual</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-4 rounded border border-dashed border-blue-400/50 bg-blue-500/40" /> Forecast</span>
                </div>
              </div>

              {/* Forecast table */}
              <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Quarterly Predictions</h2>
                <div className="space-y-2">
                  {forecast.predictions.map(p => (
                    <div key={p.quarter} className="flex items-center justify-between rounded-lg border border-gray-700/30 bg-gray-900/50 px-4 py-3">
                      <span className="text-sm font-medium text-blue-300">{p.quarter}</span>
                      <span className="text-sm font-bold text-white">{formatCurrency(p.predicted)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-gray-600">Based on linear trend analysis of historical data. Actual results may vary.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail Table Tab */}
      {activeTab === 'Detail' && (
        <div className="mt-6">
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
      )}
    </div>
  );
}
