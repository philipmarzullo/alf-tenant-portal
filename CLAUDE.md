# Alf Platform — Claude Code Context

> This is the platform-level CLAUDE.md for the Alf codebase. It governs all work in this repo.

## What is Alf?

Alf is a managed SaaS platform for facility services operations. It provisions tenant organizations with workspace modules, AI agents, and operational tools. A&A Elevated Facility Solutions is the first (and currently only) tenant.

**Key principle:** Alf is the platform. A&A is a tenant. They are never the same thing.

## Platform Governance Rules

These rules define how Alf operates as a managed service:

1. **Alf controls all API keys and credentials** — stored encrypted, managed per tenant via the platform admin
2. **Alf designs, builds, maintains, and trains all AI agents** — tenants use agents but never configure them
3. **Alf decides which modules each tenant gets** — module assignment is a platform decision, not tenant self-serve
4. **Tenants never see Alf branding** — the platform layer is invisible to tenant users (future: separate deploys per tenant)

## Tenant Boundary Rules (CRITICAL)

### NEVER modify tenant-facing files when working on Alf platform features

**Tenant-facing files (DO NOT TOUCH for platform changes):**
- `src/pages/Dashboard.jsx`
- `src/pages/hr/*`, `src/pages/sales/*`, `src/pages/finance/*`, `src/pages/ops/*`, `src/pages/purchasing/*`
- `src/pages/tools/*` (QBUBuilder, SalesDeckBuilder)
- `src/pages/admin/*` (UserManagement, AgentManagement, Settings)
- `src/components/shared/AgentChatPanel.jsx`
- `src/components/admin/AgentCard.jsx`
- `src/components/layout/TopBar.jsx`
- `src/agents/configs/*`

**Platform-owner files (safe to modify for Alf features):**
- `src/pages/platform/*` — all platform admin pages
- `src/pages/auth/*` — login/auth pages (Alf-branded, correct for now)
- Sidebar conditional blocks gated by `isPlatformOwner`
- `src/components/shared/AlfIcon.jsx`

**Shared files (modify with care — use `isPlatformOwner` conditionals):**
- `src/components/layout/Sidebar.jsx`
- `src/index.css` — theme variables
- `src/App.jsx` — pre-auth screens use conditionals

## Color & Branding Reference

| Context | Color | Usage |
|---------|-------|-------|
| Alf platform | `amber-*` (Tailwind palette) | Buttons, accents, badges |
| Alf platform hex | `#F59E0B` (amber-500) | Primary Alf color |
| A&A tenant | `aa-blue` (#009ADE) | Buttons, accents, focus rings |
| Platform sidebar bg | `dark-nav-warm` (#231A12) | Warm tone for Alf |
| Tenant sidebar bg | `dark-nav` (#1B2133) | Standard dark nav |

### Key Conditional Pattern
```jsx
isPlatformOwner ? 'amber/warm styling' : 'aa-blue/standard styling'
```

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Express (Node.js)
- **Database & Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Deployment:** Render

## Voice & Tone (Platform Content)

- Direct, technical, clear
- No marketing language — this is internal operational software
- Reference specific tools and systems by name (AA360, Lighthouse, TMA)
- Alf-specific content uses a warmer, slightly informal tone (the "Melmac" personality)
- Tenant-facing content follows the tenant's own brand voice (see parent CLAUDE.md for A&A voice)

## Working Style

- Plan before building — specs and architecture first
- Always verify builds before pushing
- Commit messages: concise, explain "why" not "what"
- Respect the tenant boundary — when in doubt, don't touch tenant files
