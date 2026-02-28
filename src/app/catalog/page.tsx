'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { SongSummary, CatalogResponse } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function CatalogPage() {
  const { artist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [sort, setSort] = useState('release_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [artist, sort, order, search, statusFilter, genreFilter]);

  useEffect(() => {
    fetchSongs(1);
  }, [fetchSongs]);

  const toggleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  };

  const sortIndicator = (field: string) => {
    if (sort !== field) return '';
    return order === 'desc' ? ' \u2193' : ' \u2191';
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Catalog" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to load catalog: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Catalog" />

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search songs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Released">Released</option>
          <option value="Unreleased">Unreleased</option>
          <option value="In Progress">In Progress</option>
        </select>
        <input
          type="text"
          placeholder="Genre filter..."
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
        <span className="ml-auto text-sm text-gray-400">
          {total} song{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => toggleSort('title')}>
                Title{sortIndicator('title')}
              </th>
              <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => toggleSort('artist')}>
                Artist{sortIndicator('artist')}
              </th>
              <th className="hidden px-3 py-3 md:table-cell">Status</th>
              <th className="hidden px-3 py-3 lg:table-cell">Genre</th>
              <th className="hidden px-3 py-3 lg:table-cell">BPM</th>
              <th className="hidden px-3 py-3 lg:table-cell">Key</th>
              <th className="cursor-pointer px-3 py-3 text-right hover:text-gray-300" onClick={() => toggleSort('total_streams')}>
                Streams{sortIndicator('total_streams')}
              </th>
              <th className="hidden px-3 py-3 lg:table-cell">Distributor</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td colSpan={8} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-gray-800/50" />
                  </td>
                </tr>
              ))
            ) : songs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                  No songs found matching your filters.
                </td>
              </tr>
            ) : (
              songs.map((song) => (
                <tr key={song.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-3 py-3">
                    <Link
                      href={artist !== 'all' ? `/catalog/${song.slug}?artist=${artistToParam(artist)}` : `/catalog/${song.slug}`}
                      className="font-medium text-white hover:text-purple-400"
                    >
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-300">{song.artist}</td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      song.status === 'Released' ? 'bg-green-900/50 text-green-300' :
                      song.status === 'In Progress' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-700/50 text-gray-300'
                    }`}>
                      {song.status}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{song.genre.join(', ')}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{song.bpm ?? '\u2014'}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{song.key ?? '\u2014'}</td>
                  <td className="px-3 py-3 text-right text-gray-300">{formatNumber(song.total_streams)}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{song.distributor ?? '\u2014'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(hasMore || page > 1) && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => fetchSongs(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <button
            onClick={() => fetchSongs(page + 1)}
            disabled={!hasMore}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
