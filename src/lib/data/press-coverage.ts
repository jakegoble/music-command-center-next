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
 * Curated press coverage — all URLs verified as of 2026-03-03.
 * Once a Notion Press database is added, this can be replaced with a live fetch.
 */
export const PRESS_COVERAGE: PressCoverage[] = [
  // === JAKKE ===
  { outlet: 'FAULT Magazine', title: '"Without Peace" Review', url: 'https://fault-magazine.com/2025/08/jakke-drops-without-peace-a-mix-of-alt-rock-and-club-culture/', artist: 'Jakke', song: 'Without Peace', type: 'Review', date: '2025-08-05', excerpt: 'A sensual meditation wrapped in a dancefloor-ready package.' },
  { outlet: 'Purple Melon', title: '"Without Peace" Roundup', url: 'https://purplemelonmu.com/2025/06/27/dance-collective-gorgon-city-x-john-summit-mati-troglia-x-rae-jakke-theatrophone-tmpst-x-maynorr-x-bridges-just-geo-phatadam-x-glow-x-palffi/', artist: 'Jakke', song: 'Without Peace', type: 'Feature', date: '2025-06-27', excerpt: 'A soul-stirring journey into the complexities of love.' },
  { outlet: 'EARMILK', title: '"Without Peace" Feature', url: 'https://earmilk.com/2025/06/23/jakke-practices-deep-love-and-connection-with-without-peace/', artist: 'Jakke', song: 'Without Peace', type: 'Feature', date: '2025-06-23', excerpt: 'JAKKE practices deep love and connection on contemplative new single.' },
  { outlet: 'Iggy Magazine', title: '"Without Peace" Review', url: 'https://www.iggymagazine.com/jakke-transforme-le-tumulte-amoureux-en-offrande-apaisee-avec-without-peace/', artist: 'Jakke', song: 'Without Peace', type: 'Review', date: '2025-06-19', excerpt: 'JAKKE transforms romantic turbulence into a peaceful offering.' },
  { outlet: 'Too Much Love', title: '"Without Peace" Feature', url: 'https://www.toomuchlovemagazine.com/article/jakke-embraces-vulnerability-and-immersive-tech-on-new-single-without-peace', artist: 'Jakke', song: 'Without Peace', type: 'Feature', date: '2025-06-01', excerpt: 'JAKKE embraces vulnerability and immersive tech on new single.' },
  { outlet: 'Caesar Live N Loud', title: '"Without Peace" Review', url: 'https://www.caesarlivenloud.com/2025/06/jakke-shares-new-single-without-peace.html', artist: 'Jakke', song: 'Without Peace', type: 'Review', date: '2025-06-01' },
  { outlet: 'Last Day Deaf', title: '"Karma Response" Review', url: 'https://lastdaydeaf.com/listening-now-nuage-jakke-karma-response/', artist: 'Jakke', song: 'Karma Response', type: 'Review', date: '2025-02-05', excerpt: 'Nuage & JAKKE deliver a mesmerizing electronic collaboration.' },
  { outlet: 'Bong Mines Entertainment', title: '"Peace Of Mind" Review', url: 'https://www.bongminesentertainment.com/somelee-jakke-peace-of-mind-single/', artist: 'Jakke', song: 'Peace Of Mind', type: 'Review', date: '2025-01-24', excerpt: 'A mesmerizing blend of lush soundscapes, heartfelt lyrics, and pulsating rhythms.' },
  { outlet: 'Iggy Magazine', title: '"Peace Of Mind" Feature', url: 'https://www.iggymagazine.com/somelee-et-jakke-illuminent-la-scene-musicale-avec-peace-of-mind/', artist: 'Jakke', song: 'Peace Of Mind', type: 'Feature', date: '2025-01-22', excerpt: 'Somelee and JAKKE illuminate the music scene with Peace Of Mind.' },
  { outlet: 'Purple Melon', title: '"Peace Of Mind" Roundup', url: 'https://purplemelonmu.com/2025/01/20/dance-collective-jakke-x-somelee-soft-jaw-x-bronze-whale-x-sofasound-wayde-scibilia-gan-music-2lot-doppe-kokke-x-jordan-grace-x-eriice/', artist: 'Jakke', song: 'Peace Of Mind', type: 'Feature', date: '2025-01-20', excerpt: 'Soulful vocals intertwine seamlessly with lush production, creating a hypnotic atmosphere.' },
  { outlet: 'Elektrobeats', title: '"Peace Of Mind" Feature', url: 'https://elektrobeats.org/207185', artist: 'Jakke', song: 'Peace Of Mind', type: 'Feature', date: '2025-01-18' },
  { outlet: 'Essential House', title: '"Peace Of Mind" Feature', url: 'https://essentialhouse.club/2025/01/somelee-jakke-peace-of-mind-on-bar-25-music/', artist: 'Jakke', song: 'Peace Of Mind', type: 'Feature', date: '2025-01-17', excerpt: 'Soulful depth meets a contemporary edge on Bar 25 Music.' },
  { outlet: 'Electrobuzz', title: '"Peace Of Mind" Feature', url: 'https://www.electrobuzz.net/2025/01/somelee-jakke-peace-of-mind-on-bar-25-music/670746/', artist: 'Jakke', song: 'Peace Of Mind', type: 'Feature', date: '2025-01-17' },
  { outlet: 'Caesar Live N Loud', title: '"Peace Of Mind" Review', url: 'https://www.caesarlivenloud.com/2025/01/somelee-jakke-share-new-single-peace-of-mind.html', artist: 'Jakke', song: 'Peace Of Mind', type: 'Review', date: '2025-01-01' },
  { outlet: 'Caesar Live N Loud', title: '"Karma Response" Review', url: 'https://www.caesarlivenloud.com/2024/12/jakke-shares-new-single-karma-response.html', artist: 'Jakke', song: 'Karma Response', type: 'Review', date: '2024-12-01' },
  { outlet: 'Acid Stag', title: '"Karma Response" Feature', url: 'https://acidstag.com/2024/12/nuage-jakke-karma-response/', artist: 'Jakke', song: 'Karma Response', type: 'Feature', date: '2024-12-15', excerpt: 'Nuage & JAKKE team up on atmospheric electronic single.' },
  { outlet: 'Last Day Deaf', title: '"Wait" Review', url: 'https://lastdaydeaf.com/listening-now-jakke-wait/', artist: 'Jakke', song: 'Wait', type: 'Review', date: '2024-11-17', image: 'https://lastdaydeaf.com/wp-content/uploads/2024/11/Jakke-Wait.jpg', excerpt: 'JAKKE returns with an introspective new single.' },
  { outlet: 'MELODIC Magazine', title: '"Shallow Mold" Feature', url: 'https://www.melodicmag.com/2024/05/31/jakke-breaks-out-of-his-shallow-mold-in-new-single/', artist: 'Jakke', song: 'Shallow Mold', type: 'Feature', date: '2024-05-31', excerpt: 'JAKKE breaks out of his shallow mold in new single.' },
  { outlet: 'Global-Pop Magazine', title: '"Shallow Mold" Feature', url: 'https://global-pop-magazine.com/jakke-saliendose-del-molde-con-shallow-mold/', artist: 'Jakke', song: 'Shallow Mold', type: 'Feature', date: '2024-05-01', excerpt: 'JAKKE saliendose del molde con Shallow Mold.' },
  { outlet: 'Nagamag', title: '"Hurricane" Review', url: 'https://www.nagamag.com/the-latest/jakke-hurricane-rock-music-review', artist: 'Jakke', song: 'Hurricane', type: 'Review', date: '2023-12-01', excerpt: 'Rock music review of JAKKE\'s Hurricane collaboration with matty co.' },
  { outlet: 'Metal Junkbox', title: '"Hurricane" Review', url: 'https://metaljunkbox.com/en/releases/jakke-hurricane/', artist: 'Jakke', song: 'Hurricane', type: 'Review', date: '2023-12-01' },
  { outlet: 'Parkett Channel', title: '"How Do You Love (TACHES Remix)" Feature', url: 'https://www.parkettchannel.it/jakke-how-do-you-love-taches-big-picture-mix/', artist: 'Jakke', song: 'How Do You Love (Remixes)', type: 'Feature', date: '2023-05-11', excerpt: 'TACHES remix transforms the EP into a powerful, sonically dynamic dance journey.' },
  { outlet: 'Too Much Love', title: '"How Do You Love" Feature', url: 'https://toomuchlovemagazine.com/jakkes-very-important-question/', artist: 'Jakke', song: 'How Do You Love (Remixes)', type: 'Feature', excerpt: 'JAKKE asks a very important question on new release.' },
  { outlet: 'Caesar Live N Loud', title: '"Sugar Tide" Review', url: 'https://www.caesarlivenloud.com/2022/08/jakke-shares-new-single-sugar-tide.html', artist: 'Jakke', song: 'Sugar Tide', type: 'Review', date: '2022-08-01', excerpt: 'JAKKE shares shimmering new single Sugar Tide.' },
  { outlet: 'Give It A Spin', title: '"Waves" Review', url: 'https://giveitaspin.gr/2022/04/jakke-waves.html', artist: 'Jakke', song: 'Waves', type: 'Review', date: '2022-04-17', excerpt: 'An absolute banger with fresh, modern production and clean, articulate vocals.' },
  { outlet: 'Wolf in a Suit', title: '"Waves" Feature', url: 'https://wolfinasuit.com/2022/04/13/listen-waves-by-jakke/', artist: 'Jakke', song: 'Waves', type: 'Feature', date: '2022-04-13', excerpt: 'An absolutely captivating sonic creation with honesty, passion and fantastic lyricism.' },

  // === ENJUNE ===
  { outlet: 'EARMILK', title: '"Yellow Hearts" Premiere', url: 'https://earmilk.com/2019/06/07/enjune-releases-shimmering-new-indie-pop-single-yellow-hearts/', artist: 'Enjune', song: 'Yellow Hearts', type: 'Feature', date: '2019-06-07', excerpt: 'Enjune releases shimmering new indie-pop single.' },
  { outlet: 'Queen City Sounds', title: '"Yellow Hearts" Review', url: 'https://queencitysounds.org/2019/06/22/yellow-hearts-by-enjune-is-a-song-to-soothe-the-soul-of-anyone-suffering-from-the-pangs-of-a-clandestine-love/', artist: 'Enjune', song: 'Yellow Hearts', type: 'Review', date: '2019-06-22', image: 'https://queencitysounds.org/wp-content/uploads/2019/06/enjune4_crop.jpg?w=840', excerpt: 'A song to soothe the soul of anyone suffering from clandestine love.' },
  { outlet: 'American Pancake', title: '"Lost In The Woods" Review', url: 'https://www.americanpancake.com/2019/07/enjunes-poignant-and-beautifully-sad.html', artist: 'Enjune', song: 'Lost In The Woods', type: 'Review', date: '2019-07-14', image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh60m5MSJzyzJLwuNqfsax_KsSsNXkGyivdfKNS8lgLaE3gL5lAiCLR3GjTVyKiIA23UkjC6_Sg8_HzjmEVK6n0HPg9I9Ht9NfsNaMYYYrO4Xaejlmp0rXKB2Oaq7ZVfWsoCZITbRE4HfC-/s640/enjune.jpg', excerpt: 'A sweeping, image-inducing, alt folk meets chamber pop ballad.' },
  { outlet: 'EARMILK', title: '"Be Alright" Premiere', url: 'https://earmilk.com/2019/02/07/enjune-honors-late-friend-in-heartfelt-debut-single-be-alright-premiere/', artist: 'Enjune', song: 'Be Alright', type: 'Feature', date: '2019-02-07', excerpt: 'Enjune honors late friend in heartfelt debut single.' },

  // === iLÜ ===
  { outlet: 'Shoutout LA', title: 'iLÜ Artist Interview', url: 'https://shoutoutla.com/meet-ilu-singer-songwriter-musician/', artist: 'iLÜ', type: 'Interview', date: '2024-03-04', excerpt: 'Singing and songwriting to me is truly the only time I feel like I am myself.' },
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
