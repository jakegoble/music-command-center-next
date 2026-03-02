'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { AlbumDetail } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AlbumDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { artist } = useArtistContext();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlbum = async () => {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (artist !== 'all') params.set('artist', artistToParam(artist));

      try {
        const r = await fetch(`/api/catalog/albums/${slug}?${params}`);
        if (!r.ok) throw new Error(r.status === 404 ? 'Album not found' : `Fetch failed: ${r.status}`);
        setAlbum(await r.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlbum();
  }, [slug, artist]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Album" />
        <div className="mt-6 space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-gray-800/50" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-800/50" />
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div>
        <PageHeader title="Album" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">{error ?? 'Album not found'}</div>
        <Link href="/catalog/albums" className="mt-3 inline-block text-sm text-orange-400 hover:text-orange-300">&larr; Back to Albums</Link>
      </div>
    );
  }

  const color = ARTIST_COLORS[album.artist as Artist] ?? '#6b7280';
  const buildSongHref = (songSlug: string) =>
    artist !== 'all' ? `/catalog/${songSlug}?artist=${artistToParam(artist)}` : `/catalog/${songSlug}`;

  return (
    <div>
      <Link href="/catalog/albums" className="text-sm text-gray-400 hover:text-white">&larr; Back to Albums</Link>

      {/* Album Hero */}
      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-gray-700/50 bg-gray-800/50 p-6 sm:flex-row">
        {album.artwork_url ? (
          <div className="h-[150px] w-[150px] shrink-0 overflow-hidden rounded-xl shadow-lg">
            <img src={album.artwork_url} alt={album.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div
            className="flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${color}55, ${color}11)` }}
          >
            <span className="text-4xl font-bold" style={{ color }}>{album.name.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white">{album.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-sm font-medium" style={{ backgroundColor: `${color}22`, color }}>{album.artist}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              album.status === 'Released' ? 'bg-green-900/50 text-green-300' :
              album.status === 'Mixed' ? 'bg-amber-900/50 text-amber-300' :
              'bg-gray-700/50 text-gray-400'
            }`}>{album.status}</span>
            {album.release_date && (
              <span className="text-sm text-gray-400">{new Date(album.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
          </div>
          {album.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {album.genres.map(g => <span key={g} className="rounded-full bg-purple-900/30 px-2 py-0.5 text-xs text-purple-300">{g}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Streams', value: formatNumber(album.total_streams) },
          { label: 'Tracks', value: album.track_count.toString() },
          { label: 'Avg BPM', value: album.avg_bpm?.toString() ?? '\u2014' },
          { label: 'Est. Revenue', value: formatCurrency(album.estimated_revenue) },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Track listing */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Tracks</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3 w-8">#</th>
                <th className="px-3 py-3">Title</th>
                <th className="hidden px-3 py-3 md:table-cell">Genre</th>
                <th className="hidden px-3 py-3 lg:table-cell">BPM</th>
                <th className="hidden px-3 py-3 lg:table-cell">Key</th>
                <th className="px-3 py-3 text-right">Streams</th>
                <th className="hidden px-3 py-3 md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {album.tracks.map((track, i) => (
                <tr key={track.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-3">
                    <Link href={buildSongHref(track.slug)} className="font-medium text-white hover:text-orange-400">{track.title}</Link>
                  </td>
                  <td className="hidden px-3 py-3 text-gray-400 md:table-cell">{track.genre.slice(0, 2).join(', ')}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{track.bpm ?? '\u2014'}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{track.key ?? '\u2014'}</td>
                  <td className="px-3 py-3 text-right text-gray-300">{formatNumber(track.total_streams)}</td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      track.status === 'Released' ? 'bg-green-900/50 text-green-300' :
                      track.status === 'In Progress' ? 'bg-orange-900/50 text-orange-300' :
                      'bg-amber-900/50 text-amber-300'
                    }`}>{track.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync readiness summary */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Sync Ready', count: album.sync_ready_count, color: 'green' },
          { label: 'Atmos Mix', count: album.has_atmos_count, color: 'blue' },
          { label: 'Stems Available', count: album.has_stems_count, color: 'purple' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 text-center">
            <p className="text-2xl font-bold text-white">{item.count}<span className="text-sm text-gray-500">/{album.track_count}</span></p>
            <p className="mt-1 text-xs text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
