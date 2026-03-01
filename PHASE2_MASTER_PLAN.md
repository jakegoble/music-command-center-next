# Music Command Center — Phase 2 Master Plan (CORRECTED)

> **Created**: 2026-02-28
> **Corrected**: 2026-02-28 (verified line-by-line against commit e8c3b21)
> **Author**: Jake Goble + Claude (full audit synthesis)
> **Goal**: Take the app from a B to an A+++ app
> **Repo**: github.com/jakegoble/music-command-center-next
> **Live**: music-command-center-next.vercel.app

---

## TECH STACK — READ THIS FIRST

Every agent must know these versions. Using outdated syntax will break the build.

| Dependency | Version | Notes |
|---|---|---|
| **Next.js** | 16.1.6 | App Router, React Server Components |
| **React** | 19.2.3 | RSC-first, no `use client` unless needed for interactivity |
| **Tailwind CSS** | v4 | CSS-first config via `@theme inline` in `globals.css`. NO `tailwind.config.js`. Use `@import "tailwindcss"` not `@tailwind base/components/utilities`. |
| **Notion SDK** | v5.11 (`@notionhq/client`) | Uses `dataSources.query()` pattern, NOT `databases.query()` |
| **TypeScript** | 5.x | Strict mode, `@/*` path alias |
| **Package manager** | npm | `package-lock.json` present |

**No charting library is currently installed.** Any chart work requires adding `recharts` first:
```bash
npm install recharts
```

**No testing framework is installed.** QA is manual visual audit unless someone adds Vitest/Playwright.

---

## GIT SAFETY RULES — NON-NEGOTIABLE

These rules exist because **4 agents worth of work was permanently lost on 2026-02-28** when none of them committed. Every agent MUST follow these without exception.

### Before You Start
```bash
git log --oneline -10    # Verify previous commits exist
git status               # Verify clean working tree
```
If the repo has only 1 commit or is missing expected work, **STOP and alert Jake**.

### While You Work
- **Commit every 30 minutes of coding** — max. No exceptions.
- **Commit after every logical unit of work** (component built, page finished, bug fixed).
- Use descriptive commit messages: `"feat: catalog filter redesign with collapsible panels"`
- **Push after every commit**: `git push origin main`
- **Tag after major milestones**: `git tag phase-2.X && git push origin --tags`

### Before You Deploy
```bash
git status     # Must show "nothing to commit, working tree clean"
git log --oneline -5  # Verify all work is committed
npx vercel --prod     # ONLY from clean state
```

### If Something Breaks
```bash
git stash              # Save uncommitted work
git log --oneline -10  # Find last good commit
git revert HEAD        # Revert the bad commit (creates new commit)
git stash pop          # Restore your work
```
**NEVER use `git reset --hard` without Jake's approval.**

### Verification After Every Commit
```bash
npx tsc --noEmit       # TypeScript must pass
npm run build          # Build must succeed
```
If either fails, fix it BEFORE moving on. Never leave a broken build in git.

---

## CURRENT STATE (verified against commit e8c3b21)

### Architecture
- **Data layer**: All primary data from Notion API via `@notionhq/client` v5
- **Caching**: In-memory Map with TTLs (Songs: 5min, Royalties: 10min, Collaborators/Contracts: 15min)
- **Client-side state**: localStorage for Approvals (`mcc_pending_changes`, `mcc_audit_log`) and Content Pipeline (`mcc_content_projects`)
- **Styling**: Tailwind v4, dark theme (`--background: #030712`), no component library
- **Auth**: None (public app)
- **Env vars**: Only `NOTION_TOKEN` required

### Notion Database IDs (in `src/config/notion.ts`)
| Database | ID |
|---|---|
| Song Catalog | `a1054739-9345-4580-bacf-8cda93f7211d` |
| Sync Licensing | `2200e857-1373-4a3c-adf6-b6d522c1eb3a` |
| Collaborators | `0b5811a0-9afc-4618-b97e-ea5c7bb52e5e` |
| Licensing Contacts | `5f4f4404-502d-4e8d-bd50-6a584255a2db` |
| Contracts | `1e0a4aaa-04a8-4726-abdd-da08e65d5514` |
| Royalty Tracking | `3e233507-12c8-4038-aaef-d29b6792abfa` |

### What Works
- **16 page routes** all render (no 404s):
  - `/` (Dashboard), `/catalog`, `/catalog/[slug]`, `/catalog/albums`, `/catalog/albums/[slug]`
  - `/streaming`, `/royalties`, `/collaborators`, `/collaborators/[name]`
  - `/licensing`, `/contracts`, `/sync-pipeline`, `/content`
  - `/data-audit`, `/approvals`, `/ai-insights`
- **Sidebar** with 4 nav groups (MUSIC, PEOPLE, BUSINESS, TOOLS), 14 links, artist switcher (Jakke/Enjune/iLÜ), mobile hamburger drawer
- **Catalog page** with search, 11 filters (collapsible panel), table/card/compact views, 3 tabs (Explorer/Health/Timeline)
- **Song detail page** with **8 tabs**: Overview, Rights, Collaborators, Revenue, Sync, Contracts, Press, Video
- **About section** in Overview tab uses `generated_description` (auto-built from song metadata via `generateDescription.ts`) with fallback to `parsed_notes.description` (extracted from Notes field via `parseNotes.ts`)
- **Press tab** displays press coverage with outlet name, title, type badge, and external link — but data comes from **hardcoded `src/lib/data/press-coverage.ts`** (38 entries), not Notion
- **Video tab** embeds YouTube via iframe from `youtube_link` field, with empty state for songs without a link
- **11 API routes** (all GET, all returning real Notion data — no stubs):
  - `/api/catalog` (paginated, filterable, sortable)
  - `/api/catalog/stats` (aggregate distributions)
  - `/api/catalog/[slug]` (song detail with hydrated relations)
  - `/api/catalog/albums` + `/api/catalog/albums/[slug]`
  - `/api/collaborators` + `/api/collaborators/[name]`
  - `/api/contracts` (filterable by status/type)
  - `/api/licensing-contacts` (filterable by status/genre_focus)
  - `/api/royalties` (aggregated by source & quarter)
  - `/api/data-audit` (cross-checks, duplicate detection)
- **Collaborators** listing + detail pages (real Notion data)
- **Contracts service** fully implemented (`src/lib/services/contracts.ts`) — real Notion queries, 15min cache, filtering
- **Licensing contacts service** fully implemented (`src/lib/services/licensing-contacts.ts`) — real Notion queries, 15min cache, filtering
- **Approval system** fully functional (client-side localStorage) — queue view, batch approve, audit log, KPIs
- **Content Pipeline** fully functional (client-side localStorage) — Kanban stages, checklists per content type
- **ArtistContext** with URL query param sync across all routes
- **Song model**: 73 fields (39 in `SongSummary`, 34 additional in `SongDetail`) — most are mapped from Notion
- **Loading skeletons** on Dashboard, Catalog, and Song Detail pages (inline `animate-pulse` divs)
- **EmptyState** shared component (`src/components/EmptyState.tsx`) with message, description, optional dashed border
- Dark theme with Tailwind v4

### What's Broken or Missing
- **No Lyrics tab** on song dashboard — field `lyrics_status` exists (checkbox) but no lyrics content display
- **About section is plain text** — works but not narrative/story-driven; no highlights, no milestones, no visual structure
- **Press tab uses hardcoded data** — `src/lib/data/press-coverage.ts` has 38 entries, should migrate to Notion
- **Video tab is YouTube-only** — no Instagram Reels, TikTok, or UGC/trending section
- **Catalog filter pills** lack visual hierarchy — active vs inactive states not distinct enough
- **No charting library** — revenue breakdown is hand-rolled divs, no real charts anywhere
- **No error boundaries** — no `error.tsx` files in any route segment
- **No `loading.tsx` files** — skeletons are inline, not using Next.js loading convention
- **Approval system has no backend persistence** — localStorage only, data lost on browser clear
- **Content Pipeline has no backend** — localStorage only, no API routes, no Notion sync
- **No pagination controls in catalog UI** — API supports `page` and `limit` params, but frontend hardcodes `limit=100` with no pagination bar
- **No date range filtering** on any page
- **Some Song model fields may return null** despite having Notion data — needs field mapping audit
- **No test infrastructure** — no test files, no testing dependencies
- **Pages that don't exist** (contrary to original plan): no `/cross-platform`, no `/growth`, no `/instagram` pages
- **No YouTube API integration** — no OAuth, no analytics routes, just URL storage + embed

---

## AGENT ROLES

### Role A: Frontend Builder
**Focus**: UI/UX, components, pages, visual polish, mobile responsiveness
**Files owned**: Everything in `src/app/*/page.tsx`, `src/components/`, CSS/Tailwind
**Does NOT touch**: API routes, service layer, Notion client, data fetchers

### Role B: Backend Builder
**Focus**: API routes, data services, Notion integration, data models
**Files owned**: Everything in `src/app/api/`, `src/lib/services/`, `src/lib/data/`, `src/lib/types.ts`, `src/config/`
**Does NOT touch**: Page components, UI styling, Tailwind classes

### Role C: QA + Integration
**Focus**: Visual audit, data accuracy verification, mobile audit, deploy
**Method**: Manual visual audit (no test framework installed). If test automation is desired, install Vitest first.
**Runs AFTER** Roles A and B complete their phases

### Shared Rules for All Roles
- Read this file FIRST before starting any work
- Commit every 30 minutes (see Git Safety Rules above)
- `npx tsc --noEmit` must pass after every commit
- Never introduce `any` types — use proper TypeScript
- Never hardcode mock data — use the data service layer or show an honest empty state
- If you discover a bug, fix it AND document it in a commit message
- **Tailwind v4**: Use `@theme inline` directives, NOT `tailwind.config.js`. No `@apply` in component files.
- **Notion SDK v5**: Use `dataSources.query()`, NOT `databases.query()`
- **Next.js 16**: Use App Router conventions (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`)

---

## PHASE 2.0 — DEPENDENCY SETUP (Do First)

### 2.0.1 Install Recharts
**Role**: Any (first agent to start)
```bash
npm install recharts
```
Required before any chart work in Phases 2.1+.

---

## PHASE 2.1 — JAKE'S EXPLICIT REQUESTS (P0)

These are features Jake specifically asked for. They come first.

### 2.1.1 Song "About" Section Enhancement
**Role**: A (Frontend) + B (Backend)
**Priority**: P0 — Jake called this out: "this section sucks... needs to be a summary of the song from a story perspective"

**Current state**: The Overview tab in `src/app/catalog/[slug]/page.tsx` (lines 131-144) renders the About section as plain `text-sm` text. Data comes from:
1. `song.generated_description` — auto-built by `src/lib/utils/generateDescription.ts` (concatenates genre, BPM, key, mood, streams, collaborators, sync availability — needs minimum 3 data points or returns null)
2. Fallback: `song.parsed_notes?.description` — extracted by `src/lib/utils/parseNotes.ts` (strips emails, ISRCs, UPCs, URLs from Notes field, returns remaining text)

**What it should become**:
A narrative story section with structured layout:
```
"Your Love's Not Wasted" is Jakke's breakout single — an organic house track
that found its audience through Spotify editorial playlists and Soave Records'
Netherlands-based distribution network. With 1.89M streams and counting, it
became the foundation for the Enjune Music catalog.
```

**Backend task (Role B)**:
- Add new optional fields to `SongDetail` in `src/lib/types.ts`: `storyDescription: string | null`, `highlights: string[]`
- In `src/app/api/catalog/[slug]/route.ts`: if a "Story" or "Description" rich text field exists in Notion, map it to `storyDescription`. Otherwise null.
- Improve `generateDescription.ts` to produce more narrative, story-like output instead of a flat list of facts. Include milestones (stream count thresholds crossed, notable playlist placements, label context).
- `highlights` should be auto-derived from available data: stream milestones (e.g., "1.89M Streams"), label name, sync tier, editorial picks, etc.

**Frontend task (Role A)**:
- Replace the current plain text with a structured "About" card:
  - Story paragraph in `text-base` (not `text-sm`), generous padding, readable line height
  - Key highlights as milestone chips below the story (e.g., "1.89M Streams", "Soave Records", "Sync Ready")
  - Release context row: distributor, label, release date as metadata below
  - Subtle left border accent in artist color
- If no meaningful data exists, show EmptyState: "No story written yet. Add a description in Notion to bring this section to life."
- Keep "About" as the FIRST section in Overview (it currently is — don't bury it)

### 2.1.2 Song Dashboard — Press Tab Enhancement
**Role**: A (Frontend) + B (Backend)
**Priority**: P0

**Current state**: Press tab EXISTS (tab index 6 of 8 in `TABS` array). It displays press coverage from **hardcoded `src/lib/data/press-coverage.ts`** (38 entries). The `PressCoverage` interface has: `outlet`, `title`, `url`, `artist`, `song?`, `type` (Feature/Review/Interview/Mention). The `getPressCoverage()` helper filters by song title and/or artist.

**Backend task (Role B) — Migrate to Notion**:
- Create or identify a Press Coverage Notion database (or add a "Press Links" relation/rollup to Song Catalog)
- Add `pressLinks` to `SongDetail` type: `Array<{ title: string; url: string; publication: string; date: string | null; type: 'review' | 'interview' | 'feature' | 'mention'; excerpt: string | null }>`
- Map from Notion if the database/field exists; fall back to the hardcoded `press-coverage.ts` data during transition
- Goal: eventually delete `src/lib/data/press-coverage.ts` entirely

**Frontend task (Role A) — Enhance UI**:
- Upgrade press cards to show:
  - Publication name + placeholder icon (no logos needed yet)
  - Article title (clickable external link)
  - Date published (if available — currently not in the data)
  - Pull quote or excerpt (if available)
  - Type badge with distinct colors: Review (blue), Interview (purple), Feature (orange), Mention (gray)
- Keep the existing song-specific vs. artist-level grouping
- Improve empty state with a dashed-border placeholder showing what press coverage looks like

### 2.1.3 Song Dashboard — Lyrics Tab (NEW)
**Role**: A (Frontend) + B (Backend)
**Priority**: P0

**Current state**: NO Lyrics tab exists. The codebase has:
- `lyrics_status: string | null` field on `SongDetail` — maps from Notion "Lyrics Written" checkbox (returns "Written" or null)
- `lyricfind_submitted`, `musixmatch_submitted`, `genius_submitted` boolean fields — track where lyrics have been submitted (displayed in Rights tab)
- No lyrics text content is stored or displayed anywhere

**Backend task (Role B)**:
- Add `lyrics: string | null` and `lyricsSource: string | null` to `SongDetail` in `src/lib/types.ts`
- In `src/app/api/catalog/[slug]/route.ts`: map from Notion if a "Lyrics" rich text or long text field exists; otherwise null

**Frontend task (Role A)**:
- Add "Lyrics" as 9th tab in `TABS` array (after "Video")
- Content layout:
  - Full lyrics text display (scrollable, centered text, verse/chorus visual distinction if detectable)
  - Lyrics source attribution (e.g., "Lyrics status: Written" from existing field)
  - Songwriter credits below lyrics (from `songwriters` field)
  - External links: show Genius, Musixmatch, LyricFind links only if the corresponding `_submitted` boolean is true
- Empty state: "Lyrics not available yet. Add lyrics in Notion or connect a lyrics provider."

### 2.1.4 Song Dashboard — Video Tab Enhancement
**Role**: A (Frontend)
**Priority**: P0

**Current state**: Video tab EXISTS (tab index 7 of 8 in `TABS` array, lines 739-782). It embeds a YouTube video via iframe if `song.youtube_link` exists, with a simple empty state if not.

**Frontend task (Role A) — Enhance**:
- Keep the existing YouTube embed as "Official Video" section
- Add a "More Videos" section below (future-ready):
  - Grid layout for additional video cards (Instagram Reels, TikTok, YouTube Shorts)
  - Each card: Platform icon, title, thumbnail placeholder, view count (if available)
  - Sort toggle: Most views / Most recent
- **Data source**: For now, the only real data is `youtube_link`. Build the UI to accept a `videos` array (Role B can add the field later if a Notion "Video Links" property is created). Until then, show the YouTube embed for the official video and an empty state for the "More Videos" section: "Additional video content will appear here when linked in Notion."

**Backend task (Role B) — Optional, future-proofing**:
- Add `videos` to `SongDetail` type: `Array<{ url: string; platform: 'youtube' | 'instagram' | 'tiktok'; title: string | null; views: number | null; date: string | null; type: 'official' | 'ugc' | 'short' }>`
- Map from Notion if a "Video Links" field exists; otherwise empty array
- This field may not exist in Notion yet — that's fine

### 2.1.5 Catalog Filter Visual Polish
**Role**: A (Frontend)
**Priority**: P0 — Jake said: "update filter colors / ui/ux on catalog page to be easier to read, nicer layout"

**Current state**: The catalog page (`src/app/catalog/page.tsx`) already has:
- A collapsible filter panel (toggle button with active filter count badge)
- 11 filter types: Genre, Mood, Key, BPM range, Status, Distributor, Album/EP, Year range, Sync Available, Atmos Mix, Stems Complete
- Search bar above filters
- "Clear all filters" button when filters are active
- Filter options populated dynamically from `/api/catalog/stats`

**What needs improvement** (visual polish, not rebuild):

**Filter grouping** — Currently all 11 filters are in a flat grid. Group them with labeled section dividers:
- **Sound Profile**: Genre, Mood, Key, BPM range
- **Status & Distribution**: Status, Distributor, Album/EP, Year range
- **Sync & Deliverables**: Sync Available, Atmos Mix, Stems Complete
- Each group gets a subtle header label (`text-xs uppercase tracking-wider text-gray-500`)

**Active filter styling** — Make the difference OBVIOUS:
- Active: `bg-orange-500/20 text-orange-400 border-orange-500/40 ring-1 ring-orange-500/20`
- Inactive: `bg-gray-800/50 text-gray-400 border-gray-700/30 hover:bg-gray-700/50`

**Mobile (< 768px)**:
- Keep collapse behavior (already works)
- Ensure filter groups stack vertically
- Show active filter count chips above results when panel is collapsed

### 2.1.6 Smart Section Grouping Audit
**Role**: A (Frontend)
**Priority**: P0 — Jake said: "make sure things are grouped in smart ways, not just thrown into sections randomly"

Go through every page and verify sections are logically grouped:

**Dashboard** (`/page.tsx`):
- Group 1: "Performance" — Total Streams, Monthly Listeners, Followers, Playlist Adds
- Group 2: "Catalog" — Total Songs, Released, Unreleased, Sync Ready
- Group 3: "Revenue" — Est. Revenue, Avg per Stream, Top Earning Song
- Group 4: "Growth" — Month-over-month trends

**Song Detail** (`/catalog/[slug]/page.tsx`):
- Tab order should be: Overview → Rights → Collaborators → Revenue → Sync → Contracts → Press → Lyrics → Video
- "About" (story) stays first in Overview (it already is)
- Production details (BPM, Key, Duration) belong in Overview only, not repeated

**Collaborators page**:
- Group by role: Writer/Producer first, then Featured, then Remix, then Other
- Not a flat alphabetical list

**Revenue page**:
- Lead with total revenue number (big hero stat)
- Then breakdown by source, then by time period

---

## PHASE 2.2 — DATA ACCURACY & INTEGRITY (P0)

### 2.2.1 Add Real Charts with Recharts
**Role**: A (Frontend)
**Depends on**: Phase 2.0.1 (Recharts installed)

**Current state**: No charting library exists. The revenue breakdown in the song detail Revenue tab is hand-rolled with `div` bars. No real charts on any page.

**Build**:
- Revenue tab: Replace div bars with a Recharts horizontal `BarChart` for revenue by source
- Dashboard: Add a Recharts `LineChart` or `AreaChart` for streaming trends (if data exists) or a `PieChart` for genre distribution from catalog stats
- Streaming page: Add appropriate chart visualizations
- Use consistent chart theming: dark background, vibrant data colors from existing `GENRE_COLORS`/artist colors in `src/config/notion.ts`

### 2.2.2 Audit Hardcoded Data Sources
**Role**: A + B

**Verified hardcoded data** (there is NO `/public/data/` directory — that was a false claim in the original plan):

| File | Contents | Action |
|---|---|---|
| `src/lib/data/press-coverage.ts` | 38 press entries baked into source | Migrate to Notion (see 2.1.2) |
| `src/app/approvals/page.tsx` | Approval queue in localStorage | Decide: keep client-side or add API (see 2.4.1) |
| `src/app/content/page.tsx` | Content pipeline in localStorage | Decide: keep client-side or add API (see 2.4.2) |

**Pages using real Notion data** (NO action needed — these are NOT hardcoded):
- Catalog, Song Detail, Collaborators, Contracts, Licensing, Royalties, Data Audit — all hit Notion API

**Pages that may show limited data**:
- Streaming (`/streaming/page.tsx`) — verify what data source it uses
- Dashboard (`/page.tsx`) — verify KPI data sources
- AI Insights (`/ai-insights/page.tsx`) — verify data source

For any page showing made-up numbers: replace with honest empty state. **A blank dashboard is better than a lying one.**

### 2.2.3 Add Pagination Controls to Catalog UI
**Role**: A (Frontend)

**Current state**: The catalog API (`/api/catalog`) already supports `?page=1&limit=25` params and returns `{ songs, total, page, totalPages }`. But the frontend in `src/app/catalog/page.tsx` hardcodes `limit=100` with no pagination UI.

**Fix**:
- Add pagination bar at bottom of catalog: Previous / Page numbers / Next
- Default: 25 songs per page
- Preserve all active filters + sort + search when paginating
- Show "Showing X-Y of Z songs" text
- Update URL params to include `page` for shareable links

### 2.2.4 Song Model Field Mapping Audit
**Role**: B (Backend)

**Current state**: `SongSummary` has 39 fields and `SongDetail` extends with 34 more (73 total). The Notion mapping in `src/lib/services/songs.ts` (lines 26-66) maps ~30 fields for SongSummary. The song detail route in `src/app/api/catalog/[slug]/route.ts` maps additional detail fields.

**Task**: Audit the Notion Song Catalog database schema (DB ID: `a1054739-9345-4580-bacf-8cda93f7211d`) and verify:
1. Which `SongDetail` fields are returning null despite having data in Notion?
2. Are there Notion properties that aren't mapped to any TypeScript field?
3. Specifically check: `popularity_score`, `estimated_revenue` — are these computed or stored?

This is an audit-and-fix task, not a "map 74 missing fields" task.

---

## PHASE 2.3 — NAVIGATION & STRUCTURE (P1)

### 2.3.1 Sidebar Artist Section Upgrade
**Role**: A (Frontend)
**Priority**: P0 — Jake's explicit request (2026-03-01)

**Current state**: Sidebar is in `src/components/Sidebar.tsx`. The `ArtistToggle` component (`src/components/ArtistToggle.tsx`) is a basic 2x2 radio button grid. No artist profile card, no DSP icons, no stats. The prior build had a profile section but it was lost in the 4-agent wipeout.

**Changes required**:

1. **Artist Profile Card** — When a specific artist is selected (not "All"), render a profile section below the toggle:
   - Artist profile photo (circular, ~48px)
   - Artist name + subtitle (e.g., "Producer / Artist")
   - Key stats: total songs (from catalog count), genre tags
   - Store artist metadata in `src/config/notion.ts` under a new `ARTIST_PROFILES` constant

2. **DSP Link Icons** — Horizontal row of SVG icons linking to each artist's platform profiles:
   - Required DSPs: Spotify, Apple Music, YouTube Music, Amazon Music, Tidal, SoundCloud
   - SVG icons should be inline (not emoji, not external images)
   - Each icon links to the artist's profile URL on that platform
   - Store URLs in `ARTIST_PROFILES` config
   - Icons should be ~20px, monochrome gray, with hover color matching the DSP brand

3. **Toggle Redesign** — Replace the 2x2 grid with a cleaner segmented control or styled dropdown:
   - Options: All Artists, Jakke, Enjune, iLÜ
   - Active state uses artist color (existing `ARTIST_COLORS`)
   - Should feel modern and polished, not like radio buttons

4. **Config Structure** — Add to `src/config/notion.ts`:
   ```typescript
   export const ARTIST_PROFILES: Record<Artist, {
     photo: string;           // URL to profile image
     subtitle: string;        // "Producer / Artist" etc.
     dspLinks: {
       spotify?: string;
       appleMusic?: string;
       youtubeMusic?: string;
       amazonMusic?: string;
       tidal?: string;
       soundcloud?: string;
     };
   }> = { ... };
   ```
   Jake will fill in the actual URLs after the component is built. Use placeholder URLs for now.

5. **Content filtering** — Already works via `ArtistContext` + `useArtistFilter` hook. No changes needed for filtering logic.

**Nav grouping**: The 14-link / 4-section structure is confirmed correct. No changes needed to nav items or ordering.

### 2.3.2 Add `loading.tsx` Files to All Route Segments
**Role**: A (Frontend)

**Current state**: No `loading.tsx` files exist anywhere. Loading skeletons are inline in page components (Dashboard, Catalog, Song Detail have `animate-pulse` divs). Other pages show nothing while loading.

**Fix**: Add `loading.tsx` to every route segment that fetches data:
- `src/app/loading.tsx` (Dashboard)
- `src/app/catalog/loading.tsx`
- `src/app/catalog/[slug]/loading.tsx`
- `src/app/collaborators/loading.tsx`
- `src/app/collaborators/[name]/loading.tsx`
- `src/app/royalties/loading.tsx`
- `src/app/streaming/loading.tsx`
- `src/app/contracts/loading.tsx`
- `src/app/licensing/loading.tsx`

Use a consistent skeleton pattern: gray pulsing rectangles matching page layout (KPI cards, tables, content areas). Tailwind: `animate-pulse bg-gray-800/50 rounded-xl`.

### 2.3.3 Add `error.tsx` Files to All Route Segments
**Role**: A (Frontend)

**Current state**: No `error.tsx` files exist. Errors are caught inline with try/catch and displayed as red alert divs.

**Fix**: Add `error.tsx` to every route segment, using Next.js convention:
```typescript
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) { ... }
```
Each error boundary shows:
- "Something went wrong loading [Page Name]"
- The error message (in a collapsible "Details" section)
- A "Retry" button that calls `reset()`
- A "Go Home" link

---

## PHASE 2.4 — BACKEND COMPLETIONS (P1)

### 2.4.1 Approval System — Migrate to Notion Backend
**Role**: B (Backend)
**Decision**: ✅ RESOLVED — Notion-backed (Jake chose Option B)

**Current state**: The approval system in `src/app/approvals/page.tsx` is **100% client-side localStorage**. It stores pending changes (`mcc_pending_changes`) and an audit log (`mcc_audit_log`). It works, but data doesn't survive browser clears or device switches.

**Build**:
- Create an "Approval Queue" Notion database (or repurpose an existing one)
- Build API routes:
```
GET    /api/approvals              — List pending changes
PATCH  /api/approvals/[id]/approve — Approve a change
PATCH  /api/approvals/[id]/reject  — Reject a change
POST   /api/approvals/batch        — Batch approve/reject
GET    /api/approvals/audit-log    — Audit history
```
- Migrate frontend from localStorage reads/writes to API calls
- Remove `mcc_pending_changes` and `mcc_audit_log` localStorage usage
- Add in-memory cache with 5min TTL (same pattern as other services)

### 2.4.2 Content Pipeline — Migrate to Notion Backend
**Role**: B (Backend)
**Decision**: ✅ RESOLVED — Notion-backed (Jake chose Notion)

**Current state**: Content Pipeline in `src/app/content/page.tsx` is **100% client-side localStorage** (`mcc_content_projects`). It has a full Kanban UI (Idea → Production → Mastering → Scheduled → Published → Promoted) with checklists per content type.

**Build**:
- Create a "Content Pipeline" Notion database with properties matching the current schema: title, platform, type, stage (select), due date, assigned to, checklist items (sub-pages or rich text), analytics fields
- Build API routes:
```
GET    /api/content                  — List all content projects
GET    /api/content/[id]             — Single project detail
POST   /api/content                  — Create new project
PATCH  /api/content/[id]             — Update project
PATCH  /api/content/[id]/stage       — Advance stage
PATCH  /api/content/[id]/checklist   — Update checklist item
GET    /api/content/stats            — Aggregated stats
```
- Migrate frontend from localStorage reads/writes to API calls
- Remove `mcc_content_projects` localStorage usage
- Add in-memory cache with 5min TTL

### 2.4.3 Notion Sync Clarification
**Role**: B (Backend)

**Current state (corrected)**: The app does NOT have a dual `store.json` data store. The architecture is already Notion-first:
- All primary data (songs, collaborators, contracts, licensing contacts, royalties) is fetched from Notion API with in-memory cache (TTL 5-15 min)
- Two features use localStorage for client-side-only state: Approvals and Content Pipeline

**No "sync strategy" decision is needed** for the main data layer — it's already Notion-first with caching. The only decision is whether Approvals and Content Pipeline should also be Notion-backed (see 2.4.1 and 2.4.2).

---

## PHASE 2.5 — VISUAL POLISH (P1)

### 2.5.1 Color System Improvements
**Role**: A (Frontend)

**Current color definitions** (in `src/config/notion.ts`):
- `ARTIST_COLORS`: Jakke (#3B82F6), Enjune (#8B5CF6), iLÜ (#22C55E)
- Genre colors: 10-color palette
- Mood colors: 10-color palette
- Key colors: 12-color palette

**Improvements needed**:
- **Active/inactive states**: Ensure all interactive elements (filter pills, toggle buttons, tab selectors) have an OBVIOUS visual difference between active and inactive
- **Status badges**: Use consistent colors app-wide: Released = green-500, Unreleased = amber-500, In Progress = blue-500 — with `bg-{color}-500/10` backgrounds and full-color text
- **KPI cards**: Add subtle left border in thematic color (streams = green, revenue = orange, songs = blue, sync = purple)
- **Charts** (after Recharts is installed): Use vibrant, distinct colors per data series. Reference existing palettes in `notion.ts`.

### 2.5.2 Mobile Responsiveness Audit
**Role**: A (Frontend) → C (QA verifies)

Test every page at 390x844 viewport (iPhone 14):

**Checklist**:
- [ ] Page titles don't overlap with hamburger icon
- [ ] All data tables have `overflow-x-auto` wrapper
- [ ] Filter panel collapses properly on mobile (already does — verify)
- [ ] Song detail: artwork stacks above title/metadata on small screens
- [ ] Tabs: horizontal scroll when they overflow (9 tabs won't fit)
- [ ] Charts: readable at mobile width
- [ ] KPI cards: 2-column grid on mobile (not 4)
- [ ] No text truncation that hides meaningful content
- [ ] Sidebar drawer opens/closes cleanly
- [ ] Artist toggle is accessible on mobile

### 2.5.3 Consistent Empty States
**Role**: A (Frontend)

**Current state**: `EmptyState` component exists at `src/components/EmptyState.tsx` with `message`, `description`, and `dashed` props. It's used in several places but not everywhere.

**Task**: Audit every page/tab and ensure sections that can be empty use the shared `EmptyState` component with:
- A contextual message explaining what will appear (not generic)
- An action hint where appropriate ("Add [thing] in Notion to see it here")
- `dashed={true}` for placeholder areas

**No mock data. No placeholder numbers. No fake charts.**

---

## PHASE 2.6 — CLEANUP (P2)

### 2.6.1 Component Audit
**Role**: A (Frontend)

**Note**: The original plan claimed "StatusPill exists in both `/components/ui/` and `/components/shared/`". This is false — neither directory exists, and there is no StatusPill component. Status badges are rendered inline with Tailwind classes.

**Actual cleanup needed**:
- Audit `src/components/` for any unused component files
- Check if `src/components/song-detail/` (exists but is empty) should be populated or removed
- Look for repeated inline patterns that should be extracted into shared components (e.g., status badge rendering, KPI card layout)

### 2.6.2 Design Token Consolidation
**Role**: A (Frontend)

Several color values are hardcoded inline in page components instead of referencing the palettes in `src/config/notion.ts`:
- Status badge colors (repeated across catalog, song detail, contracts pages)
- Chart/bar colors
- Severity colors (data audit page)

Consolidate by importing from `notion.ts` or creating a `src/lib/design-tokens.ts` if the config file gets too large.

### 2.6.3 Remove Dead Code
**Role**: A + B

- Remove unused imports across all files
- Remove the empty `src/components/song-detail/` directory
- Run `npx tsc --noEmit` to catch type errors
- Run the build to verify: `npm run build`

---

## PHASE 2.7 — FUTURE-READY FEATURES (P2)

### 2.7.1 YouTube Integration
**Role**: B (Backend)
**Decision**: ✅ RESOLVED — **Deferred to Phase 3**

**Current state**: No YouTube API routes exist. The only YouTube integration is storing a `youtube_link` URL and embedding the video via iframe.

**No work needed in Phase 2.** Keep the iframe embed as-is. Full YouTube Data API v3 OAuth integration deferred to Phase 3.

### 2.7.2 Date Range Filtering
**Role**: B (Backend) + A (Frontend)

No page currently supports filtering by date range.

**Add to**:
- Catalog: Filter by release date range (API already accepts year range — extend to full date)
- Revenue: Filter by reporting period
- Streaming: Filter by date range

**Frontend**: Simple preset toggle ("Last 30 days / 90 days / Year / All Time") or date picker component.

### 2.7.3 Analytics Pages (Cross-Platform, Growth, Instagram)
**Role**: A (Frontend) + B (Backend)
**Decision**: ✅ RESOLVED — **Do what we can now** (no new OAuth, use existing Notion data)

**Current state**: These pages do NOT exist in the codebase.

**Phase 2 scope** (build with existing data sources only):
- **Streaming Analytics** (`/streaming` already exists — enhance with Recharts)
  - Use existing Notion song data: streams, monthly listeners, playlist adds
  - Show aggregated trends, top performers, artist comparisons
  - Real charts (Recharts), not hand-rolled divs
- **Growth Overview** (new page or section on Dashboard)
  - Derived from existing data: catalog growth over time (release dates), revenue trends (royalty data by quarter)
  - No new API integrations needed — just smarter presentation of existing Notion data
- **Platform-specific pages** (Instagram, Cross-Platform)
  - Defer to Phase 3 — these require platform OAuth (Instagram Graph API, Spotify API, etc.)
  - Show empty states with "Connect [Platform] to see analytics here" messaging

---

## EXECUTION ORDER

### Sprint 0: Setup (5 minutes)
| Order | Task | Role |
|---|---|---|
| 0 | `npm install recharts` | Any |

### Sprint 1: Jake's Requests (Phases 2.1 + 2.2) — P0
**Estimated time**: 4-6 hours total

| Order | Task | Role | Depends On | Commit After |
|---|---|---|---|---|
| 1 | About section — improve generateDescription.ts + add fields | B | — | Yes |
| 2 | About section — redesign UI with story layout + highlights | A | #1 | Yes |
| 3 | Press tab — plan Notion migration + enhance card UI | A+B | — | Yes |
| 4 | Lyrics tab — add fields + build new tab (genuinely new) | A+B | — | Yes |
| 5 | Video tab — enhance with UGC section layout | A | — | Yes |
| 6 | Catalog filter visual polish (grouping + active styling) | A | — | Yes |
| 7 | Smart section grouping audit (all pages) | A | — | Yes |
| 8 | Install Recharts + build real charts (revenue, dashboard) | A | Sprint 0 | Yes |
| 9 | Pagination controls on catalog | A | — | Yes |
| 10 | Audit hardcoded data sources | A + B | — | Yes |
| 11 | Song model field mapping audit | B | — | Yes |

**Tag**: `git tag phase-2.1-complete && git push origin --tags`

### Sprint 2: Structure & Backend (Phases 2.3 + 2.4) — P1
**Estimated time**: 3-4 hours total

| Order | Task | Role | Depends On |
|---|---|---|---|
| 12 | Sidebar navigation review | A | — |
| 13 | Add loading.tsx files | A | — |
| 14 | Add error.tsx files | A | — |
| 15 | Approval system — migrate localStorage to Notion API | B | — |
| 16 | Content Pipeline — migrate localStorage to Notion API | B | — |

**Tag**: `git tag phase-2.2-complete && git push origin --tags`

### Sprint 3: Polish & Extras (Phases 2.5 + 2.6 + 2.7) — P1/P2
**Estimated time**: 3-4 hours total

| Order | Task | Role | Depends On |
|---|---|---|---|
| 17 | Color system improvements | A | — |
| 18 | Mobile responsiveness audit | A → C | — |
| 19 | Consistent empty states audit | A | — |
| 20 | Component audit + cleanup | A | — |
| 21 | Design token consolidation | A | — |
| 22 | Remove dead code | A + B | — |
| 23 | Date range filtering | A + B | — |

**Tag**: `git tag phase-2.3-complete && git push origin --tags`

### Sprint 4: QA + Deploy
**Estimated time**: 1-2 hours

| Order | Task | Role | Method |
|---|---|---|---|
| 24 | Full desktop visual audit (all 16 pages) | C | Manual |
| 25 | Full mobile visual audit (390x844, all pages) | C | Manual |
| 26 | Data accuracy spot-check (5 songs vs Notion) | C | Manual |
| 27 | TypeScript + build verification | C | `npx tsc --noEmit && npm run build` |
| 28 | Deploy to Vercel | C | `npx vercel --prod` |

**Tag**: `git tag phase-2-deployed && git push origin --tags`

---

## DECISIONS — RESOLVED BY JAKE (2026-02-28)

1. **Approval system persistence**: ✅ **Notion-backed** — Build full API routes with Notion as the persistence layer. Easy to access, durable, multi-device.
2. **Content Pipeline persistence**: ✅ **Notion-backed** — Same as approvals. Build API routes backed by Notion.
3. **YouTube integration**: ✅ **Defer to Phase 3** — Keep the iframe embed, don't build OAuth.
4. **Analytics pages** (Cross-Platform, Growth, Instagram): ✅ **Do what we can now** — Build the pages with data available from existing Notion sources. Don't require new OAuth integrations. Show real data where it exists, honest empty states where it doesn't. Full platform OAuth (Spotify API, Instagram Graph API, etc.) deferred to Phase 3.
5. **Albums**: ✅ **Defer** — Lowest priority. Pages work, leave them for Phase 3.

---

## SUCCESS CRITERIA

Phase 2 is DONE when:
- [ ] Song dashboard has 9 tabs: Overview, Rights, Collaborators, Revenue, Sync, Contracts, Press, Lyrics, Video
- [ ] "About" section tells a narrative story, not a metadata list
- [ ] Press tab pulls from Notion (or has a migration path), not hardcoded source file
- [ ] Catalog filters have clear active/inactive visual distinction and grouped layout
- [ ] Catalog has working pagination controls (25 per page)
- [ ] Real charts exist (Recharts) on at least Revenue and Dashboard
- [ ] No page shows fabricated data — empty states for missing data
- [ ] Every route has `error.tsx` and `loading.tsx`
- [ ] Mobile (390x844) passes visual audit — no overflow, no cut-off text
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] All work is committed and pushed
- [ ] Vercel deploy is live and matches local build

---

## WHAT WAS REMOVED FROM THE ORIGINAL PLAN (AND WHY)

| Original Task | Why Removed |
|---|---|
| Fix radar chart normalization bug (2.2.1) | No radar chart exists in the codebase. No charting library is installed. |
| Remove hardcoded mock data from /public/data/ (2.2.2) | `/public/data/` directory does not exist. All primary data is from Notion API. |
| StatusPill deduplication (2.6.1) | No StatusPill component exists. No `/components/ui/` or `/components/shared/` directories. |
| YouTube stub removal (2.7.1) | No YouTube API routes exist — nothing to remove. |
| Content Pipeline API routes "build" (2.4.1 original) | Reframed as a decision — the feature works via localStorage already. |
| Licensing Contacts "implement stubs" (2.4.2 original) | Service is already fully implemented (`src/lib/services/licensing-contacts.ts`) with real Notion queries. |
| Contracts "implement stubs" (2.4.3 original) | Service is already fully implemented (`src/lib/services/contracts.ts`) with real Notion queries. |
| Notion sync strategy dual-store (2.4.4 original) | No dual store exists. App is already Notion-first with in-memory cache. |
| Approval system "6 API routes" reference | No API routes exist — it's localStorage-based. Reframed as a persistence decision. |
| "Populate 89 fields" (2.2.4 original) | Model has 73 fields, not 89. Most are mapped. Reframed as an audit task. |
| Cross-platform / Growth / Instagram page fixes | These pages don't exist. Deferred as net-new feature decisions. |
| Sidebar update to add missing nav entries | All features already have nav entries (14 links in 4 groups). Reframed as review. |
