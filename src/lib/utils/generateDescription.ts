import type { SongDetail } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatStreamMilestone(streams: number): string | null {
  if (streams >= 10_000_000) return `${(streams / 1_000_000).toFixed(0)}M+ Streams`;
  if (streams >= 1_000_000) return `${(streams / 1_000_000).toFixed(1)}M Streams`;
  if (streams >= 500_000) return `${(streams / 1_000).toFixed(0)}K Streams`;
  if (streams >= 100_000) return `${(streams / 1_000).toFixed(0)}K Streams`;
  if (streams >= 10_000) return `${(streams / 1_000).toFixed(0)}K Streams`;
  return null;
}

/** Detect if a title looks like a remix collection / multi-track EP */
function isRemixCollection(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes('remixes') || lower.includes('remix ep') || lower.includes('remix pack');
}

export function generateHighlights(song: SongDetail): string[] {
  const highlights: string[] = [];

  const streamChip = formatStreamMilestone(song.total_streams);
  if (streamChip) highlights.push(streamChip);

  const labelChip = song.parsed_notes?.label_info;
  if (labelChip && labelChip.length < 60) highlights.push(labelChip);
  else if (song.distributor) highlights.push(song.distributor);

  if (song.sync_available && song.sync_tier) highlights.push(`Sync ${song.sync_tier}`);
  else if (song.sync_available) highlights.push('Sync Ready');

  if (song.atmos_mix) highlights.push('Dolby Atmos');
  if (song.has_360ra) highlights.push('360 Reality Audio');
  if (song.stems_complete) highlights.push('Full Stems');

  if (song.album_ep) highlights.push(song.album_ep);

  // Show track count for remix collections
  const trackCount = song.parsed_notes?.track_listing?.length ?? 0;
  if (trackCount > 0) highlights.push(`${trackCount} Tracks`);

  if (song.collaborators.length > 0) {
    highlights.push(`${song.collaborators.length} Collaborator${song.collaborators.length > 1 ? 's' : ''}`);
  }

  return highlights.slice(0, 6);
}

export function generateTrackDescription(song: SongDetail): string | null {
  const sentences: string[] = [];
  let dataPoints = 0;
  const isRemix = isRemixCollection(song.title);
  const trackCount = song.parsed_notes?.track_listing?.length ?? 0;

  // --- Opening: narrative intro ---
  const genres = song.genre.slice(0, 2);
  const genreStr = genres.length > 0 ? genres.join('/').toLowerCase() : null;
  if (genreStr) dataPoints++;

  let intro = `"${song.title}" is`;
  if (isRemix && trackCount > 0) {
    // Remix collection intro
    if (genreStr) {
      intro += ` a ${genreStr} remix collection by ${song.artist} featuring ${trackCount} remixes`;
    } else {
      intro += ` a remix collection by ${song.artist} featuring ${trackCount} remixes`;
    }
  } else if (genreStr) {
    const article = /^[aeiou]/i.test(genreStr) ? 'an' : 'a';
    intro += ` ${article} ${genreStr} track by ${song.artist}`;
  } else {
    intro += ` a track by ${song.artist}`;
  }

  // Weave in context naturally
  const contextParts: string[] = [];
  if (song.release_date) {
    const d = new Date(song.release_date);
    contextParts.push(`released in ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    dataPoints++;
  }
  if (song.distributor) {
    const labelInfo = song.parsed_notes?.label_info;
    // Guard: label_info over 60 chars is likely polluted with extra data
    if (labelInfo && labelInfo !== song.distributor && labelInfo.length < 60) {
      contextParts.push(`distributed through ${song.distributor} via ${labelInfo}`);
    } else {
      contextParts.push(`distributed through ${song.distributor}`);
    }
    dataPoints++;
  }

  if (contextParts.length > 0) {
    intro += `, ${contextParts.join(' and ')}`;
  }
  intro += '.';
  sentences.push(intro);

  // --- Performance milestone ---
  if (song.total_streams >= 100_000) {
    const streamStr = formatNumber(song.total_streams);
    if (song.total_streams >= 1_000_000) {
      sentences.push(`With ${streamStr} streams and counting, it stands as one of ${song.artist}'s most successful releases.`);
    } else {
      sentences.push(`The track has built a solid following with ${streamStr} streams to date.`);
    }
    dataPoints++;
  } else if (song.total_streams > 0) {
    sentences.push(`The track has gathered ${formatNumber(song.total_streams)} streams so far.`);
    dataPoints++;
  }

  // --- Sound character ---
  const soundDetails: string[] = [];
  if (song.bpm) { soundDetails.push(`${song.bpm} BPM`); dataPoints++; }
  if (song.key) { soundDetails.push(`the key of ${song.key}`); dataPoints++; }

  if (soundDetails.length > 0 && song.mood.length > 0) {
    const moodStr = song.mood.slice(0, 2).join(' and ').toLowerCase();
    sentences.push(`Set at ${soundDetails.join(' in ')} with a ${moodStr} energy, the production creates a distinctive sonic signature.`);
    dataPoints++;
  } else if (soundDetails.length > 0) {
    sentences.push(`The track sits at ${soundDetails.join(' in ')}.`);
  } else if (song.mood.length > 0) {
    sentences.push(`It carries a ${song.mood.slice(0, 3).join(', ').toLowerCase()} energy.`);
    dataPoints++;
  }

  // --- Album context ---
  if (song.album_ep) {
    sentences.push(`Featured on ${song.album_ep}.`);
    dataPoints++;
  }

  // --- Collaborators ---
  if (song.collaborators.length > 0) {
    const names = song.collaborators.map(c => c.name).filter(Boolean);
    if (names.length === 1) {
      sentences.push(`The track was crafted with ${names[0]}.`);
    } else if (names.length > 1) {
      sentences.push(`Brought to life with contributions from ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`);
    }
    dataPoints++;
  }

  // --- Sync readiness ---
  if (song.sync_available) {
    const formats: string[] = [];
    if (song.atmos_mix) formats.push('Dolby Atmos');
    if (song.stems_complete) formats.push('stems');
    if (song.has_instrumental) formats.push('instrumental');

    if (formats.length > 0) {
      sentences.push(`Available for sync licensing with ${formats.join(', ')} ready to go.`);
    } else {
      sentences.push('Currently available for sync licensing opportunities.');
    }
    dataPoints++;
  }

  // Require at least 3 data points for a meaningful story
  if (dataPoints < 3) return null;

  return sentences.join(' ');
}
