# Music Command Center — Phase 2 Master Plan

> **Created**: 2026-02-28
> **Author**: Jake Goble + Claude (full audit synthesis)
> **Goal**: Take the app from a B to an A+++ app
> **Repo**: github.com/jakegoble/music-command-center-next
> **Live**: music-command-center-next.vercel.app

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

## CURRENT STATE (as of commit e8c3b21)

### What Works
- 16 page routes render (no 404s)
- Sidebar with artist switcher (Jakke/Enjune/iLÜ) + mobile hamburger drawer
- Catalog page with search, filters, table/card/compact views, bulk actions
- Song detail page with 6 tabs (Overview, Rights, Collaborators, Revenue, Sync, Contracts)
- Collaborators listing + detail pages
- Streaming, Revenue, Growth, Cross-Platform, Instagram, AI Insights pages
- ArtistContext with URL query param sync
- 6 API route groups hitting Notion (catalog, collaborators, contracts, data-audit, licensing-contacts, royalties)
- Approval system backend (6 API routes, fully functional)
- CSV import backend (fully functional)
- Dark theme with Tailwind

### What's Broken or Missing
- **Song "About" section** renders raw metadata string instead of story summary
- **No Press tab** on song dashboard (Jake requested)
- **No Lyrics tab** on song dashboard (Jake requested)
- **No Video tab** on song dashboard (Jake requested)
- **Catalog filter UI** is hard to read — gray pills on gray background, no visual hierarchy
- **Radar chart bug** on cross-platform page — Jakke followers always normalizes to 100
- **No pagination** on catalog (hardcoded limit=100)
- **Content Pipeline** — service layer fully built but NO API routes or frontend page
- **Licensing/Contracts pages** — routes exist but service functions are stubs returning empty arrays
- **YouTube integration** — all 3 API routes are stubs (no OAuth)
- **No Notion ↔ local storage sync** — dual data stores never reconcile
- **80% of Song model fields unpopulated** — model has 89 fields, API returns ~15
- **Hardcoded mock data** on most pages (streaming, growth, instagram, cross-platform use JSON/CSV from /public/data/)
- **Duplicate components** — StatusPill exists in both /ui and /shared
- **No date range filtering** anywhere
- **Sidebar nav doesn't include** Content Pipeline, Approval Queue, Licensing, Contracts, Data Audit
- **No loading skeletons** on most pages
- **No error boundaries**

---

## AGENT ROLES

### Role A: Frontend Builder
**Focus**: UI/UX, components, pages, visual polish, mobile responsiveness
**Files owned**: Everything in `src/app/*/page.tsx`, `src/components/`, CSS/Tailwind
**Does NOT touch**: API routes, service layer, Notion client, data fetchers

### Role B: Backend Builder
**Focus**: API routes, data services, Notion integration, data models
**Files owned**: Everything in `src/app/api/`, `src/lib/services/`, `src/lib/data/`, `src/lib/models/`
**Does NOT touch**: Page components, UI styling, Tailwind classes

### Role C: QA + Integration
**Focus**: End-to-end testing, data accuracy verification, mobile audit, deploy
**Files owned**: Test files, audit scripts, deployment
**Runs AFTER** Roles A and B complete their phases

### Shared Rules for All Roles
- Read this file FIRST before starting any work
- Commit every 30 minutes (see Git Safety Rules above)
- `npx tsc --noEmit` must pass after every commit
- Never introduce `any` types — use proper TypeScript
- Never hardcode mock data — use the data service layer
- If you discover a bug, fix it AND document it in a commit message

---

## PHASE 2.1 — JAKE'S EXPLICIT REQUESTS (P0)

These are features Jake specifically asked for. They come first.

### 2.1.1 Song "About" Section Rewrite
**Role**: A (Frontend) + B (Backend)
**Priority**: P0 — Jake called this out: "this section sucks... needs to be a summary of the song from a story perspective"

**Current state**: The "About" card in `/catalog/[slug]/page.tsx` Overview tab renders `song.notes` as a raw metadata string like:
```
TOP TRACK - 1.89M streams. LABEL RELEASE: Soave B.V. (Netherlands)...
```

**What it should be**:
A narrative story section with structured fields, like:

```
"Your Love's Not Wasted" is Jakke's breakout single — an organic house track
that found its audience through Spotify editorial playlists and Soave Records'
Netherlands-based distribution network. With 1.89M streams and counting, it
became the foundation for the Enjune Music catalog.
```

**Backend task (Role B)**:
- Add new fields to Song type: `storyDescription` (rich text), `highlights` (array of milestone strings), `placementHistory` (notable placements/editorial picks)
- API: If `storyDescription` is populated in Notion, return it. If not, generate a fallback from existing fields (title, artist, streams, label, distributor, release date, genre, notable playlists).
- Add a `/api/catalog/[slug]/generate-about` POST endpoint that uses Claude AI to generate a story summary from song metadata (optional — for future use)

**Frontend task (Role A)**:
- Replace the raw text dump with a structured "About" card:
  - Story paragraph (either `storyDescription` or auto-generated fallback)
  - Key highlights as milestone chips (e.g., "1.89M Streams", "Editorial Pick", "Soave Records")
  - Release context: distributor, label, release date as metadata row below the story
- If no meaningful data exists, show: "No story written yet. Add a description in Notion to bring this section to life."
- Style: large readable text (text-base not text-xs), generous padding, subtle left border accent in artist color

### 2.1.2 Song Dashboard — Press Tab (NEW)
**Role**: A (Frontend)
**Priority**: P0

**Current state**: SongTabs component has 6 tabs. No Press tab exists.

**Build**:
- Add "Press" as 7th tab in song dashboard
- Content: Grid of press cards, each showing:
  - Publication name + logo (placeholder icon if no logo)
  - Article title (clickable link)
  - Date published
  - Pull quote or excerpt (if available)
  - Type badge: Review / Interview / Feature / Mention
- **Data source**: No Notion field exists yet. Build the UI to read from a `pressLinks` array on the song model (Role B adds the field).
- **Empty state**: "No press coverage linked yet. When articles and reviews are added, they'll appear here." — with a subtle dashed-border placeholder card showing what it'll look like.

**Backend task (Role B)**:
- Add `pressLinks` to Song type: `Array<{ title: string; url: string; publication: string; date: string | null; type: 'review' | 'interview' | 'feature' | 'mention'; excerpt: string | null }>`
- Map from Notion if a "Press Links" field exists; otherwise return empty array
- This is future-proofing — the field may not exist in Notion yet, and that's fine

### 2.1.3 Song Dashboard — Lyrics Tab (NEW)
**Role**: A (Frontend)
**Priority**: P0

**Build**:
- Add "Lyrics" as 8th tab in song dashboard
- Content layout:
  - Full lyrics text display (scrollable, styled like a lyrics page — centered text, verse/chorus labels)
  - Lyrics source attribution (e.g., "via Musixmatch" or "via Genius")
  - Songwriter credits below lyrics
  - External links: Genius, Musixmatch, LyricFind (only show if URLs exist)
- **Data source**: Read from `lyrics` field on song model (Role B adds the field).
- **Empty state**: "Lyrics not available yet. Connect a lyrics provider or paste them in Notion."

**Backend task (Role B)**:
- Add `lyrics` to Song type: `string | null`
- Add `lyricsSource` to Song type: `string | null`
- Map from Notion if fields exist; otherwise null

### 2.1.4 Song Dashboard — Video Tab (NEW)
**Role**: A (Frontend)
**Priority**: P0

**Build**:
- Add "Video" as 9th tab in song dashboard
- Content layout:
  - "Official Videos" section: YouTube embeds (iframe or thumbnail cards) for official music videos, visualizers, lyric videos
  - "Trending" section: Grid of social media video cards showing UGC and viral clips using the track (Instagram Reels, TikTok, YouTube Shorts)
  - Each card shows: Platform icon, view count, date, creator name (if known), thumbnail
  - Sort by: Most views / Most recent
- **Data source**: Read from `videos` array on song model (Role B adds the field).
- **Empty state**: "No video content linked yet. Add video URLs in Notion and they'll populate here with view counts and engagement metrics."

**Backend task (Role B)**:
- Add `videos` to Song type: `Array<{ url: string; platform: 'youtube' | 'instagram' | 'tiktok'; title: string | null; views: number | null; date: string | null; type: 'official' | 'ugc' | 'short' }>`
- Map from Notion if "Video Links" field exists; otherwise empty array

### 2.1.5 Catalog Filter UI/UX Overhaul
**Role**: A (Frontend)
**Priority**: P0 — Jake said: "update filter colors / ui/ux on catalog page to be easier to read, nicer layout"

**Current problems**:
- All filter pills are the same shade of gray — impossible to tell active from inactive
- Filters are a flat wall of pills with no grouping — overwhelming
- No visual hierarchy between filter categories
- On mobile, filters take up too much space and can't be collapsed

**Redesign spec**:

**Desktop layout**:
- Filters live in a collapsible panel below the search bar
- Toggle button: "Filters" with active count badge: `Filters (3)`
- Group filters into labeled sections with dividers:
  - **Artist & Status**: Artist toggle (Jakke/Enjune/iLÜ/All) + Release Status (Released/Unreleased/All)
  - **Sound Profile**: Genre, Mood, Key, BPM range slider
  - **Sync & Licensing**: Sync Tier, Sync Available, Atmos, Stems Available
  - **Time**: Release Year range
- Each section has a subtle header label (text-xs uppercase text-gray-500)

**Active filter styling**:
- Active pills: `bg-orange-500/20 text-orange-400 border-orange-500/40 ring-1 ring-orange-500/20`
- Inactive pills: `bg-gray-800/50 text-gray-400 border-gray-700/30 hover:bg-gray-700/50`
- The difference must be OBVIOUS at a glance — not just slightly different shades of gray

**Mobile layout (< 768px)**:
- Filters collapsed by default behind "Filters" button
- When expanded: full-width slide-down panel, scrollable
- Each filter group stacks vertically
- "Apply" and "Clear All" buttons at bottom of panel
- Active filters shown as small chips above the results even when panel is collapsed

**Clear All** button:
- Visible when any filter is active
- Resets all filters AND removes URL params

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
- Tab order should be: Overview → Streams → Rights → Collaborators → Revenue → Sync → Contracts → Press → Lyrics → Videos
- "About" (story) comes first in Overview, not buried below metadata
- Production details (BPM, Key, Duration) belong in Overview, not repeated in header AND tab

**Collaborators page**:
- Group by role: Writer/Producer first, then Featured, then Remix, then Other
- Not a flat alphabetical list

**Revenue page**:
- Lead with total revenue number (big hero stat)
- Then breakdown by source, then by time period
- Not source first then total buried below

---

## PHASE 2.2 — DATA ACCURACY & INTEGRITY (P0)

### 2.2.1 Fix Radar Chart Normalization Bug
**Role**: B (Backend) or A (Frontend, depending on where normalization happens)
**Page**: `/cross-platform/page.tsx`

**Bug**: Jakke's followers always normalize to exactly 100 on the radar chart, regardless of actual value. The normalization formula divides each value by the max value in that category — but if Jakke IS the max, it's always 100%.

**Fix**: Normalize against a meaningful scale (e.g., 0-500K for followers, 0-5M for streams) rather than against the max value in the dataset. Or use log scale normalization for values that differ by orders of magnitude.

### 2.2.2 Remove All Hardcoded Mock Data
**Role**: A + B
**Priority**: P0

These pages currently use hardcoded JSON/CSV from `/public/data/` instead of real APIs:
- `/streaming/page.tsx` — hardcoded streaming data
- `/growth/page.tsx` — hardcoded growth metrics
- `/instagram/page.tsx` — hardcoded Instagram data
- `/cross-platform/page.tsx` — hardcoded cross-platform comparisons

**Fix approach**:
- For each page, identify what data it needs
- If a Notion DB or API exists, wire it up through the data service layer
- If no data source exists yet, show an honest empty state: "Connect [platform] to see real data here" — NOT fake numbers
- **Never show made-up data. A blank dashboard is better than a lying one.**

### 2.2.3 Add Pagination to Catalog
**Role**: B (Backend API) + A (Frontend pagination component)

**Current state**: Catalog API returns max 100 results with no pagination.

**Fix**:
- API: Add `?page=1&limit=25` params. Return `{ songs: [...], total: number, page: number, totalPages: number }`
- Frontend: Add pagination bar at bottom of catalog (Previous / Page numbers / Next)
- Default: 25 songs per page
- Preserve all active filters + sort when paginating

### 2.2.4 Populate Song Model Fields
**Role**: B (Backend)

The Song model (`src/lib/models/song.ts`) has 89+ fields. The Notion-to-Song mapping only populates ~15. Map ALL available Notion fields:

- `popularity` — Notion "Popularity" number field
- `listeners` — Notion "Monthly Listeners" field
- `streams30d` — Notion "30-Day Streams" field
- `syncTier` — Notion "Sync Tier" select field
- `syncAvailable` — Notion "Available for Sync" checkbox
- `atmosAvailable`, `stemsAvailable`, `instrumentalAvailable` — Notion checkboxes
- `publishers`, `distributors`, `writerSplits` — Notion relation/text fields
- `registrations` (ASCAP, MLC, PPL, SoundExchange, YouTube CID) — Notion checkboxes
- `lyricsSubmissions` (LyricFind, Musixmatch, Genius) — Notion checkboxes
- `marketplaceUploads` (DISCO, Music Gateway, Songtradr) — Notion checkboxes

Audit the Notion Song Catalog database schema and map EVERY field that exists.

---

## PHASE 2.3 — NAVIGATION & STRUCTURE (P1)

### 2.3.1 Update Sidebar Navigation
**Role**: A (Frontend)

The sidebar currently shows 9 items in 3 groups. Several built features have no nav entry:

**New sidebar structure**:
```
MUSIC
  Dashboard          /
  Catalog            /catalog
  Streaming          /streaming
  Revenue            /royalties

PEOPLE & SYNC
  Collaborators      /collaborators
  Licensing          /licensing
  Contracts          /contracts
  Sync Pipeline      /sync-pipeline

TOOLS
  Content Pipeline   /content
  Approval Queue     /approvals
  Data Audit         /data-audit
  AI Insights        /ai-insights
```

Update `NAV_GROUPS` in `src/lib/constants.ts` and verify all routes resolve.

### 2.3.2 Add Loading Skeletons to All Pages
**Role**: A (Frontend)

**Current state**: Most pages show nothing while data loads.

**Fix**: Every page that fetches data must show animated skeleton placeholders:
- KPI cards: gray pulsing rectangles matching card dimensions
- Tables: 5 skeleton rows with pulsing cells
- Charts: gray pulsing rectangle matching chart area
- Tabs: skeleton content area

Use a consistent `<Skeleton />` component. Tailwind: `animate-pulse bg-gray-800 rounded`.

### 2.3.3 Add Error Boundaries
**Role**: A (Frontend)

Wrap each page in an error boundary that shows:
- "Something went wrong loading [Page Name]"
- The error message (in a collapsible "Details" section)
- A "Retry" button that refetches
- A "Go Home" link

Use Next.js `error.tsx` convention for each route segment.

---

## PHASE 2.4 — BACKEND COMPLETIONS (P1)

### 2.4.1 Content Pipeline API Routes
**Role**: B (Backend)

**Current state**: `src/lib/services/content-service.ts` has full CRUD logic. But there are NO API routes under `/api/content/`.

**Build**:
```
GET    /api/content                  — List all content projects (filterable by type, platform, stage)
GET    /api/content/[id]             — Single content project detail
POST   /api/content                  — Create new content project
PATCH  /api/content/[id]             — Update content project
PATCH  /api/content/[id]/stage       — Advance stage (idea → production → etc.)
PATCH  /api/content/[id]/checklist   — Update checklist item
GET    /api/content/stats            — Aggregated stats (by stage, platform, type)
```

### 2.4.2 Licensing Contacts Service Implementation
**Role**: B (Backend)

**Current state**: `/api/licensing-contacts/route.ts` exists but the service function returns empty arrays.

**Fix**: Implement actual Notion queries against the Licensing Contacts database (data source ID: `5f4f4404-502d-4e8d-bd50-6a584255a2db`). Map all fields: Company, Contact Person, Email, Type, Status, Genre Focus, Notes.

### 2.4.3 Contracts Service Implementation
**Role**: B (Backend)

**Current state**: `/api/contracts/route.ts` exists but service returns empty arrays.

**Fix**: Implement actual Notion queries against the Contracts & Agreements database (data source ID: `1e0a4aaa-04a8-4726-abdd-da08e65d5514`). Map all fields: Document Name, Type, Status, Parties, Key Terms, Expiration Date.

### 2.4.4 Notion Sync Strategy
**Role**: B (Backend)

**Current state**: The app has TWO data stores that never reconcile:
1. Notion databases (source of truth)
2. Local `.data/store.json` (in-memory JSON store)

**Decision needed from Jake**: Pick ONE approach:
- **Option A**: Notion-first — all reads come from Notion API, local store is a cache only (TTL 5min). Writes go to Notion first, then update cache.
- **Option B**: Local-first — local store is primary, syncs to Notion on a schedule. Faster reads but data can drift.
- **Recommended**: Option A. Notion is already the source of truth for Jake's entire system.

**Implementation (for whichever option Jake picks)**:
- Clear data fetcher pattern: every service function hits Notion with in-memory cache
- Cache invalidation on writes
- Background revalidation (ISR or SWR pattern)
- Remove the dual-store confusion

---

## PHASE 2.5 — VISUAL POLISH (P1)

### 2.5.1 Color System Overhaul
**Role**: A (Frontend)

**Current problems**: Too much gray. Active/inactive states are nearly indistinguishable. Charts use muted colors that don't pop.

**New color rules**:
- **Active states**: Always use a color — orange for primary actions, artist color for artist-specific elements, green for success/positive, amber for warnings
- **Inactive states**: `bg-gray-800/50` with `text-gray-400` — clearly muted
- **Charts**: Every data series gets a distinct, vibrant color. Use the PLATFORM_COLORS and GENRE_COLORS already defined in constants.ts.
- **Status badges**: Released = green-500, Unreleased = amber-500, In Progress = blue-500, Draft = gray-500 — with 10% opacity backgrounds and full-color text
- **KPI cards**: Each card gets a subtle left border in a thematic color (streams = green, revenue = orange, songs = blue, sync = purple)

### 2.5.2 Mobile Responsiveness Audit
**Role**: A (Frontend) → C (QA verifies)

Test EVERY page at 390x844 viewport (iPhone 14 equivalent):

**Known issues to fix**:
- [ ] Page titles must not overlap with hamburger icon (add left padding on mobile)
- [ ] All tables need `overflow-x-auto` wrapper
- [ ] Filter panel must collapse on mobile
- [ ] Song hero: artwork stacks above title/metadata (not side-by-side)
- [ ] Tabs: horizontal scroll when they overflow
- [ ] Charts: reduce padding, allow horizontal scroll if needed
- [ ] KPI cards: 2-column grid on mobile (not 4)
- [ ] No text truncation that hides meaningful content

### 2.5.3 Consistent Empty States
**Role**: A (Frontend)

Every section/tab that can be empty MUST use the shared `EmptyState` component with:
- A relevant icon (not generic)
- A contextual message explaining what will appear here
- An optional action hint ("Add [thing] in Notion to see it here")
- Dashed border container (not just blank white space)

**No mock data. No placeholder numbers. No fake charts.**

---

## PHASE 2.6 — DEDUPLICATION & CLEANUP (P2)

### 2.6.1 Merge Duplicate Components
**Role**: A (Frontend)

- `StatusPill` exists in both `/components/ui/` and `/components/shared/` — merge into one
- `SongCard` vs `CatalogCard` — determine if both are needed; if not, merge
- Audit all components for overlapping functionality

### 2.6.2 Design Token Consolidation
**Role**: A (Frontend)

Several color values are hardcoded in components instead of using the design tokens in `constants.ts` or `design-tokens.ts`:
- Status badge colors
- Chart colors
- Filter pill colors

Consolidate ALL colors into design tokens and reference them everywhere. No `#hexcodes` in component files.

### 2.6.3 Remove Dead Code
**Role**: A + B

- Remove any unused API routes that return empty stubs with no implementation plan
- Remove unused component files
- Remove unused imports
- Run `npx tsc --noEmit` to catch type errors

---

## PHASE 2.7 — FUTURE-READY FEATURES (P2)

### 2.7.1 YouTube Integration Stubs → Real Implementation
**Role**: B (Backend)

**Current state**: 3 API routes exist (`/api/youtube/analytics`, `/api/youtube/channel`, `/api/youtube/sync`) but all are stubs.

**Decision needed from Jake**: Is YouTube OAuth integration in scope for Phase 2? If yes:
- Implement YouTube Data API v3 OAuth flow
- Channel stats, video analytics, content sync
- This is a substantial integration (~2-3 days of work)

If not in scope, **remove the stub routes** to avoid confusion.

### 2.7.2 Content Pipeline Frontend
**Role**: A (Frontend) — after Role B builds API routes (2.4.1)

**Build** `/content/page.tsx`:
- Kanban board view: columns for each stage (Idea → Production → Mastering → Scheduled → Published → Promoted)
- Drag-and-drop between columns to advance stage
- Card shows: title, platform icon, type badge, due date, assigned person
- Checklist progress bar on each card
- Filter by platform, type, assignee
- "New Project" button with form

### 2.7.3 Approval Queue Frontend
**Role**: A (Frontend)

**Current state**: Backend is fully built with 6 API routes. No frontend page exists.

**Build** `/approvals/page.tsx`:
- Stats bar: Pending count, Approved today, Rejected today, Auto-approved today
- Filterable table: Entity, Field, Current Value → Proposed Value, Source, Confidence, Status
- Inline approve/reject buttons per row
- Batch select + approve/reject
- Audit log tab showing recent decisions

### 2.7.4 Date Range Filtering
**Role**: B (Backend) + A (Frontend)

No page currently supports filtering by date range.

**Add to**:
- Catalog: Filter by release date range
- Revenue: Filter by reporting period
- Streaming: Filter by date range for stream counts

**Frontend**: Date picker component (or simple "Last 30 days / 90 days / Year / All Time" toggle)

---

## EXECUTION ORDER

The phases above are organized by priority, but agents should execute in this dependency order:

### Sprint 1: Jake's Requests (Phases 2.1 + 2.2)
**Estimated time**: 4-6 hours total

| Order | Task | Role | Depends On | Commit After |
|---|---|---|---|---|
| 1 | About section — backend fields | B | — | Yes |
| 2 | About section — frontend redesign | A | #1 | Yes |
| 3 | Press tab — backend fields + frontend | A+B | — | Yes |
| 4 | Lyrics tab — backend fields + frontend | A+B | — | Yes |
| 5 | Video tab — backend fields + frontend | A+B | — | Yes |
| 6 | Catalog filter UI overhaul | A | — | Yes |
| 7 | Smart section grouping audit | A | — | Yes |
| 8 | Fix radar chart bug | A or B | — | Yes |
| 9 | Pagination on catalog | B + A | — | Yes |
| 10 | Remove hardcoded mock data | A + B | — | Yes |
| 11 | Populate song model fields | B | — | Yes |

**Tag**: `git tag phase-2.1-complete && git push origin --tags`

### Sprint 2: Structure & Backend (Phases 2.3 + 2.4)
**Estimated time**: 3-4 hours total

| Order | Task | Role | Depends On |
|---|---|---|---|
| 12 | Update sidebar navigation | A | — |
| 13 | Loading skeletons | A | — |
| 14 | Error boundaries | A | — |
| 15 | Content Pipeline API routes | B | — |
| 16 | Licensing Contacts implementation | B | — |
| 17 | Contracts implementation | B | — |
| 18 | Notion sync strategy | B | Jake's decision |

**Tag**: `git tag phase-2.2-complete && git push origin --tags`

### Sprint 3: Polish & Extras (Phases 2.5 + 2.6 + 2.7)
**Estimated time**: 4-5 hours total

| Order | Task | Role | Depends On |
|---|---|---|---|
| 19 | Color system overhaul | A | — |
| 20 | Mobile responsiveness audit | A → C | — |
| 21 | Consistent empty states | A | — |
| 22 | Merge duplicate components | A | — |
| 23 | Design token consolidation | A | — |
| 24 | Remove dead code | A + B | — |
| 25 | Content Pipeline frontend | A | #15 |
| 26 | Approval Queue frontend | A | — |
| 27 | Date range filtering | A + B | — |

**Tag**: `git tag phase-2.3-complete && git push origin --tags`

### Sprint 4: QA + Deploy
**Estimated time**: 1-2 hours

| Order | Task | Role |
|---|---|---|
| 28 | Full desktop visual audit (all pages) | C |
| 29 | Full mobile visual audit (390x844, all pages) | C |
| 30 | Data accuracy spot-check (5 songs vs Notion) | C |
| 31 | TypeScript + build verification | C |
| 32 | Deploy to Vercel | C |

**Tag**: `git tag phase-2-deployed && git push origin --tags`

---

## DECISIONS NEEDED FROM JAKE

Before Sprint 2 starts, Jake needs to answer:

1. **Notion sync strategy**: Option A (Notion-first, cache locally) or Option B (local-first, sync to Notion)? Recommended: A.
2. **YouTube integration**: In scope for Phase 2, or defer to Phase 3? Recommended: defer.
3. **Content Pipeline**: Should the Kanban board use Notion as backend, or is the local JSON store fine for now?
4. **Albums feature**: The app has `/catalog/albums/` routes. Are albums a priority, or should they be deferred?

---

## SUCCESS CRITERIA

Phase 2 is DONE when:
- [ ] All 9 song dashboard tabs work (Overview, Streams, Rights, Collaborators, Revenue, Sync, Contracts, Press, Lyrics, Videos)
- [ ] "About" section tells a story, not a metadata dump
- [ ] Catalog filters are visually clear with active/inactive distinction
- [ ] Catalog has pagination (25 per page)
- [ ] No page shows hardcoded mock data
- [ ] Every sidebar link resolves to a real page
- [ ] Mobile (390x844) passes visual audit — no overflow, no cut-off text
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] All work is committed and pushed
- [ ] Vercel deploy is live and matches local build
