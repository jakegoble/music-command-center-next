// ---------------------------------------------------------------------------
// Song types
// ---------------------------------------------------------------------------

export interface SongSummary {
  id: string;
  slug: string;
  title: string;
  artist: string;
  status: string;
  genre: string[];
  mood: string[];
  bpm: number | null;
  key: string | null;
  duration: string | null;
  release_date: string | null;
  distributor: string | null;
  total_streams: number;
  popularity_score: number | null;
  isrc: string | null;
  upc: string | null;
  album_ep: string | null;
  atmos_mix: boolean;
  stems_complete: boolean;
  sync_available: boolean;
  sync_tier: string | null;
  artwork: boolean;
  explicit: boolean;
  spotify_link: string | null;
  apple_music_link: string | null;
  youtube_link: string | null;
  collaborator_count: number;
  contract_count: number;
  estimated_revenue: number;
  ascap_registered: boolean;
  mlc_registered: boolean;
  soundexchange_registered: boolean;
  youtube_content_id: boolean;
}

export interface SongDetail extends SongSummary {
  producers: string | null;
  songwriters: string | null;
  publisher: string | null;
  writer_splits: string | null;
  writer_splits_parsed: { name: string; percentage: number; ipi: string | null; pro: string | null }[];
  notes: string | null;
  lyrics_status: string | null;
  similar_artists: string | null;
  usage_scenarios: string[];
  scene_suggestions: string | null;
  songtrust_id: string | null;
  ppl_registered: boolean;
  songtrust_registered: boolean;
  lyricfind_submitted: boolean;
  musixmatch_submitted: boolean;
  genius_submitted: boolean;
  music_gateway_submitted: boolean;
  disco_submitted: boolean;
  songtradr_submitted: boolean;
  discogs_submitted: boolean;
  has_instrumental: boolean;
  has_acapella: boolean;
  has_15s_edit: boolean;
  has_30s_edit: boolean;
  has_60s_edit: boolean;
  has_360ra: boolean;
  has_project_file: boolean;
  sync_status: string | null;
  sync_edit_status: string | null;
  sync_restrictions: string | null;
  disco_link: string | null;
  master_ownership: string | null;
  parsed_notes: {
    description: string | null;
    emails: string[];
    isrcs: string[];
    upcs: string[];
    label_info: string | null;
    urls: string[];
    track_listing: string[];
    splits_info: string | null;
  } | null;
  generated_description: string | null;
  highlights: string[];
  story_description: string | null;
  has_stereo_master: boolean;
  artwork_url: string | null;
  collaborators: CollaboratorSummary[];
  contracts: ContractSummary[];
  licensing_contacts: LicensingContactSummary[];
  royalties: RoyaltyEntry[];
}

// ---------------------------------------------------------------------------
// Album types
// ---------------------------------------------------------------------------

export interface AlbumSummary {
  slug: string;
  name: string;
  artist: string;
  track_count: number;
  total_streams: number;
  estimated_revenue: number;
  release_date: string | null;
  genres: string[];
  status: string;
  artwork_url: string | null;
}

export interface AlbumDetail extends AlbumSummary {
  tracks: SongSummary[];
  avg_bpm: number | null;
  sync_ready_count: number;
  has_atmos_count: number;
  has_stems_count: number;
}

export interface AlbumsResponse {
  albums: AlbumSummary[];
  total: number;
}

// ---------------------------------------------------------------------------
// Collaborator types
// ---------------------------------------------------------------------------

export interface CollaboratorSummary {
  id: string;
  name: string;
  slug: string;
  roles: string[];
  pro_affiliation: string | null;
  ipi_number: string | null;
  agreement_status: string | null;
  song_count: number;
}

export interface CollaboratorDetail extends CollaboratorSummary {
  email: string | null;
  phone: string | null;
  total_streams: number;
  estimated_revenue: number;
  songs: { title: string; slug: string; artist: string }[];
}

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------

export interface ContractSummary {
  id: string;
  document_name: string;
  type: string | null;
  parties: string | null;
  date_signed: string | null;
  expiration: string | null;
  status: string | null;
  key_terms: string | null;
}

// ---------------------------------------------------------------------------
// Licensing Contact types
// ---------------------------------------------------------------------------

export interface LicensingContactSummary {
  id: string;
  company: string;
  contact_name: string | null;
  status: string | null;
  last_contact: string | null;
  genre_focus: string[];
}

// ---------------------------------------------------------------------------
// Royalty types
// ---------------------------------------------------------------------------

export interface RoyaltyEntry {
  id: string;
  artist: string | null;
  period: string | null;
  quarter: string | null;
  ascap_performance: number | null;
  distributor_streaming: number | null;
  mlc_mechanical: number | null;
  ppl_international: number | null;
  soundexchange_digital: number | null;
  sync_licensing: number | null;
  youtube_social: number | null;
  other: number | null;
  total: number;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface CatalogResponse {
  songs: SongSummary[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface CatalogStats {
  total_songs: number;
  released: number;
  unreleased: number;
  in_progress: number;
  total_streams: number;
  total_estimated_revenue: number;
  avg_bpm: number | null;
  sync_ready: number;
  has_atmos: number;
  has_stems: number;
  genre_distribution: Record<string, number>;
  mood_distribution: Record<string, number>;
  key_distribution: Record<string, number>;
  artist_distribution: Record<string, number>;
  distributor_distribution: Record<string, number>;
  year_distribution: Record<string, number>;
  album_distribution: Record<string, number>;
  total_albums: number;
}

export interface DataAuditResponse {
  totalSongs: number;
  songsByArtist: Record<string, number>;
  totalStreams: number;
  streamsByArtist: Record<string, number>;
  duplicateSongs: { title: string; isrc: string | null; count: number }[];
  nullFields: {
    missingISRC: string[];
    missingStreams: string[];
  };
  allArtistSum: number;
  individualArtistSum: number;
  sumsMatch: boolean;
  allSongCount: number;
  perArtistSongCount: number;
  countsMatch: boolean;
}
