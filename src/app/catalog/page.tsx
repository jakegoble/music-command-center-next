'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongSummary, CatalogResponse, CatalogStats } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type ViewMode = 'table' | 'cards' | 'compact';
type CatalogTab = 'Explorer' | 'Health' | 'Timeline';

// Three-state toggle for boolean filters
function TriToggle({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <div className="flex items-center gap-0.5 rounded-lg bg-gray-900 p-0.5">
        {[
          { v: '', l: 'Any' },
          { v: 'true', l: 'Yes' },
          { v: 'false', l: 'No' },
        ].map(opt => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              value === opt.v ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >{opt.l}</button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health Tab Component
// ---------------------------------------------------------------------------
function HealthTab({ songs, stats }: { songs: SongSummary[]; stats: CatalogStats | null }) {
  const issues = useMemo(() => {
    const missingISRC = songs.filter(s => !s.isrc);
    const missingStreams = songs.filter(s => s.total_streams === 0 && s.status === 'Released');
    const missingBPM = songs.filter(s => !s.bpm);
    const missingKey = songs.filter(s => !s.key);
    const missingGenre = songs.filter(s => s.genre.length === 0);
    const missingArtwork = songs.filter(s => !s.artwork);
    const notSyncReady = songs.filter(s => s.status === 'Released' && !s.sync_available);
    const noStems = songs.filter(s => s.status === 'Released' && !s.stems_complete);
    const noAtmos = songs.filter(s => s.status === 'Released' && !s.atmos_mix);
    const releasedNoDistributor = songs.filter(s => s.status === 'Released' && !s.distributor);
    return { missingISRC, missingStreams, missingBPM, missingKey, missingGenre, missingArtwork, notSyncReady, noStems, noAtmos, releasedNoDistributor };
  }, [songs]);

  const categories = [
    { label: 'Missing ISRC', items: issues.missingISRC, severity: 'high' as const },
    { label: 'Released with 0 Streams', items: issues.missingStreams, severity: 'high' as const },
    { label: 'Released, No Distributor', items: issues.releasedNoDistributor, severity: 'high' as const },
    { label: 'Missing Artwork', items: issues.missingArtwork, severity: 'medium' as const },
    { label: 'Missing BPM', items: issues.missingBPM, severity: 'low' as const },
    { label: 'Missing Key', items: issues.missingKey, severity: 'low' as const },
    { label: 'Missing Genre', items: issues.missingGenre, severity: 'medium' as const },
    { label: 'Not Sync Ready (Released)', items: issues.notSyncReady, severity: 'medium' as const },
    { label: 'No Stems (Released)', items: issues.noStems, severity: 'low' as const },
    { label: 'No Atmos (Released)', items: issues.noAtmos, severity: 'low' as const },
  ];

  const totalIssues = categories.reduce((s, c) => s + c.items.length, 0);
  const healthScore = songs.length > 0 ? Math.max(0, Math.round(100 - (totalIssues / songs.length) * 10)) : 100;

  const severityStyles = {
    high: 'border-l-red-500 bg-red-900/10',
    medium: 'border-l-amber-500 bg-amber-900/10',
    low: 'border-l-blue-500 bg-blue-900/10',
  };

  return (
    <div className="mt-6">
      {/* Health Score */}
      <div className="mb-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-500">Catalog Health Score</p>
        <p className={`mt-1 text-5xl font-bold ${healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
          {healthScore}
        </p>
        <p className="mt-1 text-sm text-gray-400">{totalIssues} issues across {songs.length} songs</p>
      </div>

      {/* Completeness Overview */}
      {stats && songs.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Has ISRC', count: songs.filter(s => s.isrc).length, total: songs.length, color: '#3B82F6' },
            { label: 'Has Artwork', count: songs.filter(s => s.artwork).length, total: songs.length, color: '#F59E0B' },
            { label: 'Sync Ready', count: stats.sync_ready, total: stats.released || 1, color: '#F97316' },
            { label: 'Stems Complete', count: stats.has_stems, total: stats.released || 1, color: '#EC4899' },
          ].map(m => {
            const pct = Math.round((m.count / m.total) * 100);
            return (
              <div key={m.label} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{m.label}</span>
                  <span className="text-sm font-bold text-white">{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-900">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: m.color }} />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">{m.count} / {m.total}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Categories */}
      <div className="space-y-3">
        {categories.filter(c => c.items.length > 0).map(cat => (
          <details key={cat.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${severityStyles[cat.severity]} p-4`}>
            <summary className="flex cursor-pointer items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cat.severity === 'high' ? 'bg-red-400' : cat.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <span className="text-sm font-medium text-white">{cat.label}</span>
              </div>
              <span className="rounded-full bg-gray-700/50 px-2 py-0.5 text-xs text-gray-300">{cat.items.length}</span>
            </summary>
            <div className="mt-3 space-y-1">
              {cat.items.slice(0, 20).map(song => (
                <Link key={song.id} href={`/catalog/${song.slug}`} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-800/50">
                  <span className="text-white">{song.title}</span>
                  <span className="text-xs text-gray-500">{song.artist}</span>
                </Link>
              ))}
              {cat.items.length > 20 && (
                <p className="px-2 text-xs text-gray-500">...and {cat.items.length - 20} more</p>
              )}
            </div>
          </details>
        ))}
        {categories.every(c => c.items.length === 0) && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-lg font-medium text-green-400">All clear!</p>
            <p className="mt-2 text-sm text-gray-500">No catalog health issues detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Tab Component
// ---------------------------------------------------------------------------
function TimelineTab({ songs }: { songs: SongSummary[] }) {
  const timelineSongs = useMemo(() => {
    return songs
      .filter(s => s.release_date)
      .sort((a, b) => new Date(b.release_date!).getTime() - new Date(a.release_date!).getTime());
  }, [songs]);

  // Group by year-month
  const grouped = useMemo(() => {
    const map: Record<string, SongSummary[]> = {};
    for (const s of timelineSongs) {
      const ym = s.release_date!.slice(0, 7); // YYYY-MM
      if (!map[ym]) map[ym] = [];
      map[ym].push(s);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [timelineSongs]);

  const monthName = (ym: string) => {
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="mt-6">
      {timelineSongs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-lg font-medium text-gray-400">No releases with dates.</p>
          <p className="mt-2 text-sm text-gray-500">Songs with release dates will appear on the timeline.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700/50 md:left-32" />

          {grouped.map(([ym, items]) => (
            <div key={ym} className="relative mb-8">
              {/* Month label */}
              <div className="mb-3 flex items-center gap-3">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 md:absolute md:left-[108px]">
                  <span className="text-xs font-bold text-white">{items.length}</span>
                </div>
                <span className="text-sm font-semibold text-gray-300 md:absolute md:left-0 md:w-28 md:text-right">{monthName(ym)}</span>
              </div>

              {/* Songs in this month */}
              <div className="ml-12 space-y-2 md:ml-44">
                {items.map(song => {
                  const color = ARTIST_COLORS[song.artist as Artist] ?? '#6b7280';
                  return (
                    <Link
                      key={song.id}
                      href={`/catalog/${song.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 p-3 transition-colors hover:border-gray-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-white">{song.title}</span>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${color}22`, color }}>{song.artist}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          {song.album_ep && <span className="text-indigo-400">{song.album_ep}</span>}
                          {song.genre.slice(0, 2).map(g => <span key={g}>{g}</span>)}
                          {song.bpm && <span>{song.bpm} BPM</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-gray-300">{formatNumber(song.total_streams)}</p>
                        <p className="text-[10px] text-gray-500">{song.release_date}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Catalog Page
// ---------------------------------------------------------------------------
export default function CatalogPage() {
  const { artist } = useArtistContext();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [allSongs, setAllSongs] = useState<SongSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<CatalogTab>('Explorer');
  const [stats, setStats] = useState<CatalogStats | null>(null);

  // Filter options (from stats)
  const [filterOptions, setFilterOptions] = useState<{
    genres: string[];
    moods: string[];
    keys: string[];
    distributors: string[];
    albums: string[];
  } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [keyFilter, setKeyFilter] = useState('');
  const [distributorFilter, setDistributorFilter] = useState('');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [syncAvailable, setSyncAvailable] = useState('');
  const [atmosFilter, setAtmosFilter] = useState('');
  const [hasStemsFilter, setHasStemsFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [sort, setSort] = useState('release_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    statusFilter, genreFilter, moodFilter, keyFilter, distributorFilter,
    bpmMin, bpmMax, yearMin, yearMax, syncAvailable, atmosFilter, hasStemsFilter, albumFilter,
  ].filter(Boolean).length;

  // Fetch filter options from stats API
  useEffect(() => {
    const fetchStats = async () => {
      const params = new URLSearchParams();
      if (artist !== 'all') params.set('artist', artistToParam(artist));
      try {
        const r = await fetch(`/api/catalog/stats?${params}`);
        if (!r.ok) return;
        const data: CatalogStats = await r.json();
        setStats(data);
        setFilterOptions({
          genres: Object.keys(data.genre_distribution).sort(),
          moods: Object.keys(data.mood_distribution).sort(),
          keys: Object.keys(data.key_distribution).sort(),
          distributors: Object.keys(data.distributor_distribution).sort(),
          albums: Object.keys(data.album_distribution).sort(),
        });
      } catch { /* ignore */ }
    };
    fetchStats();
  }, [artist]);

  // Fetch all songs for Health/Timeline tabs
  useEffect(() => {
    if (activeTab === 'Health' || activeTab === 'Timeline') {
      const params = new URLSearchParams();
      if (artist !== 'all') params.set('artist', artistToParam(artist));
      params.set('limit', '100');
      params.set('sort', 'release_date');
      params.set('order', 'desc');
      fetch(`/api/catalog?${params}`)
        .then(r => r.json())
        .then(data => setAllSongs(data.songs ?? []))
        .catch(() => {});
    }
  }, [activeTab, artist]);

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
    if (moodFilter) params.set('mood', moodFilter);
    if (keyFilter) params.set('key', keyFilter);
    if (distributorFilter) params.set('distributor', distributorFilter);
    if (bpmMin) params.set('bpm_min', bpmMin);
    if (bpmMax) params.set('bpm_max', bpmMax);
    if (yearMin) params.set('year_min', yearMin);
    if (yearMax) params.set('year_max', yearMax);
    if (syncAvailable) params.set('sync_available', syncAvailable);
    if (atmosFilter) params.set('atmos', atmosFilter);
    if (hasStemsFilter) params.set('has_stems', hasStemsFilter);
    if (albumFilter) params.set('album_ep', albumFilter);

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
  }, [artist, sort, order, search, statusFilter, genreFilter, moodFilter, keyFilter, distributorFilter, bpmMin, bpmMax, yearMin, yearMax, syncAvailable, atmosFilter, hasStemsFilter, albumFilter]);

  useEffect(() => { fetchSongs(1); }, [fetchSongs]);

  const toggleSort = (field: string) => {
    if (sort === field) setOrder(order === 'desc' ? 'asc' : 'desc');
    else { setSort(field); setOrder('desc'); }
  };

  const sortIndicator = (field: string) => {
    if (sort !== field) return <span className="ml-1 text-gray-700">{'\u2195'}</span>;
    return <span className="ml-1 text-orange-400">{order === 'desc' ? '\u2193' : '\u2191'}</span>;
  };

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
    const headers = ['Title', 'Artist', 'Status', 'Genre', 'BPM', 'Key', 'Streams', 'ISRC', 'Distributor', 'Album/EP'];
    const csv = [
      headers.join(','),
      ...rows.map(s => [
        `"${s.title}"`, s.artist, s.status, `"${s.genre.join('; ')}"`,
        s.bpm ?? '', s.key ?? '', s.total_streams, s.isrc ?? '', s.distributor ?? '', `"${s.album_ep ?? ''}"`,
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'catalog-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllFilters = () => {
    setStatusFilter(''); setGenreFilter(''); setMoodFilter(''); setKeyFilter('');
    setDistributorFilter(''); setBpmMin(''); setBpmMax(''); setYearMin('');
    setYearMax(''); setSyncAvailable(''); setAtmosFilter(''); setHasStemsFilter('');
    setAlbumFilter('');
  };

  const buildSongHref = (song: SongSummary) => {
    // Collections / album containers link directly to the album page
    if (song.album_ep && toSlug(song.title) === toSlug(song.album_ep)) {
      const base = `/catalog/albums/${toSlug(song.album_ep)}`;
      return artist !== 'all' ? `${base}?artist=${artistToParam(artist)}` : base;
    }
    return artist !== 'all' ? `/catalog/${song.slug}?artist=${artistToParam(artist)}` : `/catalog/${song.slug}`;
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Catalog" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">Failed to load catalog: {error}</div>
      </div>
    );
  }

  const selectClasses = 'rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none';
  const inputClasses = 'w-20 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none';

  return (
    <div>
      <PageHeader title="Catalog" />

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-gray-800">
        {(['Explorer', 'Health', 'Timeline'] as CatalogTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >{tab}</button>
        ))}
      </div>

      {activeTab === 'Health' && <HealthTab songs={allSongs} stats={stats} />}
      {activeTab === 'Timeline' && <TimelineTab songs={allSongs} />}

      {activeTab === 'Explorer' && (
        <>
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

          {/* Active filter chips (visible when panel collapsed) */}
          {!filtersOpen && activeFilterCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {statusFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">{statusFilter}</span>}
              {genreFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">{genreFilter}</span>}
              {moodFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">{moodFilter}</span>}
              {keyFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">Key: {keyFilter}</span>}
              {distributorFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">{distributorFilter}</span>}
              {albumFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">{albumFilter}</span>}
              {syncAvailable && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">Sync: {syncAvailable === 'true' ? 'Yes' : 'No'}</span>}
              {atmosFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">Atmos: {atmosFilter === 'true' ? 'Yes' : 'No'}</span>}
              {hasStemsFilter && <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 text-xs font-medium">Stems: {hasStemsFilter === 'true' ? 'Yes' : 'No'}</span>}
              <button onClick={clearAllFilters} className="rounded-full bg-gray-700/50 px-2.5 py-0.5 text-xs text-gray-400 hover:text-white">Clear all</button>
            </div>
          )}

          {/* Collapsible filter panel */}
          {filtersOpen && (
            <div className="mt-3 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 space-y-5">
              {/* Sound Profile */}
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Sound Profile</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Genre</label>
                    <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} className={selectClasses}>
                      <option value="">All Genres</option>
                      {filterOptions?.genres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Mood</label>
                    <select value={moodFilter} onChange={e => setMoodFilter(e.target.value)} className={selectClasses}>
                      <option value="">All Moods</option>
                      {filterOptions?.moods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Key</label>
                    <select value={keyFilter} onChange={e => setKeyFilter(e.target.value)} className={selectClasses}>
                      <option value="">All Keys</option>
                      {filterOptions?.keys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">BPM Range</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" placeholder="Min" value={bpmMin} onChange={e => setBpmMin(e.target.value)} className={inputClasses} />
                      <span className="text-gray-600">&ndash;</span>
                      <input type="number" placeholder="Max" value={bpmMax} onChange={e => setBpmMax(e.target.value)} className={inputClasses} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Distribution */}
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Status & Distribution</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClasses}>
                      <option value="">All Status</option>
                      <option value="Released">Released</option>
                      <option value="Unreleased">Unreleased</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Distributor</label>
                    <select value={distributorFilter} onChange={e => setDistributorFilter(e.target.value)} className={selectClasses}>
                      <option value="">All Distributors</option>
                      {filterOptions?.distributors.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Album/EP</label>
                    <select value={albumFilter} onChange={e => setAlbumFilter(e.target.value)} className={selectClasses}>
                      <option value="">All Albums</option>
                      {filterOptions?.albums.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Year Range</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" placeholder="From" value={yearMin} onChange={e => setYearMin(e.target.value)} className={inputClasses} />
                      <span className="text-gray-600">&ndash;</span>
                      <input type="number" placeholder="To" value={yearMax} onChange={e => setYearMax(e.target.value)} className={inputClasses} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync & Deliverables */}
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Sync & Deliverables</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <TriToggle label="Sync Available" value={syncAvailable} onChange={setSyncAvailable} />
                  <TriToggle label="Atmos Mix" value={atmosFilter} onChange={setAtmosFilter} />
                  <TriToggle label="Stems" value={hasStemsFilter} onChange={setHasStemsFilter} />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="border-t border-gray-700/50 pt-3">
                  <button onClick={clearAllFilters} className="text-xs text-orange-400 hover:text-orange-300">
                    Clear all filters ({activeFilterCount})
                  </button>
                </div>
              )}
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
                    <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => toggleSort('title')}>Title{sortIndicator('title')}</th>
                    <th className="cursor-pointer px-3 py-3 hover:text-gray-300" onClick={() => toggleSort('artist')}>Artist{sortIndicator('artist')}</th>
                    <th className="hidden cursor-pointer px-3 py-3 hover:text-gray-300 md:table-cell" onClick={() => toggleSort('album_ep')}>Album/EP{sortIndicator('album_ep')}</th>
                    <th className="hidden cursor-pointer px-3 py-3 hover:text-gray-300 lg:table-cell" onClick={() => toggleSort('bpm')}>BPM{sortIndicator('bpm')}</th>
                    <th className="hidden cursor-pointer px-3 py-3 hover:text-gray-300 lg:table-cell" onClick={() => toggleSort('key')}>Key{sortIndicator('key')}</th>
                    <th className="cursor-pointer px-3 py-3 text-right hover:text-gray-300" onClick={() => toggleSort('total_streams')}>Streams{sortIndicator('total_streams')}</th>
                    <th className="hidden cursor-pointer px-3 py-3 hover:text-gray-300 md:table-cell" onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</th>
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
                            <Link href={buildSongHref(song)} className="font-medium text-white hover:text-orange-400">{song.title}</Link>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: `${artistColor}33`, color: artistColor }}>{song.artist}</span>
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell">
                            {song.album_ep ? (
                              <Link
                                href={`/catalog/albums/${toSlug(song.album_ep)}`}
                                className="rounded bg-indigo-900/30 px-1.5 py-0.5 text-xs text-indigo-300 hover:bg-indigo-900/50"
                              >{song.album_ep}</Link>
                            ) : <span className="text-gray-600">{'\u2014'}</span>}
                          </td>
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
                    <Link key={song.id} href={buildSongHref(song)} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 transition-colors hover:border-gray-600">
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
                      {song.album_ep && (
                        <p className="mt-1 text-xs text-indigo-400">from {song.album_ep}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
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
                  <Link key={song.id} href={buildSongHref(song)} className="flex items-center gap-3 px-2 py-2 text-sm transition-colors hover:bg-gray-800/30">
                    <span className="min-w-0 flex-1 truncate font-medium text-white">{song.title}</span>
                    {song.album_ep && <span className="shrink-0 rounded bg-indigo-900/30 px-1.5 py-0.5 text-[10px] text-indigo-300">{song.album_ep}</span>}
                    <span className="shrink-0 text-xs" style={{ color: ARTIST_COLORS[song.artist as Artist] ?? '#6b7280' }}>{song.artist}</span>
                    <span className="shrink-0 w-16 text-right text-xs text-gray-400">{formatNumber(song.total_streams)}</span>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <span className="text-xs text-gray-500">
                Showing {Math.min((page - 1) * 50 + 1, total)}&ndash;{Math.min(page * 50, total)} of {total} songs
              </span>
              {(hasMore || page > 1) && (
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchSongs(page - 1)} disabled={page <= 1} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                  {Array.from({ length: Math.ceil(total / 50) }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === Math.ceil(total / 50) || Math.abs(p - page) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === 'ellipsis' ? (
                        <span key={`e${i}`} className="px-1 text-gray-600">&hellip;</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => fetchSongs(p as number)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                            page === p ? 'bg-orange-600 text-white' : 'border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >{p}</button>
                      )
                    )}
                  <button onClick={() => fetchSongs(page + 1)} disabled={!hasMore} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              )}
            </div>
          )}

          {/* Songs by Distributor */}
          {stats && Object.keys(stats.distributor_distribution).length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Songs by Distributor</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(stats.distributor_distribution).sort((a, b) => b[1] - a[1]).map(([dist, count]) => (
                  <button
                    key={dist}
                    onClick={() => { setDistributorFilter(dist); setFiltersOpen(true); }}
                    className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-3 text-center transition-colors hover:border-orange-500/50 hover:bg-gray-800/50"
                  >
                    <p className="text-lg font-bold text-white">{count}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{dist}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
