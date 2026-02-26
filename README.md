# Alf Platform

Alf is a managed SaaS platform for facility services operations. It provides tenant organizations with workspace modules, AI agents, and operational tools — all centrally managed by the Alf platform team.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Express (Node.js)
- **Database & Auth:** Supabase (PostgreSQL + Auth + Row-Level Security)
- **Deployment:** Render

## Architecture

Alf follows a **platform → tenant** model:

- **Alf (platform)** controls all configuration: API keys, agent definitions, module assignments, and tenant provisioning
- **Tenants** (e.g., A&A Elevated Facility Solutions) are customer organizations that access their own branded workspace
- Tenant users never see Alf branding — the platform layer is invisible to them

### Governance Model

- Alf controls all API keys and credentials per tenant
- Alf designs, builds, maintains, and trains all AI agents per tenant
- Alf decides which modules each tenant gets — managed service, not self-serve
- Tenants interact with their workspace; Alf manages everything behind the scenes

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project with auth and database configured

### Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Create environment files
cp .env.example .env.local          # Frontend (Vite)
cp backend/.env.example backend/.env # Backend
```

Required environment variables:

**Frontend (`.env.local`)**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (`backend/.env`)**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
ANTHROPIC_API_KEY=your-anthropic-key
CREDENTIAL_ENCRYPTION_KEY=your-encryption-key
FRONTEND_URL=http://localhost:5173
```

### Running

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — Backend
cd backend && npm run dev
```

## Project Structure

```
├── src/
│   ├── pages/
│   │   ├── platform/     # Platform-owner pages (Alf admin)
│   │   ├── auth/         # Login, forgot/reset password
│   │   ├── admin/        # Tenant admin pages
│   │   ├── hr/           # HR workspace
│   │   ├── sales/        # Sales workspace
│   │   ├── finance/      # Finance workspace
│   │   ├── ops/          # Operations workspace
│   │   ├── purchasing/   # Purchasing workspace
│   │   └── tools/        # QBU Builder, Sales Deck Builder
│   ├── components/
│   │   ├── layout/       # Sidebar, TopBar, PageWrapper
│   │   └── shared/       # Reusable components
│   ├── contexts/         # Auth, User, Tenant contexts
│   └── agents/           # Agent configs and chat components
├── backend/
│   └── src/
│       ├── server.js     # Express server entry
│       ├── routes/       # API routes (claude, credentials)
│       └── middleware/    # Auth middleware
└── public/               # Static assets (logos, templates)
```
