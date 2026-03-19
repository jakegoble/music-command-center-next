# Music Command Center

> Stack: Next.js 16 + Tailwind 4 + TypeScript 5 + Recharts 3 + Notion SDK
> Owner: Jake Goble
> Live: site-wheat-zeta.vercel.app
> Repo: github.com/jakegoble/music-command-center-next (public)
> Artists: Jakke, Enjune, iLÜ

## THIS IS A SEPARATE PROJECT

This is the Music Command Center for Jakke/Enjune/iLÜ catalog management. It is COMPLETELY SEPARATE from:
- madrone-command-center (Madrone Studios BD/CRM)
- creative-hotline (Creative Hotline)

NEVER mix code, data, Notion databases, config, or deployments between these projects.

## Architecture

- Next.js App Router under `/src/app/`
- Pages: Dashboard, Streaming, Catalog, Albums, Royalties, Collaborators, Licensing, Contracts, Sync Pipeline, Content, Data Audit, AI Insights, Approvals
- Notion client: `src/lib/clients/notion.ts` (in-memory cache with TTLs, property extractors, pagination via `dataSources.query`)
- Services: `src/lib/services/` (songs, albums, collaborators, content-pipeline, revenue, royalties, approvals)
- API routes: `/api/{catalog,catalog/stats,catalog/albums,royalties,streaming,collaborators,contracts,content,data-audit}`
- Admin routes: `/api/admin/{bulk-update,spotify-sync,deezer-sync,youtube-sync,spotify-playcount-sync}`
- Cron: `/api/cron/daily-sync` (6 AM UTC daily via Vercel cron)
- Types in `src/types/index.ts`
- Config: `src/config/notion.ts` (DB IDs, artist DSP links)

## Data Flow

1. Pages fetch from API routes (client-side)
2. API routes call service layer → Notion SDK (`dataSources.query`)
3. In-memory cache with TTLs (songs 5min, collaborators 15min, contracts 15min, royalties 10min)
4. Cache invalidated by prefix on admin updates
5. Daily cron syncs Spotify/YouTube/Deezer metadata

## Notion Database IDs

Defined in `src/config/notion.ts`:
- Song Catalog: `a1054739-9345-4580-bacf-8cda93f7211d`
- Sync Licensing: `2200e857-1373-4a3c-adf6-b6d522c1eb3a`
- Collaborators: `0b5811a0-9afc-4618-b97e-ea5c7bb52e5e`
- Licensing Contacts: `5f4f4404-502d-4e8d-bd50-6a584255a2db`
- Contracts: `1e0a4aaa-04a8-4726-abdd-da08e65d5514`
- Royalty Tracking: `3e233507-12c8-4038-aaef-d29b6792abfa`
- Approval Queue: env var `NOTION_APPROVAL_QUEUE_DB` (Phase 2.4)
- Content Pipeline: env var `NOTION_CONTENT_PIPELINE_DB` (Phase 2.4)

## Notion SDK Note (v5)

The `@notionhq/client` v5 moved `databases.query()` to `dataSources.query()`. Our code uses `dataSources.query` — do NOT use `databases.query`.

## Key Features

- Multi-artist catalog management (Jakke, Enjune, iLÜ)
- Per-platform streaming analytics (Spotify, Apple Music, YouTube, Amazon, Tidal, Deezer)
- Revenue estimation with blended royalty rates (~$0.00478/stream)
- Sync licensing pipeline and contact tracking
- Collaborator directory with split tracking
- Contract management
- Content marketing pipeline with stage tracking
- Data audit: duplicate detection, missing fields, sum reconciliation
- AI Insights: catalog scoring via intake questionnaire
- Metadata approval queue
- Demo data toggle on dashboard (localStorage `mcc-demo-data`)

## Artists & Theme

| Artist | Color |
|--------|-------|
| Jakke | #3B82F6 (blue) |
| Enjune | #8B5CF6 (purple) |
| iLÜ | #22C55E (green) |

- Background: `#030712` (near-black)
- Foreground: `#f3f4f6` (light gray)
- Accent: `#F97316` (orange, default)
- Lucide-compatible SVG icons + custom DSP icons
- Mobile responsive with collapsible sidebar

## Setup Requirements

1. Share all Notion databases with your Notion integration
2. Set env vars (see `.env.example`): `NOTION_TOKEN`, `NOTION_APPROVAL_QUEUE_DB`, `NOTION_CONTENT_PIPELINE_DB`, `GENIUS_ACCESS_TOKEN`, `YOUTUBE_API_KEY`
3. Vercel cron configured in `vercel.json`

## Testing

- Test files: `src/lib/utils/slug.test.ts`, `src/lib/services/revenue.test.ts`
- No formal test runner configured yet

## Notable Implementation Details

- Songs deduplicated by ISRC or title+artist
- When only total streams available, estimated per-platform using PLATFORM_DISTRIBUTION weights
- Popularity scoring via Notion-based intake questionnaire with weighted categories
- Admin auth: simple secret-based (no formal auth system)
- No Anthropic/Claude API integration — purely Notion-powered

## Platform Notes (updated 2026-03-19)

### Current Models (March 2026)
- Opus: `claude-opus-4-6` — Most intelligent. $5/$25 per MTok. Recommended for complex agentic tasks.
- Sonnet: `claude-sonnet-4-6` — Balanced speed + intelligence. $3/$15 per MTok. Default for most work.
- Haiku: `claude-haiku-4-5-20251001` — Fastest. $1/$5 per MTok. For high-volume/cost-sensitive tasks.
- **Retired model strings** (return errors): `claude-3-haiku-20240307`, `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20240620`, `claude-3-5-sonnet-20241022`, `claude-3-7-sonnet-20250219`, `claude-3-opus-20240229`.

### Thinking Configuration
- Default: `thinking: {type: "adaptive"}` (recommended for Opus 4.6)
- DEPRECATED: `budget_tokens` parameter on new models. Use `/effort` command instead.
- In Claude Code: `/effort low|medium|high` to control thinking depth.
- "ultrathink" keyword — use directly in prompt (not a command) to trigger maximum thinking effort.

### Thinking Display Control
For production API calls where you don't need to see thinking output:
Set `thinking.display: "omitted"` to skip thinking content in responses.
- Faster streaming, smaller payloads
- `signature` field preserved for multi-turn continuity
- Billing unchanged (you still pay for thinking tokens)

### Context Window
- 1M token context window is GA for Opus 4.6 and Sonnet 4.6 — no beta header needed.
- Standard pricing applies (no long-context surcharge for these models).
- Standard rate limits apply across all context lengths (no separate 1M tier).
- Media limit: up to 600 images or PDF pages per request with 1M context.
- 128K output tokens supported (up from 64K default).

### Console/Docs URLs
- `platform.claude.com` (replaces console.anthropic.com)
- `platform.claude.com/docs` (replaces docs.anthropic.com / docs.claude.com)

### Claude Code Tools & Commands
- `/effort low|medium|high` — Control thinking depth. Use `high` for complex architectural work.
- "ultrathink" keyword — Use this word directly in your prompt (not as a command) to trigger maximum thinking effort.
- `/loop <duration> <command>` — Auto-repeat a command (e.g., `/loop 5m npm test`).
- `/voice` — Voice input mode (hold spacebar to dictate).
- Code Review — Multi-agent code analysis tool. Use as quality gate for AI-generated code.
- MCP Elicitation — MCP servers can request structured input mid-task via `Elicitation`/`ElicitationResult` hooks.
- `CLAUDE_CODE_DISABLE_CRON` env var — Instantly stops scheduled cron jobs mid-session.

### Quality Gates
- All Autopilot-generated code MUST be reviewed with Code Review tool before merging.
- Never run Autopilot on main branch — feature branches only.
- Autopilot bypasses ALL approval settings including destructive file operations.

### MCP Usage Note
MCP servers consume 40-50% of context window overhead (per Perplexity CTO benchmarks).
For context-heavy sessions, consider selective MCP loading — only enable the MCPs you
actually need for that session.

### Prompt Caching
Automatic caching is GA. Add a single `cache_control` field to your API request body
and the system automatically caches the last cacheable block, moving the cache point
forward as conversations grow. No manual breakpoint management needed.

### Models API
`GET /v1/models` and `GET /v1/models/{model_id}` now return:
- `max_input_tokens` — Maximum input context length
- `max_tokens` — Maximum output tokens
- `capabilities` object — Programmatic discovery of model features
Use this for dynamic model discovery instead of hardcoding capabilities.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
```
