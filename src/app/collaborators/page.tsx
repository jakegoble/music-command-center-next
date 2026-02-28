'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { CollaboratorDetail } from '@/lib/types';

export default function CollaboratorsPage() {
  const { artist } = useArtistContext();
  const [collaborators, setCollaborators] = useState<CollaboratorDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/collaborators')
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setCollaborators(data.collaborators ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Collaborators" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to load collaborators: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Collaborators" />

      <p className="mt-2 text-sm text-gray-400">{collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Roles</th>
              <th className="px-3 py-3">PRO</th>
              <th className="hidden px-3 py-3 md:table-cell">Songs</th>
              <th className="px-3 py-3">Agreement</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td colSpan={5} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-gray-800/50" />
                  </td>
                </tr>
              ))
            ) : collaborators.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No collaborators found.
                </td>
              </tr>
            ) : (
              collaborators.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-3 py-3">
                    <Link
                      href={artist !== 'all' ? `/collaborators/${c.slug}?artist=${artistToParam(artist)}` : `/collaborators/${c.slug}`}
                      className="font-medium text-white hover:text-purple-400"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-400">{c.roles.join(', ')}</td>
                  <td className="px-3 py-3 text-gray-400">{c.pro_affiliation ?? '\u2014'}</td>
                  <td className="hidden px-3 py-3 text-gray-300 md:table-cell">{c.song_count}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.agreement_status === 'Active' ? 'bg-green-900/50 text-green-300' :
                      c.agreement_status === 'Pending' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-700/50 text-gray-300'
                    }`}>{c.agreement_status ?? '\u2014'}</span>
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
