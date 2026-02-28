import type { SongDetail } from '@/lib/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function generateTrackDescription(song: SongDetail): string | null {
  const parts: string[] = [];
  let dataPoints = 0;

  // Opening — title, genre, artist, release
  const genreStr = song.genre.length > 0 ? song.genre.slice(0, 2).join('/') : null;
  if (genreStr) dataPoints++;

  let opening = `"${song.title}" is`;
  if (genreStr) {
    opening += ` a ${genreStr} track`;
  } else {
    opening += ` a track`;
  }
  opening += ` by ${song.artist}`;

  if (song.release_date) {
    const d = new Date(song.release_date);
    const month = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    opening += `, released in ${month}`;
    dataPoints++;
  }
  if (song.distributor) {
    opening += ` via ${song.distributor}`;
    dataPoints++;
  }
  opening += '.';
  parts.push(opening);

  // Album context
  if (song.album_ep) {
    parts.push(`The track appears on ${song.album_ep}.`);
    dataPoints++;
  }

  // Sound profile
  const soundParts: string[] = [];
  if (song.bpm) {
    soundParts.push(`${song.bpm} BPM`);
    dataPoints++;
  }
  if (song.key) {
    soundParts.push(`the key of ${song.key}`);
    dataPoints++;
  }
  if (soundParts.length > 0) {
    let sound = `Clocking in at ${soundParts.join(' in ')}`;
    if (song.mood.length > 0) {
      sound += `, it carries a ${song.mood.slice(0, 2).join(', ').toLowerCase()} feel`;
      dataPoints++;
    }
    sound += '.';
    parts.push(sound);
  } else if (song.mood.length > 0) {
    parts.push(`The track carries a ${song.mood.slice(0, 3).join(', ').toLowerCase()} feel.`);
    dataPoints++;
  }

  // Performance
  if (song.total_streams > 0) {
    parts.push(`It has accumulated ${formatNumber(song.total_streams)} streams to date.`);
    dataPoints++;
  }

  // Collaborators
  if (song.collaborators.length > 0) {
    const names = song.collaborators.map(c => c.name).filter(Boolean);
    if (names.length > 0) {
      parts.push(`The track features contributions from ${names.join(', ')}.`);
      dataPoints++;
    }
  }

  // Sync context
  if (song.sync_available) {
    let syncNote = 'Currently available for sync licensing';
    if (song.sync_tier) {
      syncNote += ` as a ${song.sync_tier.replace('Tier ', '').toLowerCase()} priority`;
    }
    syncNote += '.';
    parts.push(syncNote);
    dataPoints++;
  }

  // Technical features
  const features: string[] = [];
  if (song.atmos_mix) features.push('Dolby Atmos');
  if (song.has_360ra) features.push('Sony 360 Reality Audio');
  if (song.stems_complete) features.push('full stems');
  if (features.length > 0) {
    parts.push(`Available in ${features.join(', ')}.`);
    dataPoints++;
  }

  // Require at least 3 data points beyond title/artist
  if (dataPoints < 3) return null;

  return parts.join(' ');
}
