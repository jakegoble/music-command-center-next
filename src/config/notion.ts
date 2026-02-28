export const NOTION_DBS = {
  SONG_CATALOG: 'a1054739-9345-4580-bacf-8cda93f7211d',
  SYNC_LICENSING: '2200e857-1373-4a3c-adf6-b6d522c1eb3a',
  COLLABORATORS: '0b5811a0-9afc-4618-b97e-ea5c7bb52e5e',
  LICENSING_CONTACTS: '5f4f4404-502d-4e8d-bd50-6a584255a2db',
  CONTRACTS: '1e0a4aaa-04a8-4726-abdd-da08e65d5514',
  ROYALTY_TRACKING: '3e233507-12c8-4038-aaef-d29b6792abfa',
} as const;

export const ARTIST_OPTIONS = ['Jakke', 'Enjune', 'iLÜ'] as const;
export type Artist = (typeof ARTIST_OPTIONS)[number];
export type ArtistFilter = 'all' | Artist;

export const ARTIST_COLORS: Record<Artist, string> = {
  Jakke: '#3B82F6',
  Enjune: '#8B5CF6',
  iLÜ: '#22C55E',
};

/** Map lowercase URL param values to proper-cased artist names */
export function parseArtistParam(raw: string | null | undefined): ArtistFilter {
  if (!raw || raw === 'all') return 'all';
  const lower = raw.toLowerCase();
  if (lower === 'jakke') return 'Jakke';
  if (lower === 'enjune') return 'Enjune';
  if (lower === 'ilü' || lower === 'ilu') return 'iLÜ';
  return 'all';
}

/** Convert artist filter to lowercase URL param value */
export function artistToParam(artist: ArtistFilter): string {
  if (artist === 'all') return 'all';
  return artist.toLowerCase().replace('ü', 'u');
}
