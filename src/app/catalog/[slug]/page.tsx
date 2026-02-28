'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongDetail } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CheckIcon({ checked }: { checked: boolean }) {
  return checked
    ? <span className="text-green-400">{'\u2713'}</span>
    : <span className="text-gray-600">{'\u2717'}</span>;
}

// ---------------------------------------------------------------------------
// Song Hero
// ---------------------------------------------------------------------------

function SongHero({ song }: { song: SongDetail }) {
  const color = song.artist ? (ARTIST_COLORS[song.artist as Artist] ?? '#6b7280') : '#6b7280';

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{song.title}</h2>
          <p className="mt-1 text-sm" style={{ color }}>{song.artist}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              song.status === 'Released' ? 'bg-green-900/50 text-green-300' :
              song.status === 'In Progress' ? 'bg-yellow-900/50 text-yellow-300' :
              'bg-gray-700/50 text-gray-300'
            }`}>{song.status}</span>
            {song.genre.map((g) => (
              <span key={g} className="rounded-full bg-purple-900/30 px-2.5 py-0.5 text-xs text-purple-300">{g}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{formatNumber(song.total_streams)}</p>
            <p className="text-xs text-gray-500">Streams</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatCurrency(song.estimated_revenue)}</p>
            <p className="text-xs text-gray-500">Est. Revenue</p>
          </div>
        </div>
      </div>

      {/* DSP Links */}
      <div className="mt-4 flex flex-wrap gap-3">
        {song.spotify_link && (
          <a href={song.spotify_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-900/50">Spotify</a>
        )}
        {song.apple_music_link && (
          <a href={song.apple_music_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-pink-900/30 px-3 py-1.5 text-xs font-medium text-pink-300 hover:bg-pink-900/50">Apple Music</a>
        )}
        {song.youtube_link && (
          <a href={song.youtube_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50">YouTube</a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ song }: { song: SongDetail }) {
  const details = [
    { label: 'Album/EP', value: song.album_ep },
    { label: 'Release Date', value: song.release_date },
    { label: 'BPM', value: song.bpm?.toString() },
    { label: 'Key', value: song.key },
    { label: 'Duration', value: song.duration },
    { label: 'ISRC', value: song.isrc },
    { label: 'UPC', value: song.upc },
    { label: 'Distributor', value: song.distributor },
    { label: 'Producers', value: song.producers },
    { label: 'Songwriters', value: song.songwriters },
    { label: 'Publisher', value: song.publisher },
    { label: 'Master Ownership', value: song.master_ownership },
    { label: 'Popularity Score', value: song.popularity_score?.toString() },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Details</h3>
        <dl className="space-y-2">
          {details.map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm text-white">{value ?? '\u2014'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Mood Tags</h3>
        <div className="flex flex-wrap gap-2">
          {song.mood.length > 0 ? song.mood.map((m) => (
            <span key={m} className="rounded-full bg-cyan-900/30 px-2.5 py-0.5 text-xs text-cyan-300">{m}</span>
          )) : <span className="text-sm text-gray-500">No mood tags</span>}
        </div>

        {song.notes && (
          <>
            <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-gray-400">Notes</h3>
            <p className="text-sm text-gray-300">{song.notes}</p>
          </>
        )}

        {song.similar_artists && (
          <>
            <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-gray-400">Similar Artists</h3>
            <p className="text-sm text-gray-300">{song.similar_artists}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Rights & Registration
// ---------------------------------------------------------------------------

function RightsTab({ song }: { song: SongDetail }) {
  const registrations = [
    { label: 'ASCAP Registered', value: song.ascap_registered },
    { label: 'MLC Registered', value: song.mlc_registered },
    { label: 'SoundExchange Registered', value: song.soundexchange_registered },
    { label: 'YouTube Content ID', value: song.youtube_content_id },
    { label: 'PPL Registered', value: song.ppl_registered },
    { label: 'Songtrust Registered', value: song.songtrust_registered },
  ];

  const submissions = [
    { label: 'LyricFind', value: song.lyricfind_submitted },
    { label: 'Musixmatch', value: song.musixmatch_submitted },
    { label: 'Genius', value: song.genius_submitted },
    { label: 'Music Gateway', value: song.music_gateway_submitted },
    { label: 'DISCO', value: song.disco_submitted },
    { label: 'Songtradr', value: song.songtradr_submitted },
    { label: 'Discogs', value: song.discogs_submitted },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">PRO Registrations</h3>
        <div className="space-y-2">
          {registrations.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{label}</span>
              <CheckIcon checked={value} />
            </div>
          ))}
        </div>
        {song.songtrust_id && (
          <p className="mt-3 text-xs text-gray-500">Songtrust ID: {song.songtrust_id}</p>
        )}
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Lyric & Marketplace Submissions</h3>
        <div className="space-y-2">
          {submissions.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{label}</span>
              <CheckIcon checked={value} />
            </div>
          ))}
        </div>
        {song.disco_link && (
          <a href={song.disco_link} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-purple-400 hover:underline">View on DISCO</a>
        )}
      </div>
      {song.writer_splits_parsed.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Writer Splits</h3>
          <div className="space-y-2">
            {song.writer_splits_parsed.map((split, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{split.name}</span>
                <span className="text-sm font-medium text-white">{split.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Sync
// ---------------------------------------------------------------------------

function SyncTab({ song }: { song: SongDetail }) {
  const assets = [
    { label: 'Instrumental', value: song.has_instrumental },
    { label: 'Acapella', value: song.has_acapella },
    { label: '15s Edit', value: song.has_15s_edit },
    { label: '30s Edit', value: song.has_30s_edit },
    { label: '60s Edit', value: song.has_60s_edit },
    { label: '360 Reality Audio', value: song.has_360ra },
    { label: 'Project File', value: song.has_project_file },
    { label: 'Atmos Mix', value: song.atmos_mix },
    { label: 'Stems Complete', value: song.stems_complete },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Sync Licensing</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Available for Sync</dt>
            <dd><CheckIcon checked={song.sync_available} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Sync Tier</dt>
            <dd className="text-sm text-white">{song.sync_tier ?? '\u2014'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Sync Status</dt>
            <dd className="text-sm text-white">{song.sync_status ?? '\u2014'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Sync Edit Status</dt>
            <dd className="text-sm text-white">{song.sync_edit_status ?? '\u2014'}</dd>
          </div>
          {song.sync_restrictions && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Restrictions</dt>
              <dd className="text-sm text-white">{song.sync_restrictions}</dd>
            </div>
          )}
        </dl>
        {song.usage_scenarios.length > 0 && (
          <>
            <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-gray-400">Usage Scenarios</h4>
            <div className="flex flex-wrap gap-2">
              {song.usage_scenarios.map((s) => (
                <span key={s} className="rounded-full bg-orange-900/30 px-2.5 py-0.5 text-xs text-orange-300">{s}</span>
              ))}
            </div>
          </>
        )}
        {song.scene_suggestions && (
          <>
            <h4 className="mb-1 mt-4 text-xs font-semibold uppercase text-gray-400">Scene Suggestions</h4>
            <p className="text-sm text-gray-300">{song.scene_suggestions}</p>
          </>
        )}
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Asset Availability</h3>
        <div className="space-y-2">
          {assets.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{label}</span>
              <CheckIcon checked={value} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Collaborators (renamed from Contracts tab — we have both)
// ---------------------------------------------------------------------------

function CollaboratorsTab({ song }: { song: SongDetail }) {
  const { artist } = useArtistContext();

  if (song.collaborators.length === 0) {
    return <p className="py-8 text-center text-gray-500">No collaborators linked to this song.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Roles</th>
            <th className="px-3 py-3">PRO</th>
            <th className="px-3 py-3">IPI</th>
            <th className="px-3 py-3">Agreement</th>
          </tr>
        </thead>
        <tbody>
          {song.collaborators.map((c) => (
            <tr key={c.id} className="border-b border-gray-800/50">
              <td className="px-3 py-3">
                <Link
                  href={artist !== 'all' ? `/collaborators/${c.slug}?artist=${artistToParam(artist)}` : `/collaborators/${c.slug}`}
                  className="text-white hover:text-purple-400"
                >
                  {c.name}
                </Link>
              </td>
              <td className="px-3 py-3 text-gray-400">{c.roles.join(', ')}</td>
              <td className="px-3 py-3 text-gray-400">{c.pro_affiliation ?? '\u2014'}</td>
              <td className="px-3 py-3 text-gray-400">{c.ipi_number ?? '\u2014'}</td>
              <td className="px-3 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.agreement_status === 'Active' ? 'bg-green-900/50 text-green-300' :
                  c.agreement_status === 'Pending' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-gray-700/50 text-gray-300'
                }`}>{c.agreement_status ?? '\u2014'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Contracts
// ---------------------------------------------------------------------------

function ContractsTab({ song }: { song: SongDetail }) {
  if (song.contracts.length === 0) {
    return <p className="py-8 text-center text-gray-500">No contracts linked to this song.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
            <th className="px-3 py-3">Document</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Parties</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Signed</th>
            <th className="px-3 py-3">Expires</th>
          </tr>
        </thead>
        <tbody>
          {song.contracts.map((c) => (
            <tr key={c.id} className="border-b border-gray-800/50">
              <td className="px-3 py-3 text-white">{c.document_name}</td>
              <td className="px-3 py-3 text-gray-400">{c.type ?? '\u2014'}</td>
              <td className="px-3 py-3 text-gray-400">{c.parties ?? '\u2014'}</td>
              <td className="px-3 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.status === 'Active' ? 'bg-green-900/50 text-green-300' :
                  c.status === 'Expired' ? 'bg-red-900/50 text-red-300' :
                  'bg-gray-700/50 text-gray-300'
                }`}>{c.status ?? '\u2014'}</span>
              </td>
              <td className="px-3 py-3 text-gray-400">{c.date_signed ?? '\u2014'}</td>
              <td className="px-3 py-3 text-gray-400">{c.expiration ?? '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Revenue (FIX 2 — clearly labeled as artist-level data)
// ---------------------------------------------------------------------------

function RevenueTab({ song }: { song: SongDetail }) {
  if (song.royalties.length === 0) {
    return <p className="py-8 text-center text-gray-500">No royalty data available.</p>;
  }

  const totalRevenue = song.royalties.reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      {/* FIX 2: Clear label that this is artist-level revenue, not per-song */}
      <div className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        Revenue for <span className="font-semibold">{song.artist}</span> (all songs) — Per-song revenue tracking coming soon.
      </div>

      <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900 p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-500">Total Revenue ({song.artist})</p>
        <p className="mt-1 text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">Quarter</th>
              <th className="px-3 py-3 text-right">ASCAP</th>
              <th className="px-3 py-3 text-right">Distributor</th>
              <th className="px-3 py-3 text-right">MLC</th>
              <th className="hidden px-3 py-3 text-right md:table-cell">SoundExchange</th>
              <th className="hidden px-3 py-3 text-right md:table-cell">Sync</th>
              <th className="hidden px-3 py-3 text-right md:table-cell">YouTube</th>
              <th className="px-3 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {song.royalties.map((r) => (
              <tr key={r.id} className="border-b border-gray-800/50">
                <td className="px-3 py-3 text-gray-300">{r.quarter ?? r.period ?? '\u2014'}</td>
                <td className="px-3 py-3 text-right text-gray-400">{r.ascap_performance ? formatCurrency(r.ascap_performance) : '\u2014'}</td>
                <td className="px-3 py-3 text-right text-gray-400">{r.distributor_streaming ? formatCurrency(r.distributor_streaming) : '\u2014'}</td>
                <td className="px-3 py-3 text-right text-gray-400">{r.mlc_mechanical ? formatCurrency(r.mlc_mechanical) : '\u2014'}</td>
                <td className="hidden px-3 py-3 text-right text-gray-400 md:table-cell">{r.soundexchange_digital ? formatCurrency(r.soundexchange_digital) : '\u2014'}</td>
                <td className="hidden px-3 py-3 text-right text-gray-400 md:table-cell">{r.sync_licensing ? formatCurrency(r.sync_licensing) : '\u2014'}</td>
                <td className="hidden px-3 py-3 text-right text-gray-400 md:table-cell">{r.youtube_social ? formatCurrency(r.youtube_social) : '\u2014'}</td>
                <td className="px-3 py-3 text-right font-medium text-white">{formatCurrency(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Rights', 'Sync', 'Collaborators', 'Contracts', 'Revenue'] as const;
type Tab = (typeof TABS)[number];

export default function SongDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { artist } = useArtistContext();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/catalog/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Song not found' : `Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setSong(data);
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
        <PageHeader title="Song Detail" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          {error}
        </div>
        <Link
          href={artist !== 'all' ? `/catalog?artist=${artistToParam(artist)}` : '/catalog'}
          className="mt-4 inline-block text-sm text-purple-400 hover:underline"
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  if (isLoading || !song) {
    return (
      <div>
        <PageHeader title="Song Detail" />
        <div className="mt-6 space-y-4">
          <div className="h-40 animate-pulse rounded-lg bg-gray-800/50" />
          <div className="h-8 w-64 animate-pulse rounded bg-gray-800/50" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-800/50" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={artist !== 'all' ? `/catalog?artist=${artistToParam(artist)}` : '/catalog'}
          className="text-sm text-gray-400 hover:text-white"
        >
          {'\u2190'} Back to Catalog
        </Link>
      </div>

      <SongHero song={song} />

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'Overview' && <OverviewTab song={song} />}
        {activeTab === 'Rights' && <RightsTab song={song} />}
        {activeTab === 'Sync' && <SyncTab song={song} />}
        {activeTab === 'Collaborators' && <CollaboratorsTab song={song} />}
        {activeTab === 'Contracts' && <ContractsTab song={song} />}
        {activeTab === 'Revenue' && <RevenueTab song={song} />}
      </div>
    </div>
  );
}
