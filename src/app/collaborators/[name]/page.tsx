'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam } from '@/config/notion';
import type { CollaboratorDetail } from '@/lib/types';

export default function CollaboratorDetailPage() {
  const { name: slug } = useParams<{ name: string }>();
  const { artist } = useArtistContext();
  const [collaborator, setCollaborator] = useState<CollaboratorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/collaborators/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Collaborator not found' : `Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setCollaborator(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return (
      <div>
        <PageHeader title="Collaborator" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          {error}
        </div>
        <Link
          href={artist !== 'all' ? `/collaborators?artist=${artistToParam(artist)}` : '/collaborators'}
          className="mt-4 inline-block text-sm text-purple-400 hover:underline"
        >
          Back to Collaborators
        </Link>
      </div>
    );
  }

  if (isLoading || !collaborator) {
    return (
      <div>
        <PageHeader title="Collaborator" />
        <div className="mt-6 space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-gray-800/50" />
          <div className="h-48 animate-pulse rounded-lg bg-gray-800/50" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={artist !== 'all' ? `/collaborators?artist=${artistToParam(artist)}` : '/collaborators'}
          className="text-sm text-gray-400 hover:text-white"
        >
          {'\u2190'} Back to Collaborators
        </Link>
      </div>

      <PageHeader title={collaborator.name} />

      {/* Profile Card */}
      <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Roles</dt>
              <dd className="text-sm text-white">{collaborator.roles.join(', ') || '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">PRO Affiliation</dt>
              <dd className="text-sm text-white">{collaborator.pro_affiliation ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">IPI Number</dt>
              <dd className="text-sm text-white">{collaborator.ipi_number ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Agreement Status</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  collaborator.agreement_status === 'Active' ? 'bg-green-900/50 text-green-300' :
                  collaborator.agreement_status === 'Pending' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-gray-700/50 text-gray-300'
                }`}>{collaborator.agreement_status ?? '\u2014'}</span>
              </dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm text-white">{collaborator.email ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm text-white">{collaborator.phone ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Song Count</dt>
              <dd className="text-sm text-white">{collaborator.song_count}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Linked Songs */}
      {collaborator.songs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Linked Songs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3">Artist</th>
                </tr>
              </thead>
              <tbody>
                {collaborator.songs.map((s) => (
                  <tr key={s.slug} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                    <td className="px-3 py-3">
                      <Link
                        href={artist !== 'all' ? `/catalog/${s.slug}?artist=${artistToParam(artist)}` : `/catalog/${s.slug}`}
                        className="text-white hover:text-purple-400"
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{s.artist}</td>
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
