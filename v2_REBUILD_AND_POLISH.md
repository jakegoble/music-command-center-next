# Music Command Center — Full Rebuild + Polish

> **CRITICAL: READ THIS FIRST**
> On 2026-02-28, four Claude Code agents built the entire Music Command Center v2 but NONE of them committed to git. All work was lost. This brief rebuilds everything in a single agent with **mandatory commit checkpoints**. If you skip a commit checkpoint, you are destroying work.

---

## ⛔ GIT RULES — NON-NEGOTIABLE

1. **First action**: Run `git log --oneline -10` and `git status`. Report what you see.
2. **Commit after every phase** (there are 6 phases below). Use the exact commit messages provided.
3. **Tag after every commit** — create a git tag so any phase can be reverted to instantly:
```bash
   git tag v2-phase-1  # after Phase 1 commit
   git tag v2-phase-2  # after Phase 2 commit
   # etc.
   git push origin --tags
```
4. **Never deploy from uncommitted state**. Run `git status` before any deploy — must show clean working tree.
5. **Push after every commit**: `git push origin main`
6. If the build breaks at any phase, fix it and commit the fix BEFORE moving to the next phase.
7. **How to revert if something breaks**: `git revert` back to the last good tag:
```bash
   git checkout v2-phase-3 -- .
   git commit -m "Revert to Phase 3 baseline"
   git push origin main
```

---

## APP IDENTITY

- **Name**: Music Command Center (NOT "Enjune Music" — that's the parent company, not the app name)
- **Tagline**: "CATALOG & SYNC" (subtitle under the name)
- **URL**: music-command-center-next.vercel.app
- **Repo**: github.com/jakegoble/music-command-center-next

---

## NOTION DATABASE REFERENCES

| Database | Data Source ID |
|---|---|
| Song Catalog | `a1054739-9345-4580-bacf-8cda93f7211d` |
| Sync Licensing | `2200e857-1373-4a3c-adf6-b6d522c1eb3a` |
| Collaborators | `0b5811a0-9afc-4618-b97e-ea5c7bb52e5e` |
| Licensing Contacts | `5f4f4404-502d-4e8d-bd50-6a584255a2db` |
| Contracts & Agreements | `1e0a4aaa-04a8-4726-abdd-da08e65d5514` |
| Royalty Tracking | `3e233507-12c8-4038-aaef-d29b6792abfa` |

Song Catalog `Artist` field: single-select with options `Jakke`, `Enjune`, `iLÜ`.
Jakke and Enjune are both under the Enjune Music umbrella. iLÜ is a separate project.

---

## PHASE 1: Data Layer + API Routes
**Commit message**: `"Phase 1: Data layer — Notion client, ArtistContext, 9 API routes, dedup logic"`

Build the entire backend data infrastructure:

### Notion Client (`/lib/services/notion-client.ts`)
- Notion SDK client using `NOTION_TOKEN` env var
- In-memory cache with TTLs (songs 5min, collaborators/contracts 15min, royalties 10min)
- Paginated `queryAll` helper
- Property extraction helpers: `getText`, `getNumber`, `getSelect`, `getMultiSelect`, `getCheckbox`, `getUrl`, `getDate`, `getRelation`

### Config (`/lib/config/notion.ts`)
- All 6 database IDs
- `ArtistFilter` type: `"all" | "Jakke" | "Enjune" | "iLÜ"`
- `parseArtistParam(str)` — maps lowercase URL param to proper case (including `"ilu"` → `"iLÜ"`)
- `artistToParam(artist)` — reverse mapping for URLs

### Shared Types (`/lib/types.ts`)
- `SongSummary`, `SongDetail`, `CollaboratorDetail`, `ContractSummary`, `RoyaltyEntry`, `DataAuditResponse`

### Data Fetchers (`/lib/data/`)
- `songs.ts` — `fetchAllSongs(artist?)`, `deduplicateSongs()` (by ISRC, fallback to `title::artist`), `mapPageToSong`, `toSlug`
- `royalties.ts` — `fetchRoyalties(artist?)` with all 8 revenue columns
- `collaborators.ts` — `fetchAllCollaborators()`, `fetchCollaboratorBySlug()`
- `contracts.ts` — `fetchContracts(status?, type?)`
- `licensing-contacts.ts` — `fetchLicensingContacts(status?, genreFocus?)`

### ArtistContext (`/lib/contexts/ArtistContext.tsx`)
- React context providing `{ artist, setArtist }`
- Syncs with URL query param `?artist=` bidirectionally
- Default: `"all"`
- Wrap entire app in provider (edit layout.tsx)

### useArtistFilter Hook (`/lib/hooks/useArtistFilter.ts`)
- Returns `{ artist, setArtist, songs, royalties, isLoading, error, refetch }`
- Fetches from API routes filtered by current artist context

### API Routes (9 endpoints under `/app/api/`)
All accept optional `?artist=` query param:

| Route | Purpose |
|---|---|
| `GET /api/catalog` | Full filter suite: artist, status, genre, mood, key, BPM range, distributor, sync, search. Pagination + sort. ISRC dedup. |
| `GET /api/catalog/stats` | Aggregated stats: distributions by genre/mood/key/artist/distributor/year |
| `GET /api/catalog/[slug]` | Full song detail with hydrated collaborators, contracts, licensing contacts, royalties (parallel fetch) |
| `GET /api/collaborators` | All collaborators with song counts |
| `GET /api/collaborators/[name]` | Single collaborator by slug |
| `GET /api/royalties` | All royalty entries with `total_revenue`, `by_source`, `by_quarter` aggregations |
| `GET /api/contracts` | Filterable by status and type |
| `GET /api/licensing-contacts` | Filterable by status and genre focus |
| `GET /api/data-audit` | Data integrity: song counts, stream sums, duplicate detection, null field audit. **Independent cross-check**: fetches "all" and per-artist separately to validate consistency. |

### Rules
- If a Notion field is empty, return `null`. Never substitute mock data.
- Revenue tab note: Royalty Tracking DB is per-artist, not per-song. API should return artist-level data and the frontend will label it accordingly.

### ⛔ COMMIT CHECKPOINT 1
```bash
npx tsc --noEmit  # must pass
git add -A && git commit -m "Phase 1: Data layer — Notion client, ArtistContext, 9 API routes, dedup logic"
git tag v2-phase-1
git push origin main --tags
```

---

## PHASE 2: App Shell, Sidebar, Artist Toggle
**Commit message**: `"Phase 2: App shell — sidebar, artist toggle, navigation, mobile drawer"`

### Branding
- App name: **"Music Command Center"** (not "Enjune Music")
- Subtitle: "CATALOG & SYNC"
- Use this in sidebar header, page metadata (`<title>`), and footer

### Color Palette
The app should feel **vibrant and premium** — dark theme with rich accent colors, NOT monochromatic gray.

- Background: `bg-gray-950`
- Cards: `bg-gray-800/50 border border-gray-700/50`
- Artist colors: Jakke = `#3B82F6` (blue), Enjune = `#8B5CF6` (purple), iLÜ = `#22C55E` (green)
- Primary accent: `#F97316` (orange) for CTAs, active nav states, highlights
- Secondary accents: Use genre/mood tag colors, chart colors, status badge colors to add vibrancy
- Text: `text-white` (headings), `text-gray-300` (body), `text-gray-400` (metadata), `text-gray-500` (muted)

### Sidebar (desktop: fixed 240px left, mobile: hamburger drawer)
```
┌──────────────────────┐
│  Music Command Center │
│  CATALOG & SYNC       │
│                       │
│ [All][Jakke][Enjune]  │  ← Artist Toggle
│ [iLÜ]                │
│                       │
│ MUSIC                 │
│   Dashboard           │
│   Catalog             │
│   Revenue             │
│                       │
│ PEOPLE                │
│   Collaborators       │
│   Licensing           │
│                       │
│ BUSINESS              │
│   Contracts           │
│   Sync Pipeline       │
│                       │
│ TOOLS                 │
│   Data Audit          │
│   AI Insights         │
│                       │
│ © 2026 Enjune Music   │
└──────────────────────┘
```

### Artist Toggle (`/components/ArtistToggle.tsx`)
- Segmented control, all 4 options visible (not a dropdown)
- Active state: artist color bg + white text
- Inactive: `bg-gray-800 text-gray-400` with hover brightening
- Reads/writes to ArtistContext
- `transition-all duration-200`

### Artist Badge (`/components/ArtistBadge.tsx`)
- Appears above page content when filtering: "Viewing: Jakke ✕"
- Artist color at 10% opacity bg, full color border/text
- ✕ resets to "all" AND updates URL

### Navigation Links — CRITICAL FIX
Every sidebar nav link MUST carry the artist filter:
```typescript
const { artist } = useArtistContext();
const fullHref = artist === 'all' ? href : `${href}?artist=${artistToParam(artist)}`;
```

### Page Header (`/components/PageHeader.tsx`)
- Shows artist suffix when filtered: "Dashboard — Jakke"
- Used on EVERY page

### Mobile (< 768px)
- Hamburger button in top header bar
- Slide-in drawer with backdrop overlay
- Artist toggle full-width inside drawer
- **Nothing cut off** — test at 390×844 viewport. No text overflow, no elements bleeding off screen.

### ⛔ COMMIT CHECKPOINT 2
```bash
npx tsc --noEmit
git add -A && git commit -m "Phase 2: App shell — sidebar, artist toggle, navigation, mobile drawer"
git tag v2-phase-2
git push origin main --tags
```

---

## PHASE 3: All Page Routes
**Commit message**: `"Phase 3: All page routes — dashboard, catalog, song detail, collaborators, contracts, royalties, licensing, data audit, AI insights"`

**Every page must**:
- Use `PageHeader` with dynamic artist suffix
- Use `useArtistFilter()` or `useArtistContext()` for data
- Have loading skeletons (not blank white), error states, and empty states
- Respect the artist filter
- **Return 200 (not 404)**. Every route in the sidebar must resolve.

### Dashboard (`/app/page.tsx` or `/app/dashboard/page.tsx`)
- 8 KPI cards: Total Songs, Released, Total Streams, Avg BPM, Sync Ready, Est. Revenue, plus 2 more relevant ones
- KPI values use color (green for good, orange for neutral, etc.) — NOT all the same gray
- Charts: Genre distribution (bar), Songs by Artist (pie/donut), Revenue by Quarter (line/bar), Revenue by Source (horizontal bar)
- Charts should use vibrant colors from the palette — each genre/artist gets its own color

### Catalog (`/app/catalog/page.tsx`)
- Search bar + filters
- **Filter layout fix (mobile)**: Filters must be organized cleanly. Current state is a messy wall of gray pills. Fix:
  - Group filters into collapsible sections: "Artist & Status", "Sound" (genre, mood, key, BPM), "Sync" (tier, availability, atmos, stems), "Date" (year range)
  - Use colored pills for active filters (orange bg when selected, not just slightly-less-gray)
  - Filters should be in a collapsible panel — collapsed by default on mobile, "Filters ▾" button to expand
  - When a filter is active, show count badge: "Filters (3) ▾"
- Table with columns: Title, Artist (colored badge), Genre, BPM, Key, Streams, Status
- View modes: Table / Cards / Compact
- Row checkboxes + bulk actions bar (Export CSV)
- Pagination
- Clickable rows → `/catalog/[slug]`

### Song Detail (`/app/catalog/[slug]/page.tsx`)
Full premium song dashboard. This is the crown jewel — each song page is its own universe.

**Song Hero** (top of page):
- Album artwork: Use Spotify oEmbed (`https://open.spotify.com/oembed?url={spotify_link}` → `thumbnail_url`). If no Spotify Link, gradient placeholder with song initials + artist color. 200×200 desktop, 150×150 mobile, `rounded-xl shadow-lg`.
- Song Title (`text-3xl font-bold`), Artist badge (colored), Status badge, Album/EP
- Release Date, Duration • BPM • Key as metadata chips
- Genre + Mood as colored tag pills
- **Stream counter**: Large formatted number (e.g., "2.71M streams"). If null → "—"

**DSP Links Bar**:
- Horizontal row of platform icon buttons: Spotify, Apple Music, YouTube, SoundCloud, etc.
- Only show platforms that have actual links (currently only Spotify Link exists in Notion)
- Hidden entirely if no links at all

**8 Tabs** (URL-persisted via `?tab=`):

**Overview Tab**:
- "About" card with Notes field (styled, not raw text dump). Hidden if empty.
- Similar Artists + Scene Suggestions as tag pills. Hidden if empty.
- Usage Scenarios as visual cards with icons. Hidden if empty.
- Production Details: Producers, Songwriters, Explicit flag, Instrumental flag.

**Rights Tab**:
- Registration checklist as visual grid (3 cols desktop, 2 mobile): ASCAP ✅, MLC ✅, PPL ❌, SoundExchange ✅, YouTube CID ✅, etc.
- **Lyrics submissions SEPARATE from marketplace submissions**:
  - "Lyrics Distribution" section: LyricFind, Musixmatch, Genius — separate card
  - "Marketplace Uploads" section: DISCO, Music Gateway, Songtradr — separate card
- Identifiers card: ISRC + UPC in monospace with copy buttons, Songtrust ID
- Publishing card: Publisher, Distributor badge, Writer Splits

**Collaborators Tab**:
- Collaborator cards with Name, Role, PRO, Agreement status
- Click → collaborator detail page
- Empty state if none linked

**Revenue Tab**:
- **Labeled as artist-level data**: Amber banner "Revenue for [Artist] (all songs) — Per-song tracking coming soon"
- Revenue by source as horizontal bar breakdown
- Revenue by quarter if data exists
- Empty state if no royalty data (NOT a mock chart)

**Sync Tab**:
- Sync Tier as large colored badge (Tier 1=red, Tier 2=yellow, Tier 3=green)
- Available for Sync indicator
- Edit availability grid: 15s, 30s, 60s, Instrumental, Acapella, Atmos, 360RA, Stems, Stereo Master
- Sync Edit Status as progress indicator
- Sync Restrictions in warning card if present
- Pitched To: list of licensing contacts

**Contracts Tab**:
- Expandable contract cards: Document Name, Type, Status, Parties, Key Terms (expand/collapse)
- Empty state if none linked

**Press Tab** (NEW — 7th tab):
- Section for press links, articles, reviews, interviews
- No Notion field exists yet — show empty state: "No press coverage linked. Add a 'Press Links' field in Notion to populate this section."
- Build the UI now so it auto-populates when Jake adds the field later

**Video Tab** (NEW — 8th tab):
- Section for trending/popular videos using the song across Instagram, TikTok, YouTube
- No Notion field exists yet — show empty state: "No video content linked. Add video URL fields in Notion to populate this section."
- Build the UI structure: grid of video embed cards, each with platform icon, view count placeholder, date
- This is future-ready — the layout should look great once data flows in

### Collaborators (`/app/collaborators/page.tsx`)
- Table: Name, Role, PRO Affiliation, Song Count, Agreement Status
- Clickable rows → detail page

### Collaborator Detail (`/app/collaborators/[name]/page.tsx`)
- Profile card: Name, Role, PRO, IPI Number, Email, Phone
- Agreement status badge
- Linked songs table

### Contracts (`/app/contracts/page.tsx`)
- Filterable table: Document Name, Type, Status, Parties
- Status + Type filter dropdowns

### Royalties (`/app/royalties/page.tsx`)
- Total revenue card (large number)
- Revenue by source bar chart
- Revenue by quarter bar chart
- Full entry table with all columns

### Licensing Contacts (`/app/licensing/page.tsx`)
- Table: Company, Contact Person, Type, Status, Genre Focus

### Data Audit (`/app/data-audit/page.tsx`)
- Cross-check pass/fail cards
- Per-artist breakdown
- Missing ISRC/streams lists
- Duplicates table

### AI Insights (`/app/ai-insights/page.tsx`)
- **This must NOT 404.** Even if AI features aren't built yet, this page must render.
- Show a coming soon state or basic insights derived from catalog stats (most streamed songs, genre distribution insights, sync readiness summary).

### ⛔ COMMIT CHECKPOINT 3
```bash
npx tsc --noEmit
npm run build  # all routes must compile
git add -A && git commit -m "Phase 3: All page routes — dashboard, catalog, song detail, collaborators, contracts, royalties, licensing, data audit, AI insights"
git tag v2-phase-3
git push origin main --tags
```

---

## PHASE 4: Visual Polish + Mobile Fix
**Commit message**: `"Phase 4: Visual polish — color, mobile layout, filter UX, empty states"`

This phase is about making everything look premium. Go through every page and component:

### Color Audit
- Dashboard KPIs: Each card should have a subtle colored left border or icon color — not all identical gray
- Charts: Use a vibrant multi-color palette, not monochrome
- Catalog filter pills: Active = orange bg with white text. Inactive = `bg-gray-800 text-gray-400`
- Artist badges in catalog table: Jakke=blue, Enjune=purple, iLÜ=green
- Status badges: Released=green, Unreleased=amber, In Progress=orange
- Sync tier badges: colored backgrounds (red/yellow/green at low opacity)
- Tab active state: colored underline or background, not just bold text

### Mobile Audit (390×844)
Go through EVERY page at mobile viewport:
- [ ] "Catalog Explorer" title: currently cut off by hamburger icon. Fix the layout so title doesn't overlap.
- [ ] Filter panel: collapsible on mobile, not a wall of pills
- [ ] Tables: horizontal scroll wrapper, not squeezed/cut off
- [ ] Song hero: artwork stacks above title
- [ ] Tabs: horizontal scroll
- [ ] Cards: full-width single column
- [ ] No text overflow anywhere
- [ ] Hamburger drawer works with backdrop

### Empty States
- Consistent `EmptyState` component used everywhere
- Contextual messages (not generic "No data")
- No mock data, no "Lorem ipsum", no placeholder numbers
- Dashed border cards acceptable for future features (Press, Video tabs)

### ⛔ COMMIT CHECKPOINT 4
```bash
npx tsc --noEmit
npm run build
git add -A && git commit -m "Phase 4: Visual polish — color, mobile layout, filter UX, empty states"
git tag v2-phase-4
git push origin main --tags
```

---

## PHASE 5: Data Accuracy Verification
**Commit message**: `"Phase 5: Data accuracy verified — audit endpoint passing"`

1. Start dev server with `NOTION_TOKEN` in `.env.local`
2. Hit `/api/data-audit` — verify:
   - `sumsMatch: true`
   - `countsMatch: true`
   - `duplicateSongs: []`
3. Spot-check 5 songs: open song detail, compare every field to Notion
4. Verify artist toggle filters correctly on catalog + dashboard
5. Fix any data mismatches found

### ⛔ COMMIT CHECKPOINT 5
```bash
git add -A && git commit -m "Phase 5: Data accuracy verified — audit endpoint passing"
git tag v2-phase-5
git push origin main --tags
```

---

## PHASE 6: Deploy
**Commit message**: N/A (deploy only)
```bash
git status  # must show "nothing to commit, working tree clean"
git log --oneline -6  # must show 5 phase commits
git tag  # must show v2-phase-1 through v2-phase-5

git tag v2-deployed
git push origin --tags

npx vercel --prod
```

Report the deployment URL when done.

**If the deploy breaks the app**:
```bash
git checkout v2-phase-4 -- .
git commit -m "Rollback to phase 4"
git push origin main
npx vercel --prod
```

---

## RECAP: COMMIT CHECKPOINTS

| Phase | Commit | Tag | What's In It |
|---|---|---|---|
| 1 | `Phase 1: Data layer...` | `v2-phase-1` | Notion client, contexts, hooks, 9 API routes, types, dedup |
| 2 | `Phase 2: App shell...` | `v2-phase-2` | Sidebar, artist toggle, navigation, mobile drawer, branding |
| 3 | `Phase 3: All page routes...` | `v2-phase-3` | All 10+ pages with real data, loading/error/empty states |
| 4 | `Phase 4: Visual polish...` | `v2-phase-4` | Color, mobile fixes, filter UX, consistent styling |
| 5 | `Phase 5: Data accuracy...` | `v2-phase-5` | Any fixes from audit, verified data integrity |
| Deploy | — | `v2-deployed` | `npx vercel --prod` from clean working tree |
