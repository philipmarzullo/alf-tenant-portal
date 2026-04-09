# Alf Tenant Portal — Claude Code Context

> This is the tenant portal repo. It contains ZERO platform admin code. The Alf platform lives in a separate repo (alf-platform).

## What Is This Repo?

This is the tenant-facing portal for facility services operations. Each tenant (starting with A&A Elevated Facility Solutions) gets their own deploy of this codebase, configured via environment variables.

**Key principle:** This repo is 100% tenant experience. No Alf branding, no platform admin pages, no isPlatformOwner logic.

## Architecture

| Component | Where |
|-----------|-------|
| **This repo** | Tenant UI — React + Vite static build |
| **alf-platform repo** | Platform admin + backend API (separate repo) |
| **Supabase** | Shared database — both repos connect to same instance |

The tenant portal has no backend. It calls the alf-platform backend via `VITE_BACKEND_URL` for agent API calls.

## Deployment Modes

This repo supports two deployment modes from the same codebase:

| Mode | `VITE_TENANT_ID` | Behavior |
|------|-------------------|----------|
| **Standalone** (A&A) | Set to tenant UUID | Branding loads pre-auth; login page shows tenant brand |
| **Unified portal** (`portal.alfpro.ai`) | Not set | Login page shows Alf branding (AlfMark + orange accent); tenant resolved post-auth from user profile |

**Unified portal flow:** Login → session → UserContext fetches profile → `setTenantId(profile.tenant_id)` → BrandingContext & TenantPortalProvider refetch with resolved tenant → portal renders with full tenant branding.

## Env Vars

```
VITE_SUPABASE_URL=...              # Supabase project URL
VITE_SUPABASE_ANON_KEY=...         # Supabase public anon key
VITE_BACKEND_URL=https://alfpro.ai # Alf backend for agent calls
VITE_TENANT_ID=<uuid>              # (Optional) Tenant ID — omit for unified portal mode
```

## File Ownership

**Everything in this repo is tenant-facing. There are no platform-owner files.**

- `src/pages/auth/*` — Login, forgot password, reset password (tenant-branded)
- `src/pages/Dashboard.jsx` — Tenant dashboard
- `src/pages/hr/*`, `src/pages/finance/*`, `src/pages/sales/*`, `src/pages/ops/*`, `src/pages/purchasing/*` — Workspace pages
- `src/pages/tools/*` — QBU Builder, Sales Deck Builder
- `src/pages/admin/*` — User Management, Agent Management, Settings
- `src/components/` — Shared UI components (no Alf branding)
- `src/agents/` — Agent configs, registry, API calls
- `src/contexts/` — Auth and User contexts (no isPlatformOwner)

## Branding (A&A — current tenant)

| Element | Value |
|---------|-------|
| Primary color | `aa-blue` (#009ADE) |
| Background | `dark-nav` (#1B2133) |
| Logo (dark bg) | `/logo-white.png` |
| Logo (light bg) | `/logo-color.png` |
| Auth page subtitle | "A&A Operations Portal" |

## Things That Do NOT Exist In This Repo

- No `isPlatformOwner` conditionals
- No `src/pages/platform/` directory
- No `AlfIcon.jsx` component
- No `alf-logo.jpg` asset
- No `backend/` directory
- No amber/warm Alf styling
- No platform nav items in sidebar

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Database & Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Deployment:** Render (static site)

## Working Style

- Plan before building — specs and architecture first
- Always verify builds before pushing
- Commit messages: concise, explain "why" not "what"
- Before committing: "Does any Alf branding appear?" If yes, stop.

## Live Snowflake Data in the UI

Any page that displays Snowflake-derived data must feel live without the
user having to click a refresh button.

- **Auto-trigger a refresh on mount.** Fire `validateWorkStatus({ maxAgeMinutes: 5 })`
  (for wc_claims) or rely on `SyncHealthBanner`'s `/run-if-stale` flow
  (for sync-backed dashboards). Do NOT block the initial render — let
  the page paint with whatever data it has, then update silently when
  the refresh resolves.
- **Show a subtle "updating" indicator.** Pulse an icon or use a small
  banner while the background refresh runs. See `ClaimTracker.jsx` for
  the `ShieldCheck` pulse pattern and `SyncHealthBanner.jsx` for the
  dashboard banner pattern.
- **Listen for the refresh event.** Hooks that fetch sync-backed data
  should subscribe to the `SYNC_REFRESHED_EVENT` window event (see
  `useDashboardData.js` / `useDynamicMetrics.js`) so they re-pull when
  `SyncHealthBanner` signals a completed background refresh.
- **Surface last-checked timestamps.** Every dot, chart, or number
  derived from Snowflake should have a visible "Checked X ago" hint
  somewhere nearby — see `ValidationDot.jsx` for the reference
  implementation.
