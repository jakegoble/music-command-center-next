'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArtistToggle } from './ArtistToggle';
import { useArtistContext } from '@/lib/contexts/ArtistContext';
import { ARTIST_COLORS, ARTIST_PROFILES, artistToParam, type Artist } from '@/config/notion';
import { DSP_ICONS, type DspKey } from './icons/DspIcons';

const NAV_SECTIONS = [
  {
    label: 'MUSIC',
    links: [
      { href: '/', label: 'Dashboard' },
      { href: '/streaming', label: 'Streaming' },
      { href: '/catalog', label: 'Catalog' },
      { href: '/catalog/albums', label: 'Albums', indent: true },
      { href: '/royalties', label: 'Revenue' },
    ],
  },
  {
    label: 'PEOPLE',
    links: [
      { href: '/collaborators', label: 'Collaborators' },
      { href: '/licensing', label: 'Licensing' },
    ],
  },
  {
    label: 'BUSINESS',
    links: [
      { href: '/clients', label: 'Clients' },
      { href: '/contracts', label: 'Contracts' },
      { href: '/sync-pipeline', label: 'Sync Pipeline' },
      { href: '/content', label: 'Content' },
    ],
  },
  {
    label: 'TOOLS',
    links: [
      { href: '/data-audit', label: 'Data Audit' },
      { href: '/ai-insights', label: 'AI Insights' },
      { href: '/approvals', label: 'Approvals' },
    ],
  },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { artist } = useArtistContext();

  const accentColor =
    artist !== 'all' ? ARTIST_COLORS[artist as Artist] : '#F97316';

  const selectedProfile =
    artist !== 'all' ? ARTIST_PROFILES[artist as Artist] : null;

  function buildHref(href: string) {
    if (artist === 'all') return href;
    return `${href}?artist=${artistToParam(artist)}`;
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-3 border-b border-gray-800 bg-gray-950 px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-white"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-white">Music Command Center</span>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500">Catalog &amp; Sync</span>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-gray-800 bg-gray-950 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Branding */}
        <div className="px-5 pt-6 pb-2">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Music Command Center
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Catalog &amp; Sync
          </p>
        </div>

        {/* Artist Toggle */}
        <div className="px-4 pt-3 pb-1">
          <ArtistToggle />
        </div>

        {/* Artist Profile Card — shown when a specific artist is selected */}
        {selectedProfile && (
          <div className="mx-4 mt-2 mb-1 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
            <div className="flex items-center gap-3">
              <div
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full"
                style={{ boxShadow: `0 0 0 2px ${accentColor}60` }}
              >
                <Image
                  src={selectedProfile.photo}
                  alt={artist as string}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{artist}</p>
                <p className="text-[11px] text-gray-400">{selectedProfile.subtitle}</p>
              </div>
            </div>

            {/* DSP Link Icons */}
            <div className="mt-3 flex items-center gap-2">
              {(Object.entries(selectedProfile.dspLinks) as [DspKey, string][]).map(([key, url]) => {
                const dsp = DSP_ICONS[key];
                if (!dsp || !url) return null;
                const { Icon, label, hoverColor } = dsp;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={label}
                    className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-800"
                    style={{ ['--dsp-hover' as string]: hoverColor }}
                    onMouseEnter={(e) => { (e.currentTarget.firstElementChild as SVGElement).style.color = hoverColor; }}
                    onMouseLeave={(e) => { (e.currentTarget.firstElementChild as SVGElement).style.color = ''; }}
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {section.label}
              </p>
              {section.links.map((link) => {
                const isActive =
                  link.href === '/'
                    ? pathname === '/'
                    : link.href === '/catalog'
                      ? pathname === '/catalog' || (pathname.startsWith('/catalog/') && !pathname.startsWith('/catalog/albums'))
                      : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={buildHref(link.href)}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg py-2 text-sm font-medium transition-colors duration-150 ${
                      link.indent ? 'pl-7 pr-3 text-xs' : 'px-3'
                    } ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: `${accentColor}20`, color: accentColor }
                        : undefined
                    }
                  >
                    {link.indent ? `\u2514 ${link.label}` : link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800/50 px-5 py-4 text-xs text-gray-600">
          &copy; 2026 Enjune Music
        </div>
      </aside>
    </>
  );
}
