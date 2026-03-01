// ---------------------------------------------------------------------------
// Artist DNA — Intake Question Definitions
// ---------------------------------------------------------------------------

export type QuestionType = 'single-select' | 'multi-select' | 'scale' | 'text';

export type IntakeCategory =
  | 'goals'
  | 'audience'
  | 'content'
  | 'collaborations'
  | 'revenue'
  | 'brand'
  | 'competitive';

export interface IntakeQuestion {
  id: string;
  category: IntakeCategory;
  label: string;
  type: QuestionType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: [string, string];
  placeholder?: string;
  helpText?: string;
}

export interface CategoryMeta {
  id: IntakeCategory;
  label: string;
  icon: string;
  description: string;
}

export const INTAKE_CATEGORIES: CategoryMeta[] = [
  { id: 'goals', label: 'Goals & Direction', icon: '🎯', description: 'Primary objectives and strategic direction for this artist' },
  { id: 'audience', label: 'Target Audience', icon: '👥', description: 'Who this artist is trying to reach and where' },
  { id: 'content', label: 'Content Strategy', icon: '📱', description: 'Social media, content formats, and posting approach' },
  { id: 'collaborations', label: 'Collaboration Preferences', icon: '🤝', description: 'Openness to collaboration and types of partnerships' },
  { id: 'revenue', label: 'Revenue Priorities', icon: '💰', description: 'Revenue streams, targets, and business priorities' },
  { id: 'brand', label: 'Brand Identity', icon: '🎨', description: 'Sound, visual aesthetic, and artistic identity' },
  { id: 'competitive', label: 'Competitive Landscape', icon: '🔍', description: 'Market positioning and competitive analysis' },
];

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  // --- Goals & Direction (5 questions) ---
  {
    id: 'goals-primary',
    category: 'goals',
    label: 'What is the primary goal for this artist in the next 12 months?',
    type: 'single-select',
    options: ['Grow streaming numbers', 'Land sync placements', 'Build a live performance circuit', 'Release a full-length project', 'Grow social media following', 'Generate more revenue'],
    helpText: 'This shapes how the scoring system weighs different dimensions.',
  },
  {
    id: 'goals-success',
    category: 'goals',
    label: 'What does success look like for this artist by end of year?',
    type: 'text',
    placeholder: 'e.g., 50K monthly listeners, 3 sync placements, EP release...',
    helpText: 'Be specific — these become the benchmarks the system measures against.',
  },
  {
    id: 'goals-streaming-vs-sync',
    category: 'goals',
    label: 'How important is streaming growth vs. sync revenue?',
    type: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Streaming Focused', 'Sync Focused'],
    helpText: 'This directly adjusts scoring weights between streaming and catalog dimensions.',
  },
  {
    id: 'goals-listener-target',
    category: 'goals',
    label: 'What is the target monthly listener count?',
    type: 'single-select',
    options: ['Under 10K', '10K–50K', '50K–100K', '100K–500K', '500K+'],
    helpText: 'Sets the benchmark for streaming score calculations.',
  },
  {
    id: 'goals-release-cadence',
    category: 'goals',
    label: 'Is there a target release cadence?',
    type: 'single-select',
    options: ['Single every month', 'Single every 6–8 weeks', 'EP every quarter', 'Album per year', 'No specific cadence'],
    helpText: 'Informs catalog growth expectations and release planning insights.',
  },

  // --- Target Audience (3 questions) ---
  {
    id: 'audience-ideal-listener',
    category: 'audience',
    label: 'Who is the ideal listener for this artist?',
    type: 'text',
    placeholder: 'Age range, interests, lifestyle, music taste...',
    helpText: 'Helps tailor content strategy and platform recommendations.',
  },
  {
    id: 'audience-platforms',
    category: 'audience',
    label: 'Which platforms does the target audience use most?',
    type: 'multi-select',
    options: ['Spotify', 'Apple Music', 'YouTube Music', 'TikTok', 'Instagram', 'SoundCloud', 'Bandcamp'],
    helpText: 'Prioritizes which platform metrics to highlight.',
  },
  {
    id: 'audience-markets',
    category: 'audience',
    label: 'Which geographic markets matter most?',
    type: 'multi-select',
    options: ['US', 'UK', 'Germany', 'France', 'Brazil', 'Japan', 'Australia', 'Global / No preference'],
    helpText: 'Can inform playlist targeting and release timing.',
  },

  // --- Content Strategy (4 questions) ---
  {
    id: 'content-formats',
    category: 'content',
    label: 'What content formats does this artist prefer creating?',
    type: 'multi-select',
    options: ['Music videos', 'Short-form reels/TikToks', 'Behind-the-scenes', 'Live performance clips', 'Studio sessions', 'Vlogs', 'Photography/visuals'],
    helpText: 'Helps match content recommendations to what the artist will actually do.',
  },
  {
    id: 'content-camera-comfort',
    category: 'content',
    label: 'How comfortable is this artist on camera?',
    type: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Camera shy', 'Natural on camera'],
    helpText: 'Affects whether video-heavy content strategies are realistic.',
  },
  {
    id: 'content-frequency',
    category: 'content',
    label: 'What is the ideal posting frequency for social media?',
    type: 'single-select',
    options: ['Daily', '3–5x/week', '1–2x/week', 'A few times/month', 'Only around releases'],
    helpText: 'Sets expectations for social engagement and content volume.',
  },
  {
    id: 'content-primary-platform',
    category: 'content',
    label: 'Which social platform should be the primary focus?',
    type: 'single-select',
    options: ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'No single focus'],
    helpText: 'Determines which platform metrics are prioritized in scoring.',
  },

  // --- Collaboration Preferences (3 questions) ---
  {
    id: 'collab-openness',
    category: 'collaborations',
    label: 'How open is this artist to collaborations?',
    type: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Prefers solo', 'Loves collaborating'],
    helpText: 'Adjusts the weight of the collaboration dimension in scoring.',
  },
  {
    id: 'collab-types',
    category: 'collaborations',
    label: 'What types of collaborations are most valuable?',
    type: 'multi-select',
    options: ['Featured artists on tracks', 'Production collaborations', 'Songwriting sessions', 'Content collaborations', 'Live show features', 'Cross-promotion'],
    helpText: 'Helps surface the right collaboration opportunities.',
  },
  {
    id: 'collab-dream',
    category: 'collaborations',
    label: 'Any dream collaborators or target genres for collabs?',
    type: 'text',
    placeholder: 'e.g., Bon Iver, ODESZA, or any indie-folk artists...',
    helpText: 'Useful for identifying strategic partnership opportunities.',
  },

  // --- Revenue Priorities (4 questions) ---
  {
    id: 'revenue-top-priority',
    category: 'revenue',
    label: 'What is the top revenue priority for this artist?',
    type: 'single-select',
    options: ['Streaming royalties', 'Sync/licensing', 'Live performance', 'Merch/DTC', 'All equally important'],
    helpText: 'Shapes which revenue insights and opportunities get highlighted.',
  },
  {
    id: 'revenue-sync-pursuit',
    category: 'revenue',
    label: 'Is this artist actively pursuing sync placements?',
    type: 'single-select',
    options: ['Yes, actively pitching', 'Yes, but passively', 'Interested but not started', 'Not a priority'],
    helpText: 'Affects sync readiness scoring and related action items.',
  },
  {
    id: 'revenue-target',
    category: 'revenue',
    label: 'What is the target annual revenue from music?',
    type: 'single-select',
    options: ['Under $5K', '$5K–$25K', '$25K–$100K', '$100K+', 'Not focused on revenue yet'],
    helpText: 'Helps calibrate revenue-related benchmarks.',
  },
  {
    id: 'revenue-attention',
    category: 'revenue',
    label: 'Which revenue stream needs the most attention right now?',
    type: 'single-select',
    options: ['Streaming', 'Sync licensing', 'Live shows', 'Merch', 'Publishing'],
    helpText: 'Surfaces relevant action items and opportunities.',
  },

  // --- Brand Identity (3 questions) ---
  {
    id: 'brand-sound',
    category: 'brand',
    label: 'Describe this artist\'s sound in 3 words.',
    type: 'text',
    placeholder: 'e.g., dreamy, electronic, cinematic',
    helpText: 'Used to cross-reference with catalog genre/mood data.',
  },
  {
    id: 'brand-aesthetic',
    category: 'brand',
    label: 'What visual aesthetic defines this artist?',
    type: 'text',
    placeholder: 'e.g., minimalist, dark, colorful, retro, organic...',
    helpText: 'Useful context for content strategy recommendations.',
  },
  {
    id: 'brand-comparables',
    category: 'brand',
    label: 'What artists should this artist be compared to?',
    type: 'text',
    placeholder: 'e.g., Bon Iver, James Blake, Bonobo',
    helpText: 'Helps position the artist in the market and identify opportunities.',
  },

  // --- Competitive Landscape (3 questions) ---
  {
    id: 'competitive-rivals',
    category: 'competitive',
    label: 'Who are the top 3 competing artists in this space?',
    type: 'text',
    placeholder: 'Artists at a similar career stage or competing for the same audience',
    helpText: 'Defines the competitive context for benchmarking.',
  },
  {
    id: 'competitive-strengths',
    category: 'competitive',
    label: 'What do those competing artists do better?',
    type: 'text',
    placeholder: 'e.g., more consistent releases, stronger social presence, better visuals...',
    helpText: 'Identifies gaps to address in the strategy.',
  },
  {
    id: 'competitive-differentiator',
    category: 'competitive',
    label: 'What makes this artist different from competitors?',
    type: 'text',
    placeholder: 'e.g., unique production style, authentic storytelling, sync-ready catalog...',
    helpText: 'Highlights strengths to lean into.',
  },
];

export function getQuestionsByCategory(category: IntakeCategory): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter(q => q.category === category);
}

export function getCategoryQuestionCount(category: IntakeCategory): number {
  return INTAKE_QUESTIONS.filter(q => q.category === category).length;
}
