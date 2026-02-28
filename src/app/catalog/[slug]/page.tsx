'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import type { SongDetail } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CheckIcon({ checked }: { checked: boolean }) {
  return checked
    ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-900/50 text-xs text-green-400">&#10003;</span>
    : <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs text-gray-600">&#10007;</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// --- Song Hero ---
function SongHero({ song }: { song: SongDetail }) {
  const color = song.artist ? (ARTIST_COLORS[song.artist as Artist] ?? '#6b7280') : '#6b7280';
  const initials = song.title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Artwork */}
        {song.spotify_link ? (
          <div className="h-[150px] w-[150px] shrink-0 overflow-hidden rounded-xl bg-gray-900 shadow-lg md:h-[200px] md:w-[200px]">
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-gray-600" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }}>
              {initials}
            </div>
          </div>
        ) : (
          <div className="flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-xl shadow-lg md:h-[200px] md:w-[200px]" style={{ background: `linear-gradient(135deg, ${color}44, ${color}11)` }}>
            <span className="text-4xl font-bold" style={{ color }}>{initials}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-white">{song.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: color }}>{song.artist}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              song.status === 'Released' ? 'bg-green-900/50 text-green-300' :
              song.status === 'In Progress' ? 'bg-orange-900/50 text-orange-300' :
              'bg-amber-900/50 text-amber-300'
            }`}>{song.status}</span>
            {song.album_ep && <span className="text-sm text-gray-400">{song.album_ep}</span>}
          </div>

          {/* Metadata chips */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
            {song.release_date && <span className="rounded-full bg-gray-800 px-2.5 py-1">{song.release_date}</span>}
            {song.duration && <span className="rounded-full bg-gray-800 px-2.5 py-1">{song.duration}</span>}
            {song.bpm && <span className="rounded-full bg-gray-800 px-2.5 py-1">{song.bpm} BPM</span>}
            {song.key && <span className="rounded-full bg-gray-800 px-2.5 py-1">Key: {song.key}</span>}
          </div>

          {/* Genre + Mood pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {song.genre.map(g => (
              <span key={g} className="rounded-full bg-purple-900/30 px-2.5 py-0.5 text-xs text-purple-300">{g}</span>
            ))}
            {song.mood.map(m => (
              <span key={m} className="rounded-full bg-cyan-900/30 px-2.5 py-0.5 text-xs text-cyan-300">{m}</span>
            ))}
          </div>

          {/* Stream counter */}
          <div className="mt-4">
            <span className="text-2xl font-bold text-white">
              {song.total_streams > 0 ? `${formatNumber(song.total_streams)} streams` : '\u2014'}
            </span>
          </div>
        </div>
      </div>

      {/* DSP Links */}
      {(song.spotify_link || song.apple_music_link || song.youtube_link) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-700/50 pt-4">
          {song.spotify_link && (
            <a href={song.spotify_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-900/30 px-4 py-2 text-xs font-medium text-green-300 transition-colors hover:bg-green-900/50">Spotify</a>
          )}
          {song.apple_music_link && (
            <a href={song.apple_music_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-pink-900/30 px-4 py-2 text-xs font-medium text-pink-300 transition-colors hover:bg-pink-900/50">Apple Music</a>
          )}
          {song.youtube_link && (
            <a href={song.youtube_link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-red-900/30 px-4 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/50">YouTube</a>
          )}
        </div>
      )}
    </div>
  );
}

// --- Tab: Overview ---
function OverviewTab({ song }: { song: SongDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* About / Notes */}
      {song.notes && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">About</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{song.notes}</p>
        </div>
      )}

      {/* Similar Artists + Scene */}
      {(song.similar_artists || song.scene_suggestions) && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          {song.similar_artists && (
            <>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Similar Artists</h3>
              <div className="flex flex-wrap gap-1.5">
                {song.similar_artists.split(',').map(a => (
                  <span key={a.trim()} className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs text-blue-300">{a.trim()}</span>
                ))}
              </div>
            </>
          )}
          {song.scene_suggestions && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Scene Suggestions</h3>
              <p className="text-sm text-gray-300">{song.scene_suggestions}</p>
            </>
          )}
        </div>
      )}

      {/* Usage Scenarios */}
      {song.usage_scenarios.length > 0 && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Usage Scenarios</h3>
          <div className="grid grid-cols-2 gap-2">
            {song.usage_scenarios.map(s => (
              <div key={s} className="rounded-lg bg-gray-900/50 px-3 py-2 text-xs text-gray-300">{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Production Details */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Production Details</h3>
        <dl className="space-y-2">
          {[
            { label: 'Producers', value: song.producers },
            { label: 'Songwriters', value: song.songwriters },
            { label: 'Explicit', value: song.explicit ? 'Yes' : 'No' },
            { label: 'Instrumental', value: song.has_instrumental ? 'Yes' : 'No' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm text-white">{value ?? '\u2014'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// --- Tab: Rights ---
function RightsTab({ song }: { song: SongDetail }) {
  const registrations = [
    { label: 'ASCAP', checked: song.ascap_registered },
    { label: 'MLC', checked: song.mlc_registered },
    { label: 'PPL', checked: song.ppl_registered },
    { label: 'SoundExchange', checked: song.soundexchange_registered },
    { label: 'YouTube CID', checked: song.youtube_content_id },
    { label: 'Songtrust', checked: song.songtrust_registered },
  ];

  const lyricsSubmissions = [
    { label: 'LyricFind', checked: song.lyricfind_submitted },
    { label: 'Musixmatch', checked: song.musixmatch_submitted },
    { label: 'Genius', checked: song.genius_submitted },
  ];

  const marketplaceSubmissions = [
    { label: 'DISCO', checked: song.disco_submitted },
    { label: 'Music Gateway', checked: song.music_gateway_submitted },
    { label: 'Songtradr', checked: song.songtradr_submitted },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Registration Checklist */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 md:col-span-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">PRO & Registry Registrations</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {registrations.map(({ label, checked }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-gray-900/50 px-3 py-2">
              <CheckIcon checked={checked} />
              <span className="text-sm text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lyrics Distribution */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Lyrics Distribution</h3>
        <div className="space-y-2">
          {lyricsSubmissions.map(({ label, checked }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{label}</span>
              <CheckIcon checked={checked} />
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace Uploads */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Marketplace Uploads</h3>
        <div className="space-y-2">
          {marketplaceSubmissions.map(({ label, checked }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{label}</span>
              <CheckIcon checked={checked} />
            </div>
          ))}
        </div>
        {song.disco_link && (
          <a href={song.disco_link} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-orange-400 hover:underline">View on DISCO &rarr;</a>
        )}
      </div>

      {/* Identifiers */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Identifiers</h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-gray-500">ISRC</dt>
            <dd className="mt-0.5 flex items-center">
              <code className="font-mono text-sm text-white">{song.isrc ?? '\u2014'}</code>
              {song.isrc && <CopyButton text={song.isrc} />}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">UPC</dt>
            <dd className="mt-0.5 flex items-center">
              <code className="font-mono text-sm text-white">{song.upc ?? '\u2014'}</code>
              {song.upc && <CopyButton text={song.upc} />}
            </dd>
          </div>
          {song.songtrust_id && (
            <div>
              <dt className="text-xs text-gray-500">Songtrust ID</dt>
              <dd className="mt-0.5 font-mono text-sm text-white">{song.songtrust_id}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Publishing */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Publishing</h3>
        <dl className="space-y-2">
          {[
            { label: 'Publisher', value: song.publisher },
            { label: 'Distributor', value: song.distributor },
            { label: 'Master Ownership', value: song.master_ownership },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm text-white">{value ?? '\u2014'}</dd>
            </div>
          ))}
        </dl>
        {song.writer_splits_parsed.length > 0 && (
          <>
            <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-gray-400">Writer Splits</h4>
            <div className="space-y-1">
              {song.writer_splits_parsed.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-gray-900/50 px-2 py-1">
                  <span className="text-xs text-gray-300">{s.name}</span>
                  <span className="text-xs font-medium text-white">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Tab: Collaborators ---
function CollaboratorsTab({ song }: { song: SongDetail }) {
  const { artist } = useArtistContext();

  if (song.collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-12 text-center">
        <p className="text-gray-400">No collaborators linked to this song.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {song.collaborators.map(c => (
        <Link
          key={c.id}
          href={artist !== 'all' ? `/collaborators/${c.slug}?artist=${artistToParam(artist)}` : `/collaborators/${c.slug}`}
          className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 transition-colors hover:border-gray-600"
        >
          <p className="font-medium text-white">{c.name}</p>
          <p className="mt-1 text-xs text-gray-400">{c.roles.join(', ')}</p>
          <div className="mt-2 flex items-center gap-2">
            {c.pro_affiliation && <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{c.pro_affiliation}</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              c.agreement_status === 'Active' ? 'bg-green-900/50 text-green-300' :
              c.agreement_status === 'Pending' ? 'bg-yellow-900/50 text-yellow-300' :
              'bg-gray-700/50 text-gray-300'
            }`}>{c.agreement_status ?? '\u2014'}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// --- Tab: Revenue ---
function RevenueTab({ song }: { song: SongDetail }) {
  if (song.royalties.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-12 text-center">
        <p className="text-gray-400">No royalty data available for {song.artist || 'this artist'}.</p>
      </div>
    );
  }

  const totalRevenue = song.royalties.reduce((sum, r) => sum + r.total, 0);
  const bySource: Record<string, number> = {};
  for (const r of song.royalties) {
    if (r.ascap_performance) bySource['ASCAP'] = (bySource['ASCAP'] ?? 0) + r.ascap_performance;
    if (r.distributor_streaming) bySource['Distributor'] = (bySource['Distributor'] ?? 0) + r.distributor_streaming;
    if (r.mlc_mechanical) bySource['MLC'] = (bySource['MLC'] ?? 0) + r.mlc_mechanical;
    if (r.soundexchange_digital) bySource['SoundExchange'] = (bySource['SoundExchange'] ?? 0) + r.soundexchange_digital;
    if (r.sync_licensing) bySource['Sync'] = (bySource['Sync'] ?? 0) + r.sync_licensing;
    if (r.youtube_social) bySource['YouTube'] = (bySource['YouTube'] ?? 0) + r.youtube_social;
    if (r.other) bySource['Other'] = (bySource['Other'] ?? 0) + r.other;
  }
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const maxSource = sourceEntries.length > 0 ? sourceEntries[0][1] : 1;

  return (
    <div>
      <div className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        Revenue for <span className="font-semibold">{song.artist}</span> (all songs) &mdash; Per-song tracking coming soon.
      </div>

      <div className="mb-6 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-500">Total Revenue ({song.artist})</p>
        <p className="mt-1 text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
      </div>

      {sourceEntries.length > 0 && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Source</h3>
          <div className="space-y-2">
            {sourceEntries.map(([source, amount]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-gray-300">{source}</span>
                <div className="flex-1">
                  <div className="h-5 rounded bg-green-600/60" style={{ width: `${(amount / maxSource) * 100}%` }} />
                </div>
                <span className="w-20 text-right text-sm text-gray-400">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Tab: Sync ---
function SyncTab({ song }: { song: SongDetail }) {
  const tierColor = song.sync_tier === 'Tier 1' ? 'bg-red-900/50 text-red-300 border-red-800' :
    song.sync_tier === 'Tier 2' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-800' :
    song.sync_tier === 'Tier 3' ? 'bg-green-900/50 text-green-300 border-green-800' :
    'bg-gray-800 text-gray-400 border-gray-700';

  const editAssets = [
    { label: '15s Edit', value: song.has_15s_edit },
    { label: '30s Edit', value: song.has_30s_edit },
    { label: '60s Edit', value: song.has_60s_edit },
    { label: 'Instrumental', value: song.has_instrumental },
    { label: 'Acapella', value: song.has_acapella },
    { label: 'Atmos Mix', value: song.atmos_mix },
    { label: '360RA', value: song.has_360ra },
    { label: 'Stems', value: song.stems_complete },
    { label: 'Stereo Master', value: song.artwork },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <div className="flex items-center gap-3">
          <span className={`rounded-lg border px-4 py-2 text-lg font-bold ${tierColor}`}>{song.sync_tier ?? 'No Tier'}</span>
          <div>
            <p className="text-sm text-gray-300">Available for Sync</p>
            <p className={`text-sm font-medium ${song.sync_available ? 'text-green-400' : 'text-gray-500'}`}>{song.sync_available ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {song.sync_edit_status && (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Sync Edit Status</p>
            <p className="text-sm text-white">{song.sync_edit_status}</p>
          </div>
        )}

        {song.sync_restrictions && (
          <div className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2">
            <p className="text-xs font-semibold uppercase text-amber-400">Restrictions</p>
            <p className="mt-1 text-sm text-amber-300">{song.sync_restrictions}</p>
          </div>
        )}

        {song.licensing_contacts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Pitched To</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {song.licensing_contacts.map(lc => (
                <span key={lc.id} className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-300">{lc.company}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Edit Availability</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {editAssets.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-gray-900/50 px-3 py-2">
              <CheckIcon checked={value} />
              <span className="text-xs text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Tab: Contracts ---
function ContractsTab({ song }: { song: SongDetail }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (song.contracts.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-12 text-center">
        <p className="text-gray-400">No contracts linked to this song.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {song.contracts.map(c => (
        <div key={c.id} className="rounded-xl border border-gray-700/50 bg-gray-800/50">
          <button
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <p className="font-medium text-white">{c.document_name}</p>
              <p className="mt-0.5 text-xs text-gray-400">{c.type ?? 'Unknown type'} &middot; {c.parties ?? 'Unknown parties'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                c.status === 'Active' ? 'bg-green-900/50 text-green-300' :
                c.status === 'Expired' ? 'bg-red-900/50 text-red-300' :
                'bg-gray-700/50 text-gray-300'
              }`}>{c.status ?? '\u2014'}</span>
              <span className="text-gray-400">{expanded === c.id ? '\u25B2' : '\u25BC'}</span>
            </div>
          </button>
          {expanded === c.id && (
            <div className="border-t border-gray-700/50 px-5 py-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Date Signed</dt><dd className="text-white">{c.date_signed ?? '\u2014'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Expiration</dt><dd className="text-white">{c.expiration ?? '\u2014'}</dd></div>
                {c.key_terms && <div><dt className="text-gray-500">Key Terms</dt><dd className="mt-1 text-gray-300">{c.key_terms}</dd></div>}
              </dl>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Tab: Press (NEW) ---
function PressTab() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
      <p className="text-lg font-medium text-gray-400">No press coverage linked.</p>
      <p className="mt-2 text-sm text-gray-500">Add a &ldquo;Press Links&rdquo; field in Notion to populate this section.</p>
    </div>
  );
}

// --- Tab: Video (NEW) ---
function VideoTab() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
      <p className="text-lg font-medium text-gray-400">No video content linked.</p>
      <p className="mt-2 text-sm text-gray-500">Add video URL fields in Notion to populate this section.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 opacity-30 md:grid-cols-3">
        {['Instagram', 'TikTok', 'YouTube'].map(platform => (
          <div key={platform} className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="mb-2 h-20 rounded bg-gray-700" />
            <p className="text-xs text-gray-500">{platform}</p>
            <p className="text-xs text-gray-600">0 views</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
const TABS = ['Overview', 'Rights', 'Collaborators', 'Revenue', 'Sync', 'Contracts', 'Press', 'Video'] as const;
type Tab = (typeof TABS)[number];

export default function SongDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { artist } = useArtistContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabParam = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'Overview';

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/catalog/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Song not found' : `Fetch failed: ${r.status}`);
        return r.json();
      })
      .then(data => { if (!cancelled) setSong(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return (
      <div>
        <PageHeader title="Song Detail" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">{error}</div>
        <Link href={artist !== 'all' ? `/catalog?artist=${artistToParam(artist)}` : '/catalog'} className="mt-4 inline-block text-sm text-orange-400 hover:underline">&larr; Back to Catalog</Link>
      </div>
    );
  }

  if (isLoading || !song) {
    return (
      <div>
        <PageHeader title="Song Detail" />
        <div className="mt-6 space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-gray-800/50" />
          <div className="flex gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-gray-800/50" />)}</div>
          <div className="h-64 animate-pulse rounded-xl bg-gray-800/50" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={artist !== 'all' ? `/catalog?artist=${artistToParam(artist)}` : '/catalog'} className="text-sm text-gray-400 hover:text-white">&larr; Back to Catalog</Link>
      </div>

      <SongHero song={song} />

      {/* Tabs */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 border-b border-gray-800">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'Overview' && <OverviewTab song={song} />}
        {activeTab === 'Rights' && <RightsTab song={song} />}
        {activeTab === 'Collaborators' && <CollaboratorsTab song={song} />}
        {activeTab === 'Revenue' && <RevenueTab song={song} />}
        {activeTab === 'Sync' && <SyncTab song={song} />}
        {activeTab === 'Contracts' && <ContractsTab song={song} />}
        {activeTab === 'Press' && <PressTab />}
        {activeTab === 'Video' && <VideoTab />}
      </div>
    </div>
  );
}
