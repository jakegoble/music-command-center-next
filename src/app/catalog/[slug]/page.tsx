'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { artistToParam, ARTIST_COLORS, type Artist } from '@/config/notion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SongDetail } from '@/lib/types';
import { PRESS_COVERAGE, type PressCoverage } from '@/lib/data/press-coverage';
import { toSlug } from '@/lib/utils/slug';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isCollection(song: SongDetail): boolean {
  const trackCount = song.parsed_notes?.track_listing?.length ?? 0;
  if (trackCount > 1) return true;
  const lower = song.title.toLowerCase();
  return lower.includes('remixes') || lower.includes('remix ep') || lower.includes('remix pack');
}

/** True when the song record is actually an album/EP container (title ≈ album_ep). */
function isAlbumContainer(song: SongDetail): boolean {
  if (!song.album_ep) return false;
  return toSlug(song.title) === toSlug(song.album_ep);
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
  const { artist } = useArtistContext();
  const albumSlug = song.album_ep ? song.album_ep.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Artwork */}
        {song.artwork_url ? (
          <div className="h-[150px] w-[150px] shrink-0 overflow-hidden rounded-xl shadow-lg md:h-[200px] md:w-[200px]">
            <img src={song.artwork_url} alt={song.title} className="h-full w-full object-cover" />
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
          </div>

          {/* Album link */}
          {song.album_ep && albumSlug && (
            <div className="mt-2">
              <span className="text-sm text-gray-400">from </span>
              <Link
                href={artist !== 'all' ? `/catalog/albums/${albumSlug}?artist=${artistToParam(artist)}` : `/catalog/albums/${albumSlug}`}
                className="text-sm font-medium text-orange-400 hover:underline"
              >
                {song.album_ep}
              </Link>
            </div>
          )}

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

// --- Collection Hero ---
function CollectionHero({ song }: { song: SongDetail }) {
  const color = song.artist ? (ARTIST_COLORS[song.artist as Artist] ?? '#6b7280') : '#6b7280';
  const initials = song.title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const trackCount = song.parsed_notes?.track_listing?.length ?? 0;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Artwork */}
        {song.artwork_url ? (
          <div className="h-[200px] w-[200px] shrink-0 overflow-hidden rounded-xl shadow-lg md:h-[250px] md:w-[250px]">
            <img src={song.artwork_url} alt={song.title} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-[200px] w-[200px] shrink-0 items-center justify-center rounded-xl shadow-lg md:h-[250px] md:w-[250px]" style={{ background: `linear-gradient(135deg, ${color}44, ${color}11)` }}>
            <span className="text-6xl font-bold" style={{ color }}>{initials}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-white">{song.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: color }}>{song.artist}</span>
            <span className="rounded-full bg-blue-900/50 px-2.5 py-0.5 text-xs font-medium text-blue-300">
              {trackCount > 1 ? 'Remix Collection' : 'EP'}
            </span>
            {trackCount > 0 && (
              <span className="rounded-full bg-gray-700/50 px-2.5 py-0.5 text-xs font-medium text-gray-300">{trackCount} Tracks</span>
            )}
          </div>

          {/* Metadata line */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
            {song.release_date && <span>{song.release_date}</span>}
            {song.distributor && <span>by {song.distributor}</span>}
            {song.parsed_notes?.label_info && song.parsed_notes.label_info.length < 60 && <span>{song.parsed_notes.label_info}</span>}
          </div>

          {/* Total streams as big number */}
          <div className="mt-4">
            <span className="text-3xl font-bold text-white">
              {song.total_streams > 0 ? formatNumber(song.total_streams) : '—'}
            </span>
            <span className="ml-2 text-gray-400">streams</span>
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
  const descriptionText = song.story_description
    ?? song.generated_description
    ?? song.parsed_notes?.description
    ?? null;

  const artistColor = ARTIST_COLORS[song.artist as Artist] ?? '#F97316';

  return (
    <div className="space-y-4">
      {/* About — Story Section */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6" style={{ borderLeftWidth: 4, borderLeftColor: artistColor }}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">About</h3>
        {descriptionText ? (
          <p className="text-base leading-relaxed text-gray-200">{descriptionText}</p>
        ) : (
          <p className="text-sm italic text-gray-500">No story written yet. Add a description in Notion to bring this section to life.</p>
        )}

        {/* Highlights */}
        {song.highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {song.highlights.map(h => (
              <span key={h} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${artistColor}18`, color: artistColor, border: `1px solid ${artistColor}40` }}>
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Track listing for remix collections / multi-track EPs */}
        {song.parsed_notes?.track_listing && song.parsed_notes.track_listing.length > 0 && (
          <div className="mt-4 border-t border-gray-700/30 pt-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Tracklist</h4>
            <ol className="space-y-1">
              {song.parsed_notes.track_listing.map((track, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-right text-xs text-gray-600">{i + 1}</span>
                  <span className="text-gray-200">{track}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Release context */}
        {(song.distributor || song.parsed_notes?.label_info || song.release_date) && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-700/30 pt-3 text-xs text-gray-500">
            {song.distributor && <span>Distributor: <span className="text-gray-300">{song.distributor}</span></span>}
            {song.parsed_notes?.label_info && song.parsed_notes.label_info.length < 60 && <span>Label: <span className="text-gray-300">{song.parsed_notes.label_info}</span></span>}
            {song.release_date && <span>Released: <span className="text-gray-300">{song.release_date}</span></span>}
          </div>
        )}
      </div>

      {/* Release Info + Technical — 2-column grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Release Info</h3>
          <dl className="space-y-2">
            {([
              { label: 'Release Date', value: song.release_date },
              { label: 'Distributor', value: song.distributor },
              { label: 'Album / EP', value: song.album_ep },
              { label: 'Status', value: song.status },
              { label: 'Label', value: (song.parsed_notes?.label_info && song.parsed_notes.label_info.length < 60) ? song.parsed_notes.label_info : null },
              { label: 'Producers', value: song.producers },
              { label: 'Songwriters', value: song.songwriters },
            ] as { label: string; value: string | null | undefined }[]).map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-sm text-gray-500">{label}</dt>
                <dd className="text-right text-sm text-white">{value ?? '\u2014'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Technical</h3>
          <dl className="space-y-2">
            {([
              { label: 'BPM', value: song.bpm ? String(song.bpm) : null },
              { label: 'Key', value: song.key },
              { label: 'Duration', value: song.duration },
              { label: 'Explicit', value: song.explicit ? 'Yes' : 'No' },
            ] as { label: string; value: string | null }[]).map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-sm text-gray-500">{label}</dt>
                <dd className="text-sm text-white">{value ?? '\u2014'}</dd>
              </div>
            ))}
          </dl>
          {/* Identifiers */}
          <div className="mt-4 space-y-2 border-t border-gray-700/50 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">ISRC</span>
              <span className="flex items-center">
                <code className="font-mono text-xs text-white">{song.isrc ?? '\u2014'}</code>
                {song.isrc && <CopyButton text={song.isrc} />}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">UPC</span>
              <span className="flex items-center">
                <code className="font-mono text-xs text-white">{song.upc ?? '\u2014'}</code>
                {song.upc && <CopyButton text={song.upc} />}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Discovery — Genre, Mood, Similar Artists, Scenes, Usage */}
      {(song.genre.length > 0 || song.mood.length > 0 || song.similar_artists || song.scene_suggestions || song.usage_scenarios.length > 0) && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Discovery</h3>
          <div className="space-y-4">
            {/* Genre pills */}
            {song.genre.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-gray-500">Genre</p>
                <div className="flex flex-wrap gap-1.5">
                  {song.genre.map(g => (
                    <span key={g} className="rounded-full bg-purple-900/30 px-2.5 py-0.5 text-xs text-purple-300">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Mood pills */}
            {song.mood.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-gray-500">Mood</p>
                <div className="flex flex-wrap gap-1.5">
                  {song.mood.map(m => (
                    <span key={m} className="rounded-full bg-cyan-900/30 px-2.5 py-0.5 text-xs text-cyan-300">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Artists */}
            {song.similar_artists && (
              <div>
                <p className="mb-1.5 text-xs text-gray-500">Similar Artists</p>
                <div className="flex flex-wrap gap-1.5">
                  {song.similar_artists.split(',').map(a => (
                    <span key={a.trim()} className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs text-blue-300">{a.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Scene Suggestions */}
            {song.scene_suggestions && (
              <div>
                <p className="mb-1.5 text-xs text-gray-500">Scene Suggestions</p>
                <p className="text-sm text-gray-300">{song.scene_suggestions}</p>
              </div>
            )}

            {/* Usage Scenarios */}
            {song.usage_scenarios.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-gray-500">Usage Scenarios</p>
                <div className="flex flex-wrap gap-1.5">
                  {song.usage_scenarios.map(s => (
                    <span key={s} className="rounded-lg bg-gray-900/50 px-2.5 py-1 text-xs text-gray-300">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deliverables Grid */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Deliverables</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {[
            { label: 'Stereo Master', checked: song.has_stereo_master },
            { label: 'Instrumental', checked: song.has_instrumental },
            { label: 'Acapella', checked: song.has_acapella },
            { label: 'Stems', checked: song.stems_complete },
            { label: '15s Edit', checked: song.has_15s_edit },
            { label: '30s Edit', checked: song.has_30s_edit },
            { label: '60s Edit', checked: song.has_60s_edit },
            { label: 'Atmos Mix', checked: song.atmos_mix },
            { label: '360RA', checked: song.has_360ra },
            { label: 'Project File', checked: song.has_project_file },
            { label: 'Artwork', checked: song.artwork },
          ].map(({ label, checked }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-gray-900/50 px-3 py-2">
              <CheckIcon checked={checked} />
              <span className="text-xs text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Publishing / Ownership */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Publishing & Ownership</h3>
        <dl className="space-y-2">
          {([
            { label: 'Publisher', value: song.publisher },
            { label: 'Master Ownership', value: song.master_ownership },
          ] as { label: string; value: string | null }[]).map(({ label, value }) => (
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

// --- Tab: Collection Overview ---
function CollectionOverviewTab({ song }: { song: SongDetail }) {
  const descriptionText = song.story_description
    ?? song.generated_description
    ?? song.parsed_notes?.description
    ?? null;
  const artistColor = ARTIST_COLORS[song.artist as Artist] ?? '#F97316';
  const trackCount = song.parsed_notes?.track_listing?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Tracklist — at the top */}
      {song.parsed_notes?.track_listing && song.parsed_notes.track_listing.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-white">Tracklist</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/50">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3 w-8">#</th>
                  <th className="px-3 py-3">Title</th>
                </tr>
              </thead>
              <tbody>
                {song.parsed_notes.track_listing.map((track, i) => (
                  <tr key={i} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                    <td className="px-3 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-3 py-3 text-gray-200">{track}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* About section */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6" style={{ borderLeftWidth: 4, borderLeftColor: artistColor }}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">About</h3>
        {descriptionText ? (
          <p className="text-base leading-relaxed text-gray-200">{descriptionText}</p>
        ) : (
          <p className="text-sm italic text-gray-500">No story written yet. Add a description in Notion to bring this section to life.</p>
        )}

        {/* Highlights */}
        {song.highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {song.highlights.map(h => (
              <span key={h} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${artistColor}18`, color: artistColor, border: `1px solid ${artistColor}40` }}>
                {h}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Streams', value: formatNumber(song.total_streams) },
          { label: 'Track Count', value: trackCount.toString() },
          { label: 'Est. Revenue', value: formatCurrency(song.estimated_revenue) },
          { label: 'BPM / Key', value: song.bpm ? `${song.bpm}${song.key ? ` / ${song.key}` : ''}` : '\u2014' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Deliverables Grid */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Deliverables</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {[
            { label: 'Stereo Master', checked: song.has_stereo_master },
            { label: 'Instrumental', checked: song.has_instrumental },
            { label: 'Acapella', checked: song.has_acapella },
            { label: 'Stems', checked: song.stems_complete },
            { label: '15s Edit', checked: song.has_15s_edit },
            { label: '30s Edit', checked: song.has_30s_edit },
            { label: '60s Edit', checked: song.has_60s_edit },
            { label: 'Atmos Mix', checked: song.atmos_mix },
            { label: '360RA', checked: song.has_360ra },
            { label: 'Project File', checked: song.has_project_file },
            { label: 'Artwork', checked: song.artwork },
          ].map(({ label, checked }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-gray-900/50 px-3 py-2">
              <CheckIcon checked={checked} />
              <span className="text-xs text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Publishing & Ownership */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Publishing & Ownership</h3>
        <dl className="space-y-2">
          {([
            { label: 'Publisher', value: song.publisher },
            { label: 'Master Ownership', value: song.master_ownership },
          ] as { label: string; value: string | null }[]).map(({ label, value }) => (
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
          <ResponsiveContainer width="100%" height={Math.max(180, sourceEntries.length * 36)}>
            <BarChart data={sourceEntries.map(([source, amount]) => ({ source, amount }))} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`} />
              <YAxis type="category" dataKey="source" tick={{ fill: '#D1D5DB', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Revenue']}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {sourceEntries.map(([, ], i) => (
                  <Cell key={i} fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'][i % 7]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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

// --- Tab: Press ---
function PressTab({ song }: { song: SongDetail }) {
  const sortByDate = (items: PressCoverage[]) =>
    [...items].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

  const songPress = sortByDate(
    PRESS_COVERAGE.filter(p => p.song && p.song.toLowerCase() === song.title.toLowerCase())
  );
  const artistPress = sortByDate(
    PRESS_COVERAGE.filter(p => p.artist.toLowerCase() === song.artist.toLowerCase() && (!p.song || p.song.toLowerCase() !== song.title.toLowerCase()))
  );
  const allPress = [...songPress, ...artistPress];

  if (allPress.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
        <div className="mb-4 text-4xl text-gray-700">&#128240;</div>
        <p className="text-lg font-medium text-gray-400">No press coverage found.</p>
        <p className="mt-2 max-w-md text-sm text-gray-500">When articles, reviews, and interviews are added, they&apos;ll appear here with publication details and type badges.</p>
        <div className="mt-6 w-full max-w-sm rounded-xl border border-dashed border-gray-700/50 p-4 opacity-30">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-32 rounded bg-gray-700" />
              <div className="mt-2 h-3 w-48 rounded bg-gray-800" />
            </div>
            <div className="h-5 w-16 rounded-full bg-purple-900/50" />
          </div>
        </div>
      </div>
    );
  }

  const typeStyles: Record<PressCoverage['type'], { bg: string; text: string; border: string }> = {
    Feature: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    Review: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    Interview: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
    Mention: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
  };

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderPressCard = (p: PressCoverage, key: string) => {
    const style = typeStyles[p.type];
    return (
      <a
        key={key}
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 transition-colors hover:border-gray-600"
      >
        <div className="flex items-start gap-3">
          {/* Thumbnail or initials fallback */}
          {p.image ? (
            <img src={p.image} alt={p.outlet} className="h-20 w-20 shrink-0 rounded-lg object-cover bg-gray-700" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-700/50 text-lg font-bold text-gray-500">
              {p.outlet.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-white group-hover:text-orange-400">{p.outlet}</p>
                {formatDate(p.date) && <p className="text-xs text-gray-500">{formatDate(p.date)}</p>}
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>{p.type}</span>
            </div>
            <p className="mt-1.5 text-sm text-gray-400">{p.title}</p>
            {p.excerpt && <p className="mt-1 truncate text-xs text-gray-500">{p.excerpt}</p>}
            {p.song && <p className="mt-1 text-xs text-gray-600">Re: &ldquo;{p.song}&rdquo;</p>}
          </div>
        </div>
      </a>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {(['Feature', 'Review', 'Interview', 'Mention'] as const).map(type => {
          const count = allPress.filter(p => p.type === type).length;
          if (count === 0) return null;
          const style = typeStyles[type];
          return (
            <span key={type} className={`rounded-full border px-3 py-1 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>
              {count} {type}{count > 1 ? 's' : ''}
            </span>
          );
        })}
        <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-500">{allPress.length} total</span>
      </div>

      {songPress.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Coverage for &ldquo;{song.title}&rdquo;</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {songPress.map((p, i) => renderPressCard(p, `song-${i}`))}
          </div>
        </>
      )}
      {artistPress.length > 0 && (
        <>
          <p className={`text-xs font-semibold uppercase tracking-wider text-gray-500 ${songPress.length > 0 ? 'mt-2' : ''}`}>
            {songPress.length > 0 ? `More from ${song.artist}` : `Press for ${song.artist}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {artistPress.map((p, i) => renderPressCard(p, `artist-${i}`))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Tab: Lyrics ---
function LyricsTab({ song }: { song: SongDetail }) {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [geniusUrl, setGeniusUrl] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(true);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLyricsLoading(true);
    setLyricsError(null);

    fetch(`/api/lyrics/${song.slug}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setLyrics(data.lyrics ?? null);
        setGeniusUrl(data.genius_url ?? null);
        if (!data.lyrics && data.error) setLyricsError(data.error);
      })
      .catch(err => { if (!cancelled) setLyricsError(err.message); })
      .finally(() => { if (!cancelled) setLyricsLoading(false); });

    return () => { cancelled = true; };
  }, [song.slug]);

  const lyricsProviders = [
    { label: 'LyricFind', submitted: song.lyricfind_submitted },
    { label: 'Musixmatch', submitted: song.musixmatch_submitted },
    { label: 'Genius', submitted: song.genius_submitted },
  ];
  const submittedProviders = lyricsProviders.filter(p => p.submitted);

  return (
    <div className="space-y-4">
      {/* Lyrics status */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Lyrics Status</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            song.lyrics_status === 'Written' ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-gray-700/50 text-gray-400'
          }`}>
            {song.lyrics_status ?? 'Not Written'}
          </span>
        </div>

        {/* Songwriter credits */}
        {song.songwriters && (
          <div className="mt-4 border-t border-gray-700/30 pt-3">
            <p className="text-xs text-gray-500">Written by</p>
            <p className="mt-1 text-sm text-gray-300">{song.songwriters}</p>
          </div>
        )}
      </div>

      {/* Lyrics providers */}
      {submittedProviders.length > 0 && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Available On</h3>
          <div className="flex flex-wrap gap-2">
            {submittedProviders.map(p => (
              <span key={p.label} className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400">
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics content */}
      {lyricsLoading ? (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-700" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-700/50" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-700/50" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-gray-700/50" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-700/50" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-700/50" />
        </div>
      ) : lyrics ? (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <div className="max-h-[500px] overflow-y-auto pr-2">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-200">
              {lyrics}
            </pre>
          </div>
          {geniusUrl && (
            <div className="mt-4 border-t border-gray-700/30 pt-3 flex items-center gap-2">
              <a
                href={geniusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
              >
                Sourced from Genius &rarr;
              </a>
              <span className="text-[10px] text-gray-600">For personal/dashboard use only</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
          <div className="mb-4 text-4xl text-gray-700">&#127925;</div>
          <p className="text-lg font-medium text-gray-400">
            {lyricsError === 'GENIUS_ACCESS_TOKEN not configured. Add it to your environment variables.'
              ? 'Genius API not configured'
              : song.lyrics_status === 'Written'
                ? 'Lyrics written but not found on Genius.'
                : 'Lyrics not available yet.'}
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            {lyricsError === 'GENIUS_ACCESS_TOKEN not configured. Add it to your environment variables.'
              ? 'Add GENIUS_ACCESS_TOKEN to your environment variables to enable lyrics lookup.'
              : 'Connect a lyrics provider or add lyrics manually in Notion.'}
          </p>
        </div>
      )}
    </div>
  );
}

// --- Tab: Video ---
interface DiscoveredVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
}

function VideoTab({ song }: { song: SongDetail }) {
  const hasYouTube = !!song.youtube_link;
  const youtubeId = hasYouTube ? extractYouTubeId(song.youtube_link!) : null;
  const [discoveredVideos, setDiscoveredVideos] = useState<DiscoveredVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setVideosLoading(true);

    fetch(`/api/videos/${song.slug}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const videos = (data.videos ?? []) as DiscoveredVideo[];
        // Filter out the official video if it's in the discovered list
        const filtered = youtubeId ? videos.filter(v => v.id !== youtubeId) : videos;
        setDiscoveredVideos(filtered);
      })
      .catch(() => { if (!cancelled) setDiscoveredVideos([]); })
      .finally(() => { if (!cancelled) setVideosLoading(false); });

    return () => { cancelled = true; };
  }, [song.slug, youtubeId]);

  const formatVideoDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  };

  return (
    <div className="space-y-6">
      {/* Official Video */}
      {hasYouTube && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Official Video</h3>
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-900">
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${song.title} - YouTube`}
              />
            ) : (
              <a href={song.youtube_link!} target="_blank" rel="noopener noreferrer" className="flex h-full w-full items-center justify-center text-sm text-gray-400 hover:text-white">
                Watch on YouTube &rarr;
              </a>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-300">YouTube</span>
            <a href={song.youtube_link!} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-white truncate">
              {song.youtube_link}
            </a>
          </div>
        </div>
      )}

      {/* Discovered Videos */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">More Videos</h3>

        {videosLoading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-700/50 bg-gray-900/50 p-3">
                <div className="aspect-video animate-pulse rounded-lg bg-gray-700" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-gray-700" />
                <div className="mt-1 h-2 w-1/2 animate-pulse rounded bg-gray-700/50" />
              </div>
            ))}
          </div>
        ) : discoveredVideos.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {discoveredVideos.map(video => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-gray-700/50 bg-gray-900/50 p-3 transition-colors hover:border-gray-600"
              >
                <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-800">
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-white line-clamp-2 group-hover:text-orange-400">{video.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{video.channel}</p>
                {video.publishedAt && (
                  <p className="mt-0.5 text-xs text-gray-500">{formatVideoDate(video.publishedAt)}</p>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-700/50 py-10 text-center">
            <div className="mb-3 text-3xl text-gray-700">&#127909;</div>
            <p className="text-sm font-medium text-gray-400">No additional video content found.</p>
            <p className="mt-1.5 max-w-md text-xs text-gray-500">
              Videos will appear here when a YouTube API key is configured, or when video URLs are added in Notion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&\s]+)/);
  return match ? match[1] : null;
}

// --- Main Page ---
const TABS = ['Overview', 'Rights', 'Collaborators', 'Revenue', 'Sync', 'Contracts', 'Press', 'Lyrics', 'Video'] as const;
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

  // Redirect album/EP container pages to the proper album detail route.
  // Only redirect when the song title IS the album (title slug === album_ep slug).
  useEffect(() => {
    if (!song) return;
    if (isAlbumContainer(song)) {
      const albumSlug = toSlug(song.album_ep!);
      const artistParam = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';
      router.replace(`/catalog/albums/${albumSlug}${artistParam}`);
    }
  }, [song, artist, router]);

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

      {isCollection(song) ? <CollectionHero song={song} /> : <SongHero song={song} />}

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
        {activeTab === 'Overview' && (isCollection(song) ? <CollectionOverviewTab song={song} /> : <OverviewTab song={song} />)}
        {activeTab === 'Rights' && <RightsTab song={song} />}
        {activeTab === 'Collaborators' && <CollaboratorsTab song={song} />}
        {activeTab === 'Revenue' && <RevenueTab song={song} />}
        {activeTab === 'Sync' && <SyncTab song={song} />}
        {activeTab === 'Contracts' && <ContractsTab song={song} />}
        {activeTab === 'Press' && <PressTab song={song} />}
        {activeTab === 'Lyrics' && <LyricsTab song={song} />}
        {activeTab === 'Video' && <VideoTab song={song} />}
      </div>
    </div>
  );
}
