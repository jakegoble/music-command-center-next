'use client';

import { useState } from 'react';
import { SpotifyIcon, AppleMusicIcon, YoutubeMusicIcon, AmazonMusicIcon, TidalIcon } from './icons/DspIcons';
import type { PlatformStreams } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const MAIN_PLATFORMS = [
  { key: 'spotify' as const, label: 'Spotify', color: '#1DB954', Icon: SpotifyIcon, estimated: true },
  { key: 'apple_music' as const, label: 'Apple Music', color: '#FA243C', Icon: AppleMusicIcon, estimated: true },
  { key: 'youtube_music' as const, label: 'YouTube', color: '#FF0000', Icon: YoutubeMusicIcon, estimated: false },
  { key: 'amazon_music' as const, label: 'Amazon', color: '#00A8E1', Icon: AmazonMusicIcon, estimated: true },
] as const;

const OTHER_PLATFORMS = [
  { key: 'tidal' as const, label: 'Tidal', color: '#FFFFFF', Icon: TidalIcon },
  { key: 'deezer' as const, label: 'Deezer', color: '#A238FF', Icon: null },
  { key: 'other' as const, label: 'Other', color: '#6B7280', Icon: null },
] as const;

interface PlatformBreakdownProps {
  platformStreams: PlatformStreams | null;
  totalStreams: number;
  variant?: 'full' | 'compact' | 'bar';
}

/** Full variant — shows each platform with icon, bar, and stream count */
function FullBreakdown({ platformStreams, totalStreams }: { platformStreams: PlatformStreams; totalStreams: number }) {
  const [showOther, setShowOther] = useState(false);
  const maxStreams = Math.max(...MAIN_PLATFORMS.map(p => platformStreams[p.key] ?? 0), 1);

  const otherTotal = OTHER_PLATFORMS.reduce((sum, p) => sum + (platformStreams[p.key] ?? 0), 0);

  return (
    <div className="space-y-2">
      {MAIN_PLATFORMS.map(p => {
        const count = platformStreams[p.key] ?? 0;
        if (count === 0) return null;
        return (
          <div key={p.key} className="flex items-center gap-2.5">
            <p.Icon size={16} className="shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-300">
                  {p.label}
                  {p.estimated && <span className="ml-1 text-[9px] text-gray-600">est.</span>}
                </span>
                <span className="text-xs font-medium text-gray-300">{formatNumber(count)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-900">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${(count / maxStreams) * 100}%`, backgroundColor: p.color }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {otherTotal > 0 && (
        <div>
          <button
            onClick={() => setShowOther(!showOther)}
            className="flex w-full items-center gap-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px]">{showOther ? '\u25B4' : '\u25BE'}</span>
            <span className="flex-1 text-left">Other platforms</span>
            <span className="font-medium">{formatNumber(otherTotal)}</span>
          </button>

          {showOther && (
            <div className="mt-1.5 ml-6 space-y-1.5">
              {OTHER_PLATFORMS.map(p => {
                const count = platformStreams[p.key] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={p.key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {p.label}
                      <span className="ml-1 text-[9px] text-gray-600">est.</span>
                    </span>
                    <span className="text-xs text-gray-400">{formatNumber(count)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact variant — single-line summary with icons */
function CompactBreakdown({ platformStreams }: { platformStreams: PlatformStreams }) {
  return (
    <div className="flex items-center gap-3">
      {MAIN_PLATFORMS.map(p => {
        const count = platformStreams[p.key] ?? 0;
        if (count === 0) return null;
        return (
          <span key={p.key} className="flex items-center gap-1" title={`${p.label}${p.estimated ? ' (est.)' : ''}: ${count.toLocaleString()}`}>
            <p.Icon size={12} style={{ color: p.color }} />
            <span className="text-[11px] text-gray-400">{formatNumber(count)}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Bar variant — stacked horizontal bar showing platform distribution */
function BarBreakdown({ platformStreams, totalStreams }: { platformStreams: PlatformStreams; totalStreams: number }) {
  if (totalStreams === 0) return null;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-900">
      {MAIN_PLATFORMS.map(p => {
        const count = platformStreams[p.key] ?? 0;
        if (count === 0) return null;
        const pct = (count / totalStreams) * 100;
        return (
          <div
            key={p.key}
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: p.color }}
            title={`${p.label}: ${formatNumber(count)}`}
          />
        );
      })}
      {(() => {
        const otherTotal = OTHER_PLATFORMS.reduce((sum, p) => sum + (platformStreams[p.key] ?? 0), 0);
        if (otherTotal === 0) return null;
        return <div className="h-full bg-gray-600" style={{ width: `${(otherTotal / totalStreams) * 100}%` }} title={`Other: ${formatNumber(otherTotal)}`} />;
      })()}
    </div>
  );
}

export function PlatformBreakdown({ platformStreams, totalStreams, variant = 'full' }: PlatformBreakdownProps) {
  if (!platformStreams || totalStreams === 0) return null;

  if (variant === 'compact') return <CompactBreakdown platformStreams={platformStreams} />;
  if (variant === 'bar') return <BarBreakdown platformStreams={platformStreams} totalStreams={totalStreams} />;
  return <FullBreakdown platformStreams={platformStreams} totalStreams={totalStreams} />;
}
