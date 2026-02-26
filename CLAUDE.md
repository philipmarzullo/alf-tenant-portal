# Alf Platform — Claude Code Context

> This is the platform-level CLAUDE.md for the Alf codebase. It governs all work in this repo.

## What is Alf?

Alf is a managed SaaS platform for facility services operations. It provisions tenant organizations with workspace modules, AI agents, and operational tools. A&A Elevated Facility Solutions is the first (and currently only) tenant.

**Key principle:** Alf is the platform. A&A is a tenant. They are never the same thing.

## Deployment Model

This single codebase serves two contexts:

| Context | URL | Who sees it | Branding |
|---------|-----|-------------|----------|
| **A&A's portal** | https://aa-portal-08cq.onrender.com/ | A&A users + Philip | A&A — aa-blue, A&A logo, dark-nav bg |
| **Alf platform admin** | http://localhost:5173/ | Philip only | Alf — amber, warm tones, Alf logo |

**The Render deploy IS A&A's world.** Everything there — including auth pages — is A&A branded. Alf branding only appears on localhost.

**Future:** Each tenant gets its own deploy and URL. Alf gets its own deploy. Alf dictates tenant URLs, API connections, agent configs, and module assignments from its own admin interface.

## Platform Governance Rules

1. **Alf controls all API keys and credentials** — stored encrypted, managed per tenant via the platform admin
2. **Alf designs, builds, maintains, and trains all AI agents** — tenants use agents but never configure them
3. **Alf decides which modules each tenant gets** — module assignment is a platform decision, not tenant self-serve
4. **Tenants never see Alf branding** — on tenant deploys (like Render), zero Alf references

## File Ownership (CRITICAL)

### Tenant-facing files (A&A branded on Render — DO NOT add Alf branding)
- `src/pages/auth/*` — login, forgot password, reset password (A&A branded)
- `src/pages/Dashboard.jsx`
- `src/pages/hr/*`, `src/pages/sales/*`, `src/pages/finance/*`, `src/pages/ops/*`, `src/pages/purchasing/*`
- `src/pages/tools/*` (QBUBuilder, SalesDeckBuilder)
- `src/pages/admin/*` (UserManagement, AgentManagement, Settings)
- `src/components/shared/AgentChatPanel.jsx`
- `src/components/admin/AgentCard.jsx`
- `src/components/layout/TopBar.jsx`
- `src/agents/configs/*`
- `index.html` — favicon, page title, meta tags (visible to all users in browser tab)
- `public/*` — assets served without auth

### Platform-owner files (Alf branded, localhost only)
- `src/pages/platform/*` — all platform admin pages
- `src/components/shared/AlfIcon.jsx`

### Shared files (modify with care — use `isPlatformOwner` conditionals)
- `src/components/layout/Sidebar.jsx` — uses `isPlatformOwner` for Alf styling post-login
- `src/index.css` — theme variables
- `src/App.jsx`

## Color & Branding Reference

| Context | Color | Usage |
|---------|-------|-------|
| A&A tenant (Render) | `aa-blue` (#009ADE) | Buttons, accents, focus rings, auth pages |
| A&A backgrounds | `dark-nav` (#1B2133) | Auth page bg, sidebar bg |
| Alf platform (localhost) | `amber-*` (Tailwind palette) | Buttons, accents, badges |
| Alf platform hex | `#F59E0B` (amber-500) | Primary Alf color |
| Alf sidebar bg | `dark-nav-warm` (#231A12) | Warm tone, localhost only |

### Key Conditional Pattern
```jsx
isPlatformOwner ? 'amber/warm styling' : 'aa-blue/standard styling'
```

This conditional handles the edge case where Philip logs into A&A's deploy as platform owner. Post-login sidebar is the only place Alf styling appears on Render.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Express (Node.js)
- **Database & Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Deployment:** Render (A&A), localhost (Alf admin)

## Voice & Tone

- **Tenant-facing (A&A):** Follow A&A brand voice from parent CLAUDE.md — friendly, confident, concrete
- **Platform admin (Alf):** Direct, technical, clear. Warmer informal tone ("Melmac" personality). No marketing language.
- Reference specific tools and systems by name (AA360, Lighthouse, TMA)

## Working Style

- Plan before building — specs and architecture first
- Always verify builds before pushing
- Commit messages: concise, explain "why" not "what"
- Before committing: "Will an A&A user see Alf branding?" If yes, stop.
