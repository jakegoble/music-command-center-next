# Music Command Center v2 — QA Audit Report

**Date**: 2026-02-28
**Tester**: Claude Code QA Agent
**Build**: f56402e (main)

---

## Summary

- **Total checks**: 58
- **Passed**: 12
- **Failed**: 22 (Critical: 6, Major: 10, Minor: 6)
- **Blocked**: 24 (no frontend pages exist; no NOTION_TOKEN configured)

---

## Pre-Audit Blockers

Before starting the section-by-section audit, two fundamental blockers were identified:

### BLOCKER 1 — No NOTION_TOKEN configured

No `.env.local` or `.env` file exists. The `NOTION_TOKEN` environment variable is not set. All API endpoints return `{"error":"...","details":"APIResponseError: API token is invalid."}`. Live data verification against Notion is impossible without this token.

**Impact**: Sections 1–5 and 7–8 cannot be verified with live data. Code-level audit was performed instead.

### BLOCKER 2 — Role 3 (Song Dashboards) not implemented

The following frontend pages **do not exist**:
- `/catalog` — no catalog listing page
- `/catalog/[slug]` — no song detail/dashboard page
- `/dashboard` — only a stub welcome message at `/`
- `/collaborators` — no collaborators page
- `/licensing` — no licensing contacts page
- `/contracts` — no contracts page
- `/royalties` — no royalties page
- `/data-audit` — no data audit page

The Sidebar component links to all of these routes, but navigating to them produces Next.js 404 errors. Only the root page (`/`) renders, showing a static welcome message.

**Impact**: Sections 2–5, 6 (partially), 7–8, 9, and 10 cannot be visually audited. All findings are based on code review.

---

## Section 1: Data Audit Endpoint

### 1.1 Endpoint exists ✅
`GET /api/data-audit` route is defined at `src/app/api/data-audit/route.ts`.

### 1.2 Response shape ✅
Returns `DataAuditResponse` with correct fields: `totalSongs`, `songsByArtist`, `totalStreams`, `streamsByArtist`, `duplicateSongs`, `nullFields`, `allArtistSum`, `individualArtistSum`, `sumsMatch`.

### 1.3 Error handling ✅
Returns proper JSON error with status 500 when Notion API fails.

### 1.4 Live data verification ❌ BLOCKED
Cannot hit endpoint with valid data — no NOTION_TOKEN.

### [CRITICAL] 1.5 — Cross-check is tautological

**Page**: `/api/data-audit`
**File**: [route.ts:37-67](src/app/api/data-audit/route.ts#L37-L67)
**Expected**: `allArtistSum` vs `individualArtistSum` should independently verify that per-artist Notion queries match the "all" query (catching Notion filter bugs, stale data, etc.)
**Actual**: The "full audit" path fetches all songs via `fetchAllSongs('all')`, deduplicates once, then filters the *same* deduped array by artist name. The per-artist sums are computed from the same dataset as the total. They are algebraically guaranteed to match unless a song has an artist value not in `ARTIST_OPTIONS` — which is a useful check, but not the cross-check the code claims.

A real cross-check should call `fetchAllSongs(artist)` for each artist separately (triggering independent Notion queries), deduplicate each, and compare totals. The current implementation only catches songs with unknown artist values.

---

## Section 2: Song Count Verification

### ❌ BLOCKED — No `/catalog` page exists

No catalog listing page has been built. Cannot count displayed rows, test artist filter switching, or verify song counts visually.

### Code-level findings:

### [MAJOR] 2.1 — Cache inconsistency between "all" and per-artist queries

**File**: [songs.ts:89-100](src/lib/services/songs.ts#L89-L100)
**Expected**: `fetchAllSongs('all')` and `fetchAllSongs('Jakke')` should be consistent at any point in time.
**Actual**: These use separate cache keys (`songs:all` vs `songs:Jakke`) populated by separate Notion API calls with independent 5-minute TTLs. If a song's artist changes in Notion between cache refreshes, the "all" cache and per-artist caches will show different counts. User A viewing "All Artists" could see song X as Jakke while User B viewing "Jakke" doesn't see it (or vice versa).

---

## Section 3: Stream Total Verification

### ❌ BLOCKED — No dashboard KPIs exist

No dashboard page displays total streams or per-artist stream totals.

### Code-level findings:

### [MINOR] 3.1 — Revenue estimates ignore ownership splits

**File**: [revenue.ts:27](src/lib/services/revenue.ts#L27)
**Expected**: Revenue estimates should account for writer splits when available.
**Actual**: `estimateRevenue()` always uses `ownershipPct = 1.0`. No caller passes a different value. For songs with multiple writers, revenue is overstated. The `writer_splits_parsed` data exists in `SongDetail` but is never used for revenue calculation.

---

## Section 4: Individual Song Spot-Check

### ❌ BLOCKED — No `/catalog/[slug]` page exists

No song detail page has been built. Cannot visually verify any hero sections, artwork, DSP links, stream numbers, rights tabs, collaborator tabs, sync tabs, or contract tabs.

### Code-level findings:

### [CRITICAL] 4.1 — Song detail royalties fetched by artist, not by song

**File**: [catalog/[slug]/route.ts:107-139](src/app/api/catalog/[slug]/route.ts#L107-L139)
**Expected**: A song's detail page should show royalty data specific to that song.
**Actual**: The royalty query filters by `{ property: 'Artist', select: { equals: artist } }`, returning ALL royalty entries for the entire artist — not the specific song. If Jakke has 20 songs, every individual song page would show the same combined royalty data for all 20 songs. This makes per-song revenue analysis impossible and misrepresents individual song performance.

### [MAJOR] 4.2 — Slug collisions make songs inaccessible

**File**: [songs.ts:23-28](src/lib/services/songs.ts#L23-L28), [catalog/[slug]/route.ts:82-85](src/app/api/catalog/[slug]/route.ts#L82-L85)
**Expected**: Every song should have a unique, resolvable slug.
**Actual**: `toSlug()` strips all non-alphanumeric characters and lowercases. Titles differing only in punctuation or accents produce identical slugs (e.g., "Café" and "Cafe" both become `cafe`). The detail endpoint uses `pages.find()` which returns the first match, making the second song permanently inaccessible.

### [CRITICAL] 4.3 — Deduplication silently drops different songs with same title

**File**: [songs.ts:121-138](src/lib/services/songs.ts#L121-L138)
**Expected**: Two genuinely different songs that happen to share a title (but belong to different artists) should both appear.
**Actual**: The dedup key is `song.isrc || song.title`. If two different songs by different artists both lack ISRCs and share a title, the second is silently dropped. Additionally, any song with both empty ISRC and empty title is completely skipped (line 124: `if (!key) continue`).

### [MAJOR] 4.4 — Same ISRC, different title — insufficient reporting

**File**: [songs.ts:121-138](src/lib/services/songs.ts#L121-L138)
**Expected**: When duplicates are found with the same ISRC but different titles, both titles should be reported.
**Actual**: Only the kept song's title is reported. The dropped variant's title is lost, making it impossible to determine if this was a legitimate duplicate or a data error.

### [MINOR] 4.5 — Song detail fetches entire catalog to find one song

**File**: [catalog/[slug]/route.ts:82-85](src/app/api/catalog/[slug]/route.ts#L82-L85)
**Expected**: Efficient lookup of a single song.
**Actual**: Calls `queryAll(NOTION_DBS.SONG_CATALOG)` with no filter, fetching every song, then does a linear `.find()` scan. The result is cached per-slug, but the Notion query fetches all songs regardless. First request or post-cache-expiry pays the full cost.

---

## Section 5: Empty State Verification

### ❌ BLOCKED — No frontend pages exist

Cannot verify any empty states visually. No UI renders for songs with sparse data.

### Code-level findings:

### [MINOR] 5.1 — Hard-coded default writer split

**File**: [revenue.ts:37](src/lib/services/revenue.ts#L37)
**Expected**: When writer splits are missing, show "Unknown" or empty state.
**Actual**: `parseWriterSplits(null)` returns `[{ name: 'Jake Goble', percentage: 100 }]`. This hard-codes an assumption that may be incorrect for songs where the field was simply never filled in but Jake is not the sole writer.

---

## Section 6: Artist Toggle Verification

### 6.1 Toggle component exists ✅
`ArtistToggle` renders a 4-option segmented control (All, Jakke, Enjune, iLÜ) with correct artist colors.

### 6.2 ArtistBadge exists ✅
Shows when artist filter is active, hides when "All" is selected. Dismiss button works correctly.

### 6.3 PageHeader shows artist suffix ✅
Uses `getPageTitle(base, artist)` to append " — {artist}" when filtered.

### 6.4 URL persistence (initial load) ✅
`ArtistContext` initializes state from `searchParams.get('artist')` on mount. `parseArtistParam` correctly handles `jakke`, `enjune`, `ilu`/`ilü`.

### [CRITICAL] 6.5 — Sidebar navigation drops artist filter on every page change

**File**: [Sidebar.tsx:134-145](src/components/Sidebar.tsx#L134-L145)
**Expected**: Selecting "Jakke" → navigating to Catalog → toggle stays on Jakke.
**Actual**: Sidebar `<Link>` hrefs are static strings (e.g., `href="/catalog"`) with no query params. Navigating to any page via the sidebar strips `?artist=` from the URL. The `ArtistContext` `useEffect` (which syncs state from URL) then reads the missing param as `'all'`, resetting the filter.

**This defeats the entire purpose of having a global artist context.** The artist filter is effectively page-scoped — it resets every time the user clicks a sidebar link.

### [MAJOR] 6.6 — Bidirectional URL/state sync with no single source of truth

**File**: [ArtistContext.tsx:29-54](src/lib/contexts/ArtistContext.tsx#L29-L54)
**Expected**: Clear source of truth for artist state (either URL or React state).
**Actual**: State is initialized from URL (line 30), an effect overwrites state from URL on every searchParams change (lines 34-37), and `setArtist` writes both state and URL (lines 40-54). This creates a muddled two-way sync where the URL effect can silently undo state changes when navigation doesn't carry the query param.

### [MAJOR] 6.7 — Stale closure risk in setArtist

**File**: [ArtistContext.tsx:40-54](src/lib/contexts/ArtistContext.tsx#L40-L54)
**Expected**: `setArtist` should always use current pathname and searchParams.
**Actual**: The `useCallback` captures `searchParams` at creation time. If additional query params are ever added, rapid toggles could use stale `searchParams` and overwrite other params. Currently low risk (only one query param), but architecturally fragile.

### 6.8 Artist accent color on sidebar ✅
Sidebar shows top border accent color matching the selected artist.

---

## Section 7: Revenue & Royalty Data Verification

### ❌ BLOCKED — No revenue/royalty UI pages exist

No royalties page, no revenue tab on song detail.

### Code-level findings:

### 7.1 Royalties API response shape ✅
`/api/royalties` returns `{ entries, total_revenue, by_source, by_quarter }` — well-structured.

### 7.2 Royalty total calculation ✅
Individual source amounts are summed correctly in `mapPageToRoyalty()`. The `total` field is computed as `ascap + distributor + mlc + ppl + soundexchange + sync + youtube + other`.

### [MAJOR] 7.3 — Royalties API returns `null` values as `0` in total but preserves `null` in breakdown

**File**: [royalties.ts:16-38](src/lib/services/royalties.ts#L16-L38)
**Expected**: Consistent handling of null/zero values.
**Actual**: The `total` field (line 38) uses `?? 0` coalescing for all sources, so nulls become 0 in the sum. But the individual breakdown fields (lines 30-37) use `getNumber()` which returns `null` for missing values. A song with no ASCAP Performance data will have `ascap_performance: null` but its contribution to `total` is 0. This is technically correct but inconsistent — the API consumer must handle both null and 0 for individual fields.

---

## Section 8: Relation Integrity

### ❌ BLOCKED — No frontend pages for collaborators, contracts, or licensing contacts

### Code-level findings:

### 8.1 Collaborator mapping ✅
Tries both `p['Roles']` and `p['Role']` for backwards compatibility. Correct.

### 8.2 Contract mapping ✅
Tries both `p['Document Name']` and `p['Name']`. Correct.

### 8.3 Related page fetching ✅
Song detail fetches collaborators, contracts, and licensing contacts in parallel via `Promise.all`. Correctly handles null pages from `fetchRelatedPage()`.

### [MINOR] 8.4 — Collaborator song_count only counts relations, doesn't verify bidirectional integrity

**File**: [collaborators.ts:31](src/lib/services/collaborators.ts#L31)
**Expected**: Collaborator's song count matches the number of songs that link back to them.
**Actual**: `song_count` reads `getRelationIds(p['Songs'] ?? p['Song Catalog']).length` — which only counts the forward relation from the collaborator page. If the Song Catalog page links to a collaborator but the collaborator page doesn't link back (a common Notion relation inconsistency), the count will be wrong.

---

## Section 9: Mobile Responsiveness (390×844 viewport)

### ❌ BLOCKED — Only root page renders; no content pages to test

### Code-level findings:

### 9.1 Sidebar mobile behavior ✅ (code review)
Hamburger menu opens/closes with animation. Backdrop overlay. Close button. All correct in code.

### 9.2 Artist toggle in sidebar ✅
`ArtistToggle` uses `grid-cols-4` which adapts to sidebar width (60rem / w-60). Buttons are tappable with `py-2` padding.

### [MINOR] 9.3 — Suspense has no fallback — UI flashes blank

**File**: [layout.tsx:34](src/app/layout.tsx#L34)
**Expected**: Loading skeleton or spinner during Suspense boundary resolution.
**Actual**: `<Suspense>` has no `fallback` prop, rendering nothing during hydration. The entire page (sidebar, main content) briefly flashes blank before `useSearchParams()` resolves.

---

## Section 10: Performance

### 10.1 Build succeeds ✅
`npm run build` completes in ~2.2s with Turbopack. No TypeScript errors. No compilation warnings.

### 10.2 Route configuration ✅
All API routes correctly identified as dynamic (`ƒ`). Root page correctly static (`○`).

### 10.3 API error handling ✅
All 8 API routes have try/catch blocks returning proper JSON error responses with appropriate HTTP status codes.

### [MAJOR] 10.4 — No `.env.local` file and no `.env.example`

**Expected**: A `.env.example` or `.env.local` file documenting required environment variables.
**Actual**: Neither exists. The only hint is a `console.warn` in `notion.ts` line 8. New developers (or CI/CD) have no way to know that `NOTION_TOKEN` is required without reading the source code.

### [MAJOR] 10.5 — Sort on array-typed properties produces nonsensical results

**File**: [catalog/route.ts:115-131](src/app/api/catalog/route.ts#L115-L131)
**Expected**: Sorting by `genre` or `mood` either rejects with a 400 error or sorts by the first array element.
**Actual**: Casts songs to `Record<string, unknown>` for dynamic property access. Array values are stringified via `.toString()` (e.g., `"Electronic,Pop"`), producing meaningless sort order. No validation that the `sort` param is a valid property name.

---

## All Bugs (Consolidated, Sorted by Severity)

### Critical (6)

| # | Description | File | Lines |
|---|-------------|------|-------|
| C1 | Sidebar navigation drops artist filter on every page change | Sidebar.tsx | 134-145 |
| C2 | Song detail royalties fetched by artist, not by song | catalog/[slug]/route.ts | 107-139 |
| C3 | Deduplication silently drops different songs with same title + no ISRC | songs.ts | 121-138 |
| C4 | Data audit cross-check is tautological — doesn't actually verify anything | data-audit/route.ts | 37-67 |
| C5 | No frontend pages built (Role 3 not completed) | — | — |
| C6 | No NOTION_TOKEN configured — all API calls fail | — | — |

### Major (10)

| # | Description | File | Lines |
|---|-------------|------|-------|
| M1 | Bidirectional URL/state sync in ArtistContext — no single source of truth | ArtistContext.tsx | 29-54 |
| M2 | Cache inconsistency between "all" and per-artist queries | songs.ts, notion.ts | 89-100 |
| M3 | Slug collisions make some songs permanently inaccessible | songs.ts, [slug]/route.ts | 23-28, 82-85 |
| M4 | Same ISRC, different title — dropped variant not reported | songs.ts | 121-138 |
| M5 | Sort on array-typed properties produces nonsensical results | catalog/route.ts | 115-131 |
| M6 | Dashboard page shows artist suffix but no filtered data | page.tsx | 1-14 |
| M7 | No .env.example file — required config undocumented | — | — |
| M8 | Stale closure risk in setArtist callback | ArtistContext.tsx | 40-54 |
| M9 | Royalties API inconsistent null/0 handling in breakdown vs total | royalties.ts | 16-38 |
| M10 | Pathname captured at render-time could mismatch during concurrent navigation | ArtistContext.tsx | 51 |

### Minor (6)

| # | Description | File | Lines |
|---|-------------|------|-------|
| m1 | Status comparisons are case-sensitive — could miss non-standard casing | catalog/stats/route.ts | 60-62 |
| m2 | Revenue estimates ignore ownership splits — always assumes 100% | revenue.ts | 27 |
| m3 | Hard-coded "Jake Goble 100%" default when writer splits missing | revenue.ts | 37 |
| m4 | Song detail fetches entire catalog to find one song by slug | catalog/[slug]/route.ts | 82-85 |
| m5 | Suspense boundary has no fallback — UI flashes blank | layout.tsx | 34 |
| m6 | Dedup `count` field semantics ambiguous (total occurrences vs extra dupes) | songs.ts | 141-144 |

---

## Recommendation

### **FAIL — Do Not Deploy**

The application is **not ready for deployment**. The following must be resolved first:

#### Must-fix before deploy (Priority 1):
1. **Build the frontend pages** — Role 3 has not been completed. No catalog, song detail, dashboard, collaborators, contracts, licensing, or royalties pages exist. The entire UI is a stub.
2. **Configure NOTION_TOKEN** — Create `.env.local` with valid Notion integration token. Create `.env.example` documenting required variables.
3. **Fix sidebar navigation losing artist filter** (C1) — Sidebar links must preserve the `?artist=` query param, or the ArtistContext must use a different persistence mechanism (e.g., localStorage, cookie) that doesn't depend on URL params surviving navigation.
4. **Fix song detail royalties** (C2) — Query royalties by song relation, not by artist name. Currently shows all artist royalties on every song page.
5. **Fix deduplication data loss** (C3) — Use `${title}::${artist}` as fallback dedup key instead of just `title`. Don't skip songs with empty keys.

#### Should-fix before deploy (Priority 2):
6. **Make data audit cross-check real** (C4) — Fetch per-artist data independently from Notion.
7. **Fix cache inconsistency** (M2) — Per-artist queries should filter from the cached "all" query.
8. **Fix slug collisions** (M3) — Append artist name or numeric suffix to disambiguate.
9. **Fix ArtistContext source of truth** (M1) — Choose URL or state as authoritative, not both.
10. **Whitelist sort fields** (M5) — Reject sort on array fields like `genre` and `mood`.

#### Nice-to-fix (Priority 3):
11. Add Suspense fallback for loading state (m5)
12. Add `.env.example` file (M7)
13. Case-normalize status comparisons (m1)
14. Use writer splits for revenue estimation (m2)
15. Optimize song detail lookup (m4)

---

*Report generated by Claude Code QA Agent on 2026-02-28.*
