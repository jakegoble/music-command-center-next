'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongSummary, CatalogResponse } from '@/lib/types';

// ---------------------------------------------------------------------------
// Registration tracker
//
// Reads the registration checkboxes already present on the Notion Main Catalog
// database and surfaces, per work, which societies it is registered with.
// Source of truth is Notion. Nothing here writes back.
// ---------------------------------------------------------------------------

const SOCIETIES = [
  { key: 'mlc_registered', label: 'MLC', hint: 'US mechanicals' },
  { key: 'ascap_registered', label: 'ASCAP', hint: 'Performance' },
  { key: 'soundexchange_registered', label: 'SoundEx', hint: 'Digital performance' },
  { key: 'songtrust_registered', label: 'Songtrust', hint: 'Publishing admin' },
  { key: 'ppl_registered', label: 'PPL', hint: 'UK neighbouring' },
] as const;

type SocietyKey = (typeof SOCIETIES)[number]['key'];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** How many of the five societies a work is registered with. */
function coverage(song: SongSummary): number {
  return SOCIETIES.reduce((n, s) => n + (song[s.key as SocietyKey] ? 1 : 0), 0);
}

/** Streams sitting behind a missing MLC registration. */
function unregisteredStreams(songs: SongSummary[]): number {
  return songs.filter((s) => !s.mlc_registered).reduce((sum, s) => sum + (s.total_streams ?? 0), 0);
}

function Dot({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${on ? 'registered' : 'not registered'}`}
      className={`inline-flex h-6 min-w-[3.25rem] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tracking-wide ${
        on ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {label}
    </span>
  );
}

type SortKey = 'streams' | 'coverage' | 'title';
type FilterKey = 'all' | 'gaps' | 'complete' | 'nothing';

export default function RegistrationPage() {
  const { artist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('streams');
  const [filter, setFilter] = useState<FilterKey>('gaps');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: '100', sort: 'total_streams', order: 'desc' });
    if (artist !== 'all') params.set('artist', artistToParam(artist as Artist));

    fetch(`/api/catalog?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Catalog request failed (${r.status})`);
        return r.json() as Promise<CatalogResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setSongs(data.songs ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load the catalog.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist]);

  const released = useMemo(
    () => songs.filter((s) => (s.total_streams ?? 0) > 0 || s.status === 'Released'),
    [songs],
  );

  const stats = useMemo(() => {
    const total = released.length;
    const fully = released.filter((s) => coverage(s) === SOCIETIES.length).length;
    const none = released.filter((s) => coverage(s) === 0).length;
    const noMlc = released.filter((s) => !s.mlc_registered).length;
    return { total, fully, none, noMlc, atRisk: unregisteredStreams(released) };
  }, [released]);

  const rows = useMemo(() => {
    let list = [...released];

    if (filter === 'gaps') list = list.filter((s) => coverage(s) < SOCIETIES.length);
    if (filter === 'complete') list = list.filter((s) => coverage(s) === SOCIETIES.length);
    if (filter === 'nothing') list = list.filter((s) => coverage(s) === 0);

    list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'coverage') return coverage(a) - coverage(b);
      return (b.total_streams ?? 0) - (a.total_streams ?? 0);
    });

    return list;
  }, [released, filter, sort]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Registration" />
      <p className="mb-6 mt-1 text-sm text-gray-500">
        Which societies each work is registered with. Source of truth is Notion.
      </p>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Released works</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="text-2xl font-bold text-emerald-400">{stats.fully}</div>
          <div className="text-xs text-gray-500">Fully registered</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="text-2xl font-bold text-red-400">{stats.noMlc}</div>
          <div className="text-xs text-gray-500">Missing from the MLC</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="text-2xl font-bold text-amber-400">{formatNumber(stats.atRisk)}</div>
          <div className="text-xs text-gray-500">Streams with no MLC registration</div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500" htmlFor="reg-filter">
            Show
          </label>
          <select
            id="reg-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            className="min-h-[44px] rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm"
          >
            <option value="gaps">Has gaps</option>
            <option value="nothing">Registered nowhere</option>
            <option value="complete">Fully registered</option>
            <option value="all">Everything</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500" htmlFor="reg-sort">
            Sort by
          </label>
          <select
            id="reg-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="min-h-[44px] rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm"
          >
            <option value="streams">Streams</option>
            <option value="coverage">Least registered</option>
            <option value="title">Title</option>
          </select>
        </div>
        <p className="ml-auto text-xs text-gray-500">
          {rows.length} of {stats.total} shown
        </p>
      </div>

      {loading && <p className="py-12 text-center text-sm text-gray-500">Loading catalog…</p>}

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">Nothing matches that filter.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3">Work</th>
                <th className="px-3 py-3 text-right">Streams</th>
                <th className="px-3 py-3">Registered with</th>
                <th className="px-3 py-3">Splits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((song) => {
                const cov = coverage(song);
                return (
                  <tr
                    key={song.id}
                    className="border-b border-gray-900 align-top hover:bg-gray-900/40"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/catalog/${song.slug || toSlug(song.title)}`}
                        className="font-medium hover:underline"
                      >
                        {song.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span
                          style={{ color: ARTIST_COLORS[song.artist as Artist] ?? undefined }}
                        >
                          {song.artist}
                        </span>
                        {song.isrc && <code className="text-[11px]">{song.isrc}</code>}
                      </div>
                      {song.sync_restrictions && (
                        <div className="mt-1 text-xs text-amber-400/90">
                          ⚠ {song.sync_restrictions}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {formatNumber(song.total_streams ?? 0)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {SOCIETIES.map((s) => (
                          <Dot
                            key={s.key}
                            on={Boolean(song[s.key as SocietyKey])}
                            label={s.label}
                          />
                        ))}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-600">
                        {cov}/{SOCIETIES.length}
                      </div>
                    </td>
                    <td className="max-w-[22rem] px-3 py-3 text-xs text-gray-400">
                      {song.writer_splits ?? (
                        <span className="text-red-400">No split recorded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-600">
        Registration flags come from the Notion Main Catalog checkboxes. They record what has
        been submitted, not what a society has accepted — a work can show as registered here and
        still be unmatched or overclaimed at the MLC.
      </p>
    </div>
  );
}
