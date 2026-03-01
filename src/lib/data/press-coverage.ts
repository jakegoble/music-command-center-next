export interface PressCoverage {
  outlet: string;
  title: string;
  url: string;
  artist: string;
  song?: string;
  type: 'Feature' | 'Review' | 'Interview' | 'Mention';
  image?: string;
  date?: string;
  excerpt?: string;
}

/**
 * Curated press coverage — all URLs verified as of 2026-03-01.
 * Once a Notion Press database is added, this can be replaced with a live fetch.
 */
export const PRESS_COVERAGE: PressCoverage[] = [
  // === JAKKE ===
  { outlet: 'EARMILK', title: '"Without Peace" Feature', url: 'https://earmilk.com/2025/06/23/jakke-practices-deep-love-and-connection-with-without-peace/', artist: 'Jakke', song: 'Without Peace', type: 'Feature', date: '2025-06-23', excerpt: 'JAKKE practices deep love and connection on contemplative new single.' },
  { outlet: 'Too Much Love', title: '"Without Peace" Feature', url: 'https://www.toomuchlovemagazine.com/article/jakke-embraces-vulnerability-and-immersive-tech-on-new-single-without-peace', artist: 'Jakke', song: 'Without Peace', type: 'Feature', date: '2025-06-01', excerpt: 'JAKKE embraces vulnerability and immersive tech on new single.' },
  { outlet: 'Caesar Live N Loud', title: '"Without Peace" Review', url: 'https://www.caesarlivenloud.com/2025/06/jakke-shares-new-single-without-peace.html', artist: 'Jakke', song: 'Without Peace', type: 'Review', date: '2025-06-01' },
  { outlet: 'Last Day Deaf', title: '"Karma Response" Review', url: 'https://lastdaydeaf.com/listening-now-nuage-jakke-karma-response/', artist: 'Jakke', song: 'Karma Response', type: 'Review', date: '2025-02-05', excerpt: 'Nuage & JAKKE deliver a mesmerizing electronic collaboration.' },
  { outlet: 'Caesar Live N Loud', title: '"Peace Of Mind" Review', url: 'https://www.caesarlivenloud.com/2025/01/somelee-jakke-share-new-single-peace-of-mind.html', artist: 'Jakke', song: 'Peace Of Mind', type: 'Review', date: '2025-01-01' },
  { outlet: 'Caesar Live N Loud', title: '"Karma Response" Review', url: 'https://www.caesarlivenloud.com/2024/12/jakke-shares-new-single-karma-response.html', artist: 'Jakke', song: 'Karma Response', type: 'Review', date: '2024-12-01' },
  { outlet: 'Acid Stag', title: '"Karma Response" Feature', url: 'https://acidstag.com/2024/12/nuage-jakke-karma-response/', artist: 'Jakke', song: 'Karma Response', type: 'Feature', date: '2024-12-15', excerpt: 'Nuage & JAKKE team up on atmospheric electronic single.' },
  { outlet: 'Last Day Deaf', title: '"Wait" Review', url: 'https://lastdaydeaf.com/listening-now-jakke-wait/', artist: 'Jakke', song: 'Wait', type: 'Review', date: '2024-11-17', image: 'https://lastdaydeaf.com/wp-content/uploads/2024/11/Jakke-Wait.jpg', excerpt: 'JAKKE returns with an introspective new single.' },
  { outlet: 'MELODIC Magazine', title: '"Shallow Mold" Feature', url: 'https://www.melodicmag.com/2024/05/31/jakke-breaks-out-of-his-shallow-mold-in-new-single/', artist: 'Jakke', song: 'Shallow Mold', type: 'Feature', date: '2024-05-31', excerpt: 'JAKKE breaks out of his shallow mold in new single.' },
  { outlet: 'Nagamag', title: '"Hurricane" Review', url: 'https://www.nagamag.com/the-latest/jakke-hurricane-rock-music-review', artist: 'Jakke', song: 'Hurricane', type: 'Review', date: '2023-12-01', excerpt: 'Rock music review of JAKKE\'s Hurricane collaboration with matty co.' },
  { outlet: 'Metal Junkbox', title: '"Hurricane" Review', url: 'https://metaljunkbox.com/en/releases/jakke-hurricane/', artist: 'Jakke', song: 'Hurricane', type: 'Review', date: '2023-12-01' },
  { outlet: 'Too Much Love', title: '"How Do You Love" Feature', url: 'https://toomuchlovemagazine.com/jakkes-very-important-question/', artist: 'Jakke', song: 'How Do You Love (Remixes)', type: 'Feature', excerpt: 'JAKKE asks a very important question on new release.' },
  { outlet: 'Caesar Live N Loud', title: '"Sugar Tide" Review', url: 'https://www.caesarlivenloud.com/2022/08/jakke-shares-new-single-sugar-tide.html', artist: 'Jakke', song: 'Sugar Tide', type: 'Review', date: '2022-08-01', excerpt: 'JAKKE shares shimmering new single Sugar Tide.' },
  { outlet: 'Global-Pop Magazine', title: '"Shallow Mold" Feature', url: 'https://global-pop-magazine.com/jakke-saliendose-del-molde-con-shallow-mold/', artist: 'Jakke', song: 'Shallow Mold', type: 'Feature', date: '2024-05-01', excerpt: 'JAKKE saliendose del molde con Shallow Mold.' },

  // === ENJUNE ===
  { outlet: 'EARMILK', title: '"Yellow Hearts" Premiere', url: 'https://earmilk.com/2019/06/07/enjune-releases-shimmering-new-indie-pop-single-yellow-hearts/', artist: 'Enjune', song: 'Yellow Hearts', type: 'Feature', date: '2019-06-07', excerpt: 'Enjune releases shimmering new indie-pop single.' },
  { outlet: 'Queen City Sounds', title: '"Yellow Hearts" Review', url: 'https://queencitysounds.org/2019/06/22/yellow-hearts-by-enjune-is-a-song-to-soothe-the-soul-of-anyone-suffering-from-the-pangs-of-a-clandestine-love/', artist: 'Enjune', song: 'Yellow Hearts', type: 'Review', date: '2019-06-22', image: 'https://queencitysounds.org/wp-content/uploads/2019/06/enjune4_crop.jpg?w=840', excerpt: 'A song to soothe the soul of anyone suffering from clandestine love.' },
  { outlet: 'American Pancake', title: '"Lost In The Woods" Review', url: 'https://www.americanpancake.com/2019/07/enjunes-poignant-and-beautifully-sad.html', artist: 'Enjune', song: 'Lost In The Woods', type: 'Review', date: '2019-07-14', image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh60m5MSJzyzJLwuNqfsax_KsSsNXkGyivdfKNS8lgLaE3gL5lAiCLR3GjTVyKiIA23UkjC6_Sg8_HzjmEVK6n0HPg9I9Ht9NfsNaMYYYrO4Xaejlmp0rXKB2Oaq7ZVfWsoCZITbRE4HfC-/s640/enjune.jpg', excerpt: 'A sweeping, image-inducing, alt folk meets chamber pop ballad.' },
  { outlet: 'EARMILK', title: '"Be Alright" Premiere', url: 'https://earmilk.com/2019/02/07/enjune-honors-late-friend-in-heartfelt-debut-single-be-alright-premiere/', artist: 'Enjune', song: 'Be Alright', type: 'Feature', date: '2019-02-07', excerpt: 'Enjune honors late friend in heartfelt debut single.' },
];

/**
 * Get press coverage for a specific song or artist.
 * Returns results sorted by date (most recent first).
 */
export function getPressCoverage(songTitle?: string, artist?: string): PressCoverage[] {
  const filtered = PRESS_COVERAGE.filter(p => {
    if (songTitle && p.song) {
      return p.song.toLowerCase() === songTitle.toLowerCase();
    }
    if (artist) {
      return p.artist.toLowerCase() === artist.toLowerCase();
    }
    return true;
  });
  return filtered.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}
