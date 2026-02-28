'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { DataAuditResponse } from '@/lib/types';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function DataAuditPage() {
  const { artist } = useArtistContext();
  const [audit, setAudit] = useState<DataAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';

    fetch(`/api/data-audit${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setAudit(data);
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
        <PageHeader title="Data Audit" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to run data audit: {error}
        </div>
      </div>
    );
  }

  if (isLoading || !audit) {
    return (
      <div>
        <PageHeader title="Data Audit" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Data Audit" />

      {/* Cross-Check Results */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className={`rounded-lg border p-5 ${audit.sumsMatch ? 'border-green-800 bg-green-950/30' : 'border-red-800 bg-red-950/30'}`}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Stream Sum Cross-Check</h3>
          <p className={`mt-2 text-lg font-bold ${audit.sumsMatch ? 'text-green-300' : 'text-red-300'}`}>
            {audit.sumsMatch ? 'PASS' : 'FAIL'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            All: {formatNumber(audit.allArtistSum)} | Per-artist sum: {formatNumber(audit.individualArtistSum)}
          </p>
        </div>
        <div className={`rounded-lg border p-5 ${audit.countsMatch ? 'border-green-800 bg-green-950/30' : 'border-red-800 bg-red-950/30'}`}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Song Count Cross-Check</h3>
          <p className={`mt-2 text-lg font-bold ${audit.countsMatch ? 'text-green-300' : 'text-red-300'}`}>
            {audit.countsMatch ? 'PASS' : 'FAIL'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            All: {audit.allSongCount} | Per-artist sum: {audit.perArtistSongCount}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Total Songs</p>
          <p className="mt-1 text-2xl font-bold text-white">{audit.totalSongs}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Total Streams</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatNumber(audit.totalStreams)}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Duplicates Found</p>
          <p className="mt-1 text-2xl font-bold text-white">{audit.duplicateSongs.length}</p>
        </div>
      </div>

      {/* Per-Artist Breakdown */}
      <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Songs by Artist</h3>
        <div className="space-y-2">
          {Object.entries(audit.songsByArtist).map(([name, count]) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{name}</span>
              <span className="text-sm font-medium text-white">{count} songs / {formatNumber(audit.streamsByArtist[name] ?? 0)} streams</span>
            </div>
          ))}
        </div>
      </div>

      {/* Null Fields */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Missing ISRC ({audit.nullFields.missingISRC.length})
          </h3>
          {audit.nullFields.missingISRC.length === 0 ? (
            <p className="text-sm text-green-400">All songs have ISRCs</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {audit.nullFields.missingISRC.map((title) => (
                <li key={title} className="text-sm text-yellow-300">{title}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Zero Streams ({audit.nullFields.missingStreams.length})
          </h3>
          {audit.nullFields.missingStreams.length === 0 ? (
            <p className="text-sm text-green-400">All songs have stream data</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {audit.nullFields.missingStreams.map((title) => (
                <li key={title} className="text-sm text-yellow-300">{title}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Duplicates */}
      {audit.duplicateSongs.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Duplicate Songs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">ISRC</th>
                  <th className="px-3 py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {audit.duplicateSongs.map((d, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-3 py-2 text-white">{d.title}</td>
                    <td className="px-3 py-2 text-gray-400">{d.isrc ?? 'N/A'}</td>
                    <td className="px-3 py-2 text-gray-400">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
