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

## Env Vars

```
VITE_SUPABASE_URL=...              # Supabase project URL
VITE_SUPABASE_ANON_KEY=...         # Supabase public anon key
VITE_BACKEND_URL=https://alfpro.ai # Alf backend for agent calls
VITE_TENANT_ID=<uuid>              # This tenant's ID from alf_tenants
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
