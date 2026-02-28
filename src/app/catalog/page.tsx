'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongSummary, CatalogResponse } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

type ViewMode = 'table' | 'cards' | 'compact';

export default function CatalogPage() {
  const { artist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [sort, setSort] = useState('release_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [statusFilter, genreFilter].filter(Boolean).length;

  const fetchSongs = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (artist !== 'all') params.set('artist', artistToParam(artist));
    params.set('page', pageNum.toString());
    params.set('limit', '50');
    params.set('sort', sort);
    params.set('order', order);
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (genreFilter) params.set('genre', genreFilter);

    try {
      const r = await fetch(`/api/catalog?${params}`);
      if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
      const data: CatalogResponse = await r.json();
      setSongs(data.songs);
      setTotal(data.total);
      setHasMore(data.has_more);
      setPage(data.page);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [artist, sort, order, search, statusFilter, genreFilter]);

  useEffect(() => { fetchSongs(1); }, [fetchSongs]);

  const toggleSort = (field: string) => {
    if (sort === field) setOrder(order === 'desc' ? 'asc' : 'desc');
    else { setSort(field); setOrder('desc'); }
  };

  const sortArrow = (field: string) => sort !== field ? '' : order === 'desc' ? ' \u2193' : ' \u2191';

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === songs.length) setSelected(new Set());
    else setSelected(new Set(songs.map(s => s.id)));
  };

  const exportCSV = () => {
    const rows = songs.filter(s => selected.has(s.id));
    if (rows.length === 0) return;
    const headers = ['Title', 'Artist', 'Status', 'Genre', 'BPM', 'Key', 'Streams', 'ISRC', 'Distributor'];
    const csv = [
      headers.join(','),
      ...rows.map(s => [
        `"${s.title}"`, s.artist, s.status, `"${s.genre.join('; ')}"`,
        s.bpm ?? '', s.key ?? '', s.total_streams, s.isrc ?? '', s.distributor ?? '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'catalog-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const buildSongHref = (slug: string) =>
    artist !== 'all' ? `/catalog/${slug}?artist=${artistToParam(artist)}` : `/catalog/${slug}`;

  if (error) {
    return (
      <div>
        <PageHeader title="Catalog" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load catalog: {error}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Catalog" />

      {/* Search + filter toggle */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search songs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none sm:w-64"
        />
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? 'border-orange-600 bg-orange-600/20 text-orange-300'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {filtersOpen ? '\u25B4' : '\u25BE'}
        </button>

        {/* View mode */}
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-gray-800/50 p-1">
          {(['table', 'cards', 'compact'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                viewMode === mode ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >{mode}</button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{total} song{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Collapsible filters */}
      {filtersOpen && (
        <div className="mt-3 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="Released">Released</option>
                <option value="Unreleased">Unreleased</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Genre</label>
              <input
                type="text"
                placeholder="e.g. Pop"
                value={genreFilter}
                onChange={e => setGenreFilter(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter(''); setGenreFilter(''); }}
                className="self-end rounded-lg px-3 py-1.5 text-xs text-orange-400 hover:text-orange-300"
              >Clear all</button>
            )}
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-orange-800/50 bg-orange-950/20 px-4 py-2">
          <span className="text-sm text-orange-300">{selected.size} selected</span>
          <button onClick={exportCSV} className="rounded bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-500">Export CSV</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-white">Clear</button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={songs.length > 0 && selected.size === songs.length} onChange={toggleAll} className="rounded border-gray-600" />
                </th>
                <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => toggleSort('title')}>Title{sortArrow('title')}</th>
                <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => toggleSort('artist')}>Artist{sortArrow('artist')}</th>
                <th className="hidden px-3 py-3 md:table-cell">Genre</th>
                <th className="hidden px-3 py-3 lg:table-cell">BPM</th>
                <th className="hidden px-3 py-3 lg:table-cell">Key</th>
                <th className="cursor-pointer px-3 py-3 text-right hover:text-gray-300" onClick={() => toggleSort('total_streams')}>Streams{sortArrow('total_streams')}</th>
                <th className="hidden px-3 py-3 md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td colSpan={8} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-800/50" /></td>
                  </tr>
                ))
              ) : songs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">No songs found matching your filters.</td>
                </tr>
              ) : (
                songs.map(song => {
                  const artistColor = ARTIST_COLORS[song.artist as Artist] ?? '#6b7280';
                  return (
                    <tr key={song.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(song.id)} onChange={() => toggleSelect(song.id)} className="rounded border-gray-600" />
                      </td>
                      <td className="px-3 py-3">
                        <Link href={buildSongHref(song.slug)} className="font-medium text-white hover:text-orange-400">{song.title}</Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: `${artistColor}33`, color: artistColor }}>{song.artist}</span>
                      </td>
                      <td className="hidden px-3 py-3 text-gray-400 md:table-cell">{song.genre.slice(0, 2).join(', ')}</td>
                      <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{song.bpm ?? '\u2014'}</td>
                      <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{song.key ?? '\u2014'}</td>
                      <td className="px-3 py-3 text-right text-gray-300">{formatNumber(song.total_streams)}</td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          song.status === 'Released' ? 'bg-green-900/50 text-green-300' :
                          song.status === 'In Progress' ? 'bg-orange-900/50 text-orange-300' :
                          'bg-amber-900/50 text-amber-300'
                        }`}>{song.status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-800/50" />)
          ) : songs.length === 0 ? (
            <p className="col-span-full py-8 text-center text-gray-500">No songs found.</p>
          ) : (
            songs.map(song => {
              const color = ARTIST_COLORS[song.artist as Artist] ?? '#6b7280';
              return (
                <Link key={song.id} href={buildSongHref(song.slug)} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 transition-colors hover:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{song.title}</p>
                      <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${color}22`, color }}>{song.artist}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      song.status === 'Released' ? 'bg-green-900/50 text-green-300' :
                      song.status === 'In Progress' ? 'bg-orange-900/50 text-orange-300' :
                      'bg-amber-900/50 text-amber-300'
                    }`}>{song.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {song.genre.slice(0, 3).map(g => <span key={g} className="rounded bg-gray-700/50 px-1.5 py-0.5 text-xs text-gray-400">{g}</span>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{song.bpm ? `${song.bpm} BPM` : '\u2014'} &middot; {song.key ?? '\u2014'}</span>
                    <span className="font-medium text-gray-300">{formatNumber(song.total_streams)}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Compact View */}
      {viewMode === 'compact' && (
        <div className="mt-4 divide-y divide-gray-800/50">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-8 animate-pulse bg-gray-800/50" />)
          ) : songs.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No songs found.</p>
          ) : (
            songs.map(song => (
              <Link key={song.id} href={buildSongHref(song.slug)} className="flex items-center gap-3 px-2 py-2 text-sm transition-colors hover:bg-gray-800/30">
                <span className="min-w-0 flex-1 truncate font-medium text-white">{song.title}</span>
                <span className="shrink-0 text-xs" style={{ color: ARTIST_COLORS[song.artist as Artist] ?? '#6b7280' }}>{song.artist}</span>
                <span className="shrink-0 w-16 text-right text-xs text-gray-400">{formatNumber(song.total_streams)}</span>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {(hasMore || page > 1) && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => fetchSongs(page - 1)} disabled={page <= 1} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <button onClick={() => fetchSongs(page + 1)} disabled={!hasMore} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
