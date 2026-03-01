# Music Command Center — Site Audit Report

**Date**: March 1, 2026
**Audited URL**: music-command-center-next.vercel.app
**Codebase**: github.com/jakegoble/music-command-center-next (main @ `3d6e23f`)
**Viewports tested**: Desktop (1440×900) + Mobile (390×844)

---

## 🚨 CRITICAL: Deployment Out of Sync

**The live site is running an old build.** There are **16 commits** pushed to GitHub since the last Vercel deployment (tag `v2-deployed`). This means Sprint 1 and Sprint 2 changes are in the codebase but **not live**.

**Evidence:**
- Live site shows **emoji DSP icons** and **dropdown artist toggle** (old build)
- Codebase has **SVG DSP icons**, **segmented control toggle**, and **profile card** (Sprint 2)
- Live sidebar sections: MUSIC / SOCIAL & GROWTH / TOOLS & INSIGHTS
- Codebase sidebar sections: MUSIC / PEOPLE / BUSINESS / TOOLS
- Multiple routes exist in git but 404 on live site

**Fix**: Deploy current codebase to Vercel. Either reconnect GitHub auto-deploy or run `npx vercel --prod` from a clean working tree.

---

## Desktop Audit (1440×900)

### ✅ Pages Working

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Dashboard | `/` | ✅ Working | KPI cards render, charts visible |
| Catalog | `/catalog` | ✅ Working | Filters, table view, KPI cards, pagination all functional |
| Revenue | `/revenue` | ✅ Working | Charts and KPI cards render correctly |
| Instagram | `/instagram` | ✅ Working | Analytics with tabs (Overview, Engagement, Content, Audience) |
| Collaborators | `/collaborators` | ✅ Working | Charts, KPI cards, collaborator list |
| Growth | `/growth` | ✅ Working | Growth opportunities list with priority badges |
| Cross-Platform | `/cross-platform` | ⚠️ Minor issue | Radar chart "Popularity" label clipped to "opularity" on desktop (left edge cut off) |
| AI Insights | `/ai-insights` | ✅ Working | Strategy score, radar chart, score breakdown, all tabs functional |
| Song Detail | `/catalog/[slug]` | ✅ Working | Artwork, tabs (Overview, Lyrics, Press, Video, About), narrative About section |

### ❌ Pages Broken or Missing

| Page | Route | Status | Issue |
|------|-------|--------|-------|
| **Streaming** | `/streaming` | 💥 **CRASH** | `TypeError: Cannot read properties of undefined (reading 'toString')` — client-side exception, no error boundary catching it |
| Contracts | `/contracts` | 🚫 404 | Route exists in codebase but not in deployed build |
| Sync Pipeline | `/sync-pipeline` | 🚫 404 | Route exists in codebase but not in deployed build |
| Approvals | `/approvals` | 🚫 404 | Route exists in codebase but not in deployed build |
| Data Audit | `/data-audit` | 🚫 404 | Route exists in codebase but not in deployed build |
| Albums | `/catalog/albums` | 🚫 Misrouted | Caught by `[slug]` route → shows "Song not found: albums" |
| Royalties | `/royalties` | 🚫 404 | Old route — sidebar uses `/revenue` now |

### Desktop Issues

1. **Streaming page crash** — Full application error with no graceful fallback. Stack trace: `streaming/page-d82cb3da272b2d3c.js`. This is on the deployed (old) build.

2. **Cross-Platform radar chart label clipping** — "Popularity" renders as "opularity" because the left-most label extends beyond the chart container's left boundary. Needs padding or layout adjustment.

---

## Mobile Audit (390×844)

### ✅ Overall Mobile Health: Good

| Component | Status | Notes |
|-----------|--------|-------|
| Hamburger menu | ✅ Working | Drawer opens/closes, backdrop overlay works |
| Sidebar drawer | ✅ Working | Full navigation accessible, artist profile visible |
| KPI cards | ✅ Working | Stack to single column, text readable |
| Charts (Revenue) | ✅ Working | Bar charts fit, labels readable |
| Tables (Catalog) | ✅ Working | Horizontal scroll wrapper works |
| Filter pills | ✅ Working | Wrap to multiple rows on narrow screens |
| AI Insights tabs | ✅ Working | Tab labels fit, strategy score card clean |
| Score breakdown | ✅ Working | Progress bars and scores fully visible |
| Growth page | ✅ Working | Opportunity cards stack cleanly |
| Cross-Platform | ✅ Working | Radar chart labels actually render correctly on mobile (not clipped) |

### Mobile Issues

1. **Song detail title truncation** — "Your Love's Not Wasted" displays as "Your Love's Not Wa..." on 390px width. Consider allowing title to wrap or reducing font size on mobile.

---

## Codebase Bug Found

### Streaming page URL construction (line 183 of `src/app/streaming/page.tsx`)

```typescript
const params = artist !== 'all' ? `?artist=${artistToParam(artist)}` : '';
fetch(`/api/catalog${params}&limit=100&sort=total_streams&order=desc`)
```

When `artist === 'all'`, `params` is empty string, making the URL:
`/api/catalog&limit=100&sort=total_streams&order=desc`

The `&` should be `?` when there are no preceding query params. Fix: use a URL builder or conditional `?`/`&` separator.

---

## Summary: Priority Actions

### P0 — Deploy Now
- [ ] **Deploy current codebase to Vercel** — 16 commits behind, Sprint 1+2 not live

### P1 — Bug Fixes (Sprint 3 scope)
- [ ] **Fix streaming page URL bug** — line 183 missing `?` when no artist filter
- [ ] **Fix radar chart label clipping** — "Popularity" cut off on desktop cross-platform page

### P2 — Polish
- [ ] **Song detail mobile title** — allow wrapping or reduce size on small screens
- [ ] **Albums route** — needs dedicated route or redirect so `/catalog/albums` doesn't hit `[slug]`

### P3 — Verify Post-Deploy
- [ ] Re-audit all pages after deployment to confirm Sprint 1+2 features are live
- [ ] Verify sidebar shows SVG DSP icons + segmented toggle + profile card
- [ ] Verify new routes work: `/contracts`, `/sync-pipeline`, `/approvals`, `/data-audit`
- [ ] Verify streaming page doesn't crash with new codebase
