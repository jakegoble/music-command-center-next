export interface PressCoverage {
  outlet: string;
  title: string;
  url: string;
  artist: string;
  song?: string;
  type: 'Feature' | 'Review' | 'Interview' | 'Mention';
}

/**
 * Curated press coverage extracted from Sync Catalog One-Sheet.
 * Once a Notion Press database is added, this can be replaced with a live fetch.
 */
export const PRESS_COVERAGE: PressCoverage[] = [
  // === JAKKE — EP / Artist Features ===
  { outlet: 'TMRW Magazine', title: 'JAKKE Feature', url: 'https://www.tmrwmagazine.com/music/jakke-delicate', artist: 'Jakke', type: 'Feature' },
  { outlet: 'Flaunt', title: 'JAKKE Feature', url: 'https://flaunt.com/content/jakke-delicate', artist: 'Jakke', type: 'Feature' },
  { outlet: 'Loading Magazine', title: 'JAKKE Feature', url: 'https://loadingmagazine.com/jakke/', artist: 'Jakke', type: 'Feature' },
  { outlet: 'Brain Bakery', title: 'JAKKE Feature', url: 'https://brainbakery.co/2023/jakke/', artist: 'Jakke', type: 'Feature' },
  { outlet: 'Token Society', title: 'JAKKE Feature', url: 'https://tokensociety.com/jakke/', artist: 'Jakke', type: 'Feature' },

  // === JAKKE — Single Reviews ===
  { outlet: 'EARMILK', title: '"Delicate" Review', url: 'https://earmilk.com/2023/jakke-delicate/', artist: 'Jakke', song: 'Delicate', type: 'Review' },
  { outlet: 'FAULT Magazine', title: '"Hurricane" Premiere', url: 'https://fault-magazine.com/jakke-hurricane/', artist: 'Jakke', song: 'Hurricane', type: 'Review' },
  { outlet: 'Last Day Deaf', title: '"Burn Me Up" Review', url: 'https://lastdaydeaf.com/jakke-burn-me-up/', artist: 'Jakke', song: 'Burn Me Up', type: 'Review' },
  { outlet: 'Alfitude', title: '"Delicate" Feature', url: 'https://alfitude.com/jakke-delicate/', artist: 'Jakke', song: 'Delicate', type: 'Review' },
  { outlet: 'Give It a Spin', title: '"Hurricane" Review', url: 'https://giveitaspin.gr/jakke-hurricane/', artist: 'Jakke', song: 'Hurricane', type: 'Review' },
  { outlet: 'Rival Magazine', title: 'JAKKE Feature', url: 'https://rivalmagazine.com/jakke/', artist: 'Jakke', type: 'Feature' },
  { outlet: 'RMAS Mexico', title: '"Father World" Feature', url: 'https://rmasmexico.com/jakke-father-world/', artist: 'Jakke', song: 'Father World (Mama Earth)', type: 'Review' },
  { outlet: 'Caesar Live N Loud', title: '"How Do You Love" Review', url: 'https://caesarlivenloud.com/jakke-how-do-you-love/', artist: 'Jakke', song: 'How Do You Love (Remixes)', type: 'Review' },
  { outlet: 'Acid Stag', title: '"Burn Me Up" Feature', url: 'https://acidstag.com/jakke-burn-me-up/', artist: 'Jakke', song: 'Burn Me Up', type: 'Review' },
  { outlet: 'Mystic Sons', title: '"Delicate" Feature', url: 'https://mysticsons.com/jakke-delicate/', artist: 'Jakke', song: 'Delicate', type: 'Review' },

  // === ENJUNE ===
  { outlet: 'EARMILK', title: '"Fuck Me Up" Review', url: 'https://earmilk.com/2023/enjune-fuck-me-up/', artist: 'Enjune', song: 'Fuck Me Up', type: 'Review' },
  { outlet: 'American Pancake', title: 'Enjune Feature', url: 'https://americanpancake.com/enjune/', artist: 'Enjune', type: 'Feature' },
  { outlet: 'Queen City Sounds', title: 'Enjune Feature', url: 'https://queencitysounds.wordpress.com/enjune/', artist: 'Enjune', type: 'Feature' },
];

/**
 * Get press coverage for a specific song or artist.
 */
export function getPressCoverage(songTitle?: string, artist?: string): PressCoverage[] {
  return PRESS_COVERAGE.filter(p => {
    if (songTitle && p.song) {
      return p.song.toLowerCase() === songTitle.toLowerCase();
    }
    if (artist) {
      return p.artist.toLowerCase() === artist.toLowerCase();
    }
    return true;
  });
}
