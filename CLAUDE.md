# Music Command Center (Enjune)

> Stack: Next.js 16 + Tailwind 4 + TypeScript 5 + Recharts 3
> Owner: Jake Goble (jake@radanimal.co)
> Live: site-wheat-zeta.vercel.app

## Architecture

- Next.js App Router under `/src/app/`
- 15 pages across catalog, streaming, royalties, collaborators, contracts, licensing, AI insights, data audit, approvals, content, sync pipeline
- 24 API routes under `/src/app/api/`
- Service modules under `/src/lib/services/` (8 modules, ~1,100 lines)
- Notion SDK client with in-memory caching (5-15m TTLs) under `/src/lib/clients/`
- Artist context provider under `/src/lib/contexts/`
- Config under `/src/config/` (Notion DB IDs, artist profiles, colors)
- All secrets via environment variables (`.env.local`) — see `.env.example`

## Artists

Three artist projects: Jakke, Enjune, iLU
- Global artist filter via `useArtistContext()` + URL params
- Artist colors: Jakke=#3B82F6, Enjune=#8B5CF6, iLU=#22C55E

## Data Sources

| Service | Purpose | Auth |
|---------|---------|------|
| Notion | Primary data store (6 databases) | `NOTION_TOKEN` |
| Spotify | Metadata sync, popularity, playcounts | `SPOTIFY_CLIENT_ID` + `SECRET` |
| YouTube | Video discovery, view counts | `YOUTUBE_API_KEY` |
| Genius | Lyrics lookup | `GENIUS_ACCESS_TOKEN` |
| iTunes | Album artwork fallback | Public API |
| LRCLIB | Synced lyrics fallback | Public API |
| Deezer | Metadata (not yet implemented) | Public API |

## Notion Database IDs

Hardcoded in `src/config/notion.ts`:
- SONG_CATALOG: `a1054739-9345-4580-bacf-8cda93f7211d`
- SYNC_LICENSING: `2200e857-1373-4a3c-adf6-b6d522c1eb3a`
- COLLABORATORS: `0b5811a0-9afc-4618-b97e-ea5c7bb52e5e`
- LICENSING_CONTACTS: `5f4f4404-502d-4e8d-bd50-6a584255a2db`
- CONTRACTS: `1e0a4aaa-04a8-4726-abdd-da08e65d5514`
- ROYALTY_TRACKING: `3e233507-12c8-4038-aaef-d29b6792abfa`
- CLIENT_HISTORY: `d8d079f0-89fd-4b6c-94e8-6fb7d7ebd6d1` (Jon's CRM)
- APPROVAL_QUEUE: via env var (not yet created)
- CONTENT_PIPELINE: via env var (not yet created)

## API Route Auth

- **Public endpoints** (catalog, collaborators, contracts, etc.): No auth, read-only
- **Admin endpoints** (`/api/admin/*`): Require `ADMIN_SECRET` in POST body
- **Cron endpoint** (`/api/cron/daily-sync`): Require `Authorization: Bearer CRON_SECRET`

## Cron Jobs

- Daily sync at 6 AM UTC: Spotify popularity + YouTube views (`vercel.json`)
- Client sync every 6 hours (0:00, 6:00, 12:00, 18:00 UTC): Refreshes client data from Notion

## Code Conventions

- TypeScript strict mode — no `any` types
- Tailwind for styling — mobile-first responsive
- Named exports over default exports
- PascalCase components, kebab-case utilities
- Every page has error.tsx + loading.tsx boundaries
- Tables wrapped in `overflow-x-auto` for mobile
- ES modules only (import/export), never CommonJS

## Known Issues

1. Artist DSP links in `src/config/notion.ts` still have PLACEHOLDER URLs
2. Approval Queue and Content Pipeline Notion databases not yet created
3. Deezer sync endpoint exists but has no implementation
4. AI Insights radar chart data is manual/hardcoded, not connected to real scoring
5. Radar chart "Popularity" label clips on desktop (left edge)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # Type check
```
