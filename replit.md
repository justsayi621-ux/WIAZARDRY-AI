# Wizardry AI

Enterprise-grade deepfake detection platform — analyze video media for AI manipulation using multi-engine forensic scanning with token-based billing and intelligent scorecards.

## Run & Operate

- `pnpm --filter @workspace/wizardry-ai run dev` — run the React frontend (Vite)
- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 (dark cyber theme)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (6 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Build: esbuild (CJS bundle)
- Routing: Wouter (frontend SPA)
- Charts: SVG gauge components (no external chart lib)

## Where things live

- `lib/api-spec/openapi.yaml` — **single source of truth** for API contract
- `lib/api-client-react/src/generated/` — generated hooks + Zod schemas (do not edit)
- `lib/api-client-react/src/custom-fetch.ts` — fetch client with `setDefaultHeaders()`
- `lib/db/src/schema/` — Drizzle ORM schema (users, scans, subscriptions, settings, notifications, api_keys)
- `artifacts/api-server/src/routes/` — Express route files (users, scans, subscriptions, settings, notifications, apikeys, stats)
- `artifacts/api-server/src/lib/plans.ts` — plan definitions and token math
- `artifacts/wizardry-ai/src/pages/` — all page components
- `artifacts/wizardry-ai/src/components/` — shared UI (NavSidebar, VerdictBadge, TokenWidget, ScoreGauge, etc.)
- `artifacts/wizardry-ai/src/index.css` — full dark cyber theme (deep navy + electric violet + cyan)

## Architecture decisions

- **Simulated auth**: All requests use `x-user-id: 1` header — no real session. Injected globally via `setDefaultHeaders()` in `main.tsx`. Production would swap this for a real auth token getter.
- **Token billing**: 3 tokens per scan round (`TOKENS_PER_ROUND = 3`). Plans: Free(3), Basic(250), Pro(1000), Advanced(3000), Enterprise(null/unlimited). Token limit enforced server-side on `/api/scans/analyze`.
- **Mock AI analysis**: `analyzeEngine()` in `scans.ts` uses seeded deterministic randomness per filename to produce consistent verdicts without real AI calls. Swap for real Gemini/ZAK API calls in production.
- **Enterprise paywall**: API Keys and Webhooks pages show a blur + `<PaywallOverlay>` for non-enterprise users.
- **Scorecard**: Computed on-the-fly in `stats.ts` from scan history — trust, accuracy, and activity sub-scores feed an overall grade (A+ → D).

## Product

- **Forensic Scanner**: Upload video or paste URL → select engine (Gemini 2.5 Flash/Pro, ZAK Global) + sensitivity → animated radar button → real-time verdict card with anomaly tags, confidence score, and token cost.
- **Mission Control (Dashboard)**: Stats grid (total/AI/authentic/uncertain), Intelligence Scorecard with animated SVG gauges, recent scans list, token widget.
- **Forensic Ledger (History)**: Filterable/searchable audit table of all scans with delete capability.
- **Notifications**: Prioritized alert feed with read/mark-all-read actions.
- **Settings**: Engine mode, sensitivity defaults, data privacy, notification preferences, security settings.
- **Identity & Billing Vault (Profile)**: User card, scorecard, token balance, and all 5 subscription plan cards with upgrade modal (PayPal sandbox simulation).
- **API Keys**: Enterprise-gated — API key generation, webhook endpoint registration, cURL sample.

## User preferences

- Brand is always "Wizardry AI" — never "Replit"
- Dark cyber theme is mandatory (deep navy background, electric violet primary, cyan accent)
- Token rate: 3 per scan round displayed prominently

## Gotchas

- `setDefaultHeaders({ "x-user-id": "1" })` must be called in `main.tsx` before QueryClient renders — it's module-level global state in `custom-fetch.ts`.
- After adding new routes to `routes/index.ts`, the API server must be **rebuilt** (restart workflow) — the `dev` script runs `build` then `start`, so hot-reload does not apply.
- The Vite frontend uses HMR and hot-updates immediately on file save.
- Orval generates into `lib/api-client-react/src/generated/` — never edit those files.
- DB push is safe in dev; always review the migration diff before running against production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
