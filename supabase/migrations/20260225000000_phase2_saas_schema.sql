-- ============================================================================
-- ALF PLATFORM — PHASE 2: SaaS Multi-Tenant Schema
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--
-- WHAT THIS DOES (additive only — nothing existing is altered):
--   - Creates 6 Alf platform tables (alf_ prefix)
--   - Creates 12 tenant-scoped tables (no prefix)
--   - Enables RLS on all 18 new tables
--   - Creates RLS policies for platform-only tables
--   - Seeds A&A as tenant #1
--   - Inserts platform config defaults
--
-- WHAT THIS DOES NOT DO (deferred to Phase 2b):
--   - Does NOT alter the profiles table (no tenant_id column yet)
--   - Does NOT rename existing roles (super-admin, admin, user stay as-is)
--   - Does NOT create tenant-scoped RLS policies (they require profiles.tenant_id)
--   - Does NOT touch any existing tables, columns, or constraints
--
-- WHY: A&A is a live tenant. Their existing portal, routes, components,
-- Supabase queries, and auth flow must continue working. Every change here
-- is additive — new tables only. Phase 2b will migrate profiles after
-- we verify nothing is broken.
--
-- Prerequisite: profiles table already exists with columns:
--   id, name, email, title, role, modules, active, created_at
-- Current role values: 'super-admin', 'admin', 'user'
-- ============================================================================


-- ============================================================================
-- 1. ALF_TENANTS
-- ============================================================================
-- Each row is a facility services company using the Alf platform.
-- A&A Elevated Facility Solutions is tenant #1.
-- Philip (platform_owner) will have tenant_id = NULL (set in Phase 2b).

CREATE TABLE alf_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,               -- URL-safe identifier, storage paths
    domain TEXT,                              -- optional: "aaefs.com"
    contact_email TEXT,
    contact_name TEXT,
    -- Subscription
    plan TEXT DEFAULT 'standard',             -- standard, premium, enterprise
    max_users INTEGER DEFAULT 25,
    max_agent_calls_per_month INTEGER DEFAULT 5000,
    -- Feature flags
    enabled_modules TEXT[] DEFAULT ARRAY[
        'hr', 'finance', 'ops', 'sales', 'purchasing', 'qbu', 'salesDeck'
    ],
    -- Branding
    logo_path TEXT,                           -- Supabase Storage path
    brand_colors JSONB,                       -- override default brand colors
    -- Status
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 2. ALF PLATFORM-ONLY TABLES
-- ============================================================================
-- Accessible only by platform_owner (Philip). Tenants never see these.

-- Global key-value config (model defaults, rate limits, feature flags)
CREATE TABLE alf_platform_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent definitions — source of truth for all agents across all tenants.
-- Replaces source-code configs as canonical store (Phase 3+ reads from here).
CREATE TABLE alf_agent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key TEXT UNIQUE NOT NULL,           -- "hr", "finance", "qbu", etc.
    name TEXT NOT NULL,                       -- "HR Agent"
    department TEXT NOT NULL,                 -- "hr", "finance", "tools"
    system_prompt TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    status TEXT DEFAULT 'active',             -- active, setup, disabled
    actions JSONB NOT NULL,                   -- action configs array
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template files (QBU .pptx template, sales deck template)
CREATE TABLE alf_platform_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_type TEXT NOT NULL,              -- "qbu", "sales_deck"
    file_path TEXT NOT NULL,                  -- Supabase Storage path
    skill_file TEXT,                          -- SKILL.md content
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Default brand assets (logos, color palettes, governance docs)
CREATE TABLE alf_platform_brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_path TEXT,
    content JSONB,                            -- for JSON assets like colors
    asset_type TEXT NOT NULL,                 -- "logo", "colors", "governance"
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking — written by backend proxy, read by platform_owner
CREATE TABLE alf_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES alf_tenants(id),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,                     -- "agent_call", "qbu_generate", "deck_download"
    agent_key TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for usage queries by tenant and time
CREATE INDEX idx_alf_usage_logs_tenant_created ON alf_usage_logs(tenant_id, created_at DESC);
CREATE INDEX idx_alf_usage_logs_created ON alf_usage_logs(created_at DESC);


-- ============================================================================
-- 3. ALTER PROFILES — DEFERRED TO PHASE 2b
-- ============================================================================
-- The following changes are NOT included in this migration to avoid breaking
-- A&A's live portal. They will be applied in Phase 2b after verifying all
-- new tables are in place and nothing is broken:
--
--   ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES alf_tenants(id);
--   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
--   -- Role migration (super-admin→platform_owner/admin, admin→manager)
--   ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
--       CHECK (role IN ('platform_owner', 'admin', 'manager', 'user'));
--
-- Until Phase 2b runs:
--   - profiles has no tenant_id column
--   - roles remain: 'super-admin', 'admin', 'user'
--   - all existing queries, components, and auth continue working unchanged


-- ============================================================================
-- 4. TENANT-SCOPED TABLES
-- ============================================================================
-- Every table below has a tenant_id column referencing alf_tenants for isolation.
-- These tables are NEW — no existing portal code references them.

-- Sites / locations within a tenant's portfolio
CREATE TABLE tenant_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    site_name TEXT NOT NULL,
    job_name TEXT,
    job_number TEXT,
    address TEXT,
    sq_footage TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Client contacts (for QBU intro slides and attendees)
CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    site_id UUID REFERENCES tenant_sites(id),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    email TEXT,
    is_qbu_attendee BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Tenant-level agent customization (limited — cannot change core prompt or model)
CREATE TABLE tenant_agent_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    agent_key TEXT NOT NULL,
    custom_prompt_additions TEXT,             -- appended to system prompt, not a replacement
    custom_action_templates JSONB,            -- simple template overrides only
    is_enabled BOOLEAN DEFAULT true,          -- tenant can disable agents they don't use
    UNIQUE(tenant_id, agent_key)
);

-- QBU submissions (replaces localStorage history)
CREATE TABLE qbu_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    site_id UUID REFERENCES tenant_sites(id),
    quarter TEXT NOT NULL,                    -- "Q1", "Q2", "Q3", "Q4"
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','in_progress','submitted','generating','review','approved','delivered')),
    submitted_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- QBU section data (one row per section per submission)
CREATE TABLE qbu_intake_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES qbu_submissions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),  -- denormalized for RLS
    section TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(submission_id, section)
);

-- QBU photos
CREATE TABLE qbu_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES qbu_submissions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    file_path TEXT NOT NULL,                  -- Supabase Storage path
    caption TEXT,
    site_name TEXT,
    category TEXT,                            -- "project", "event", "grounds", "innovation"
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- QBU testimonials
CREATE TABLE qbu_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES qbu_submissions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    site_name TEXT NOT NULL,
    quote TEXT NOT NULL,
    attributed_to TEXT NOT NULL,
    source TEXT,                              -- "email", "meeting", "text"
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Generated decks (QBU and sales decks)
CREATE TABLE generated_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES qbu_submissions(id),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    deck_type TEXT NOT NULL DEFAULT 'qbu',    -- "qbu", "sales_deck"
    file_path TEXT NOT NULL,                  -- Supabase Storage path
    version INTEGER DEFAULT 1,
    generated_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id)
);

-- Department data tables (replace src/data/mock/ with real tenant-scoped data)

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    client_name TEXT NOT NULL,
    contract_number TEXT,
    contract_value NUMERIC,
    start_date DATE,
    end_date DATE,
    status TEXT,
    renewal_status TEXT,
    region TEXT,
    assigned_vp TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ar_aging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    client_name TEXT NOT NULL,
    site_id UUID REFERENCES tenant_sites(id),
    total_outstanding NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    days_30 NUMERIC DEFAULT 0,
    days_60 NUMERIC DEFAULT 0,
    days_90 NUMERIC DEFAULT 0,
    days_91_plus NUMERIC DEFAULT 0,
    last_payment_date DATE,
    as_of_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE benefits_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    employee_name TEXT NOT NULL,
    hire_date DATE,
    eligible_date DATE,
    status TEXT,                              -- waiting_period, pending, submitted, completed
    site_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vp_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
    vp_name TEXT NOT NULL,
    region TEXT,
    job_count INTEGER,
    safety_inspection_rate NUMERIC,
    commercial_inspection_rate NUMERIC,
    deficiencies INTEGER,
    incidents INTEGER,
    avg_closure_days NUMERIC,
    period TEXT,                              -- "Q4 2025"
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 5. ENABLE RLS ON ALL NEW TABLES
-- ============================================================================
-- RLS enabled with no policies = zero access for authenticated users.
-- Only service key (backend proxy) can read/write. This is the correct
-- safe default until Phase 2b adds tenant-aware policies.

-- Alf platform tables
ALTER TABLE alf_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE alf_platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE alf_agent_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alf_platform_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE alf_platform_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE alf_usage_logs ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped tables
ALTER TABLE tenant_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_agent_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbu_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbu_intake_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbu_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbu_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vp_performance ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- -------------------------------------------------------
-- 6a. PLATFORM-ONLY TABLES — only platform_owner can CRUD
-- -------------------------------------------------------
-- NOTE: Nobody has role='platform_owner' yet (Philip is still 'super-admin').
-- These policies will activate when Phase 2b migrates roles.
-- Until then, RLS blocks all authenticated access — service key still works.
-- This is the CORRECT locked-down default for platform tables.

-- alf_platform_config
CREATE POLICY alf_platform_config_all ON alf_platform_config FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);

-- alf_agent_definitions
CREATE POLICY alf_agent_definitions_all ON alf_agent_definitions FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);

-- alf_platform_templates
CREATE POLICY alf_platform_templates_all ON alf_platform_templates FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);

-- alf_platform_brand_assets
CREATE POLICY alf_platform_brand_assets_all ON alf_platform_brand_assets FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);

-- alf_usage_logs — platform_owner reads; backend proxy writes via service key
CREATE POLICY alf_usage_logs_select ON alf_usage_logs FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);

-- alf_tenants — platform_owner has full access
CREATE POLICY alf_tenants_platform_all ON alf_tenants FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);

-- alf_tenants — tenant users read their OWN tenant row (for company name display)
-- NOTE: This policy references profiles.tenant_id which doesn't exist yet.
-- DEFERRED TO PHASE 2b. Until then, only service key can read alf_tenants.
-- CREATE POLICY alf_tenants_read_own ON alf_tenants FOR SELECT USING (
--     id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
-- );

-- -------------------------------------------------------
-- 6b. PROFILES — NOT TOUCHED
-- -------------------------------------------------------
-- Existing profiles RLS policies (if any) remain unchanged.
-- New tenant-aware profiles policies will be created in Phase 2b.

-- -------------------------------------------------------
-- 6c. TENANT-SCOPED TABLES — DEFERRED TO PHASE 2b
-- -------------------------------------------------------
-- The standard tenant isolation policy pattern is:
--
--   CREATE POLICY {table}_select ON {table} FOR SELECT USING (
--       tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
--       OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
--   );
--
-- This CANNOT be created yet because profiles.tenant_id does not exist.
-- PostgreSQL validates policy expressions at CREATE POLICY time, so
-- referencing a non-existent column would fail.
--
-- RLS is enabled on all tables (step 5 above), which means:
--   - Authenticated users: ZERO access (no policies = no rows)
--   - Service key (backend proxy): FULL access (bypasses RLS)
--
-- This is the correct safe default. Phase 2b will:
--   1. Add profiles.tenant_id column
--   2. Migrate roles
--   3. Create all tenant-scoped RLS policies
--   4. Create the alf_tenants_read_own policy


-- ============================================================================
-- 7. SEED A&A AS TENANT #1
-- ============================================================================
-- A&A Elevated Facility Solutions — first company on the Alf platform.
-- Their existing portal users will be linked to this tenant in Phase 2b.

INSERT INTO alf_tenants (company_name, slug, domain, contact_email, contact_name, plan, enabled_modules)
VALUES (
    'A&A Elevated Facility Solutions',
    'aaefs',
    'aaefs.com',
    'philip@aaefs.com',
    'Philip Marzullo',
    'enterprise',
    ARRAY['hr', 'finance', 'ops', 'sales', 'purchasing', 'qbu', 'salesDeck']
);


-- ============================================================================
-- 8. MIGRATE EXISTING USERS — DEFERRED TO PHASE 2b
-- ============================================================================
-- The following will be done in Phase 2b after verifying new tables are stable:
--
--   -- Add tenant_id to profiles
--   ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES alf_tenants(id);
--
--   -- Drop old role constraint
--   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
--
--   -- Park old admins at temp value (they become managers)
--   UPDATE profiles SET role = '_temp_manager' WHERE role = 'admin';
--   -- All super-admins become the new admin (highest tenant role)
--   UPDATE profiles SET role = 'admin' WHERE role = 'super-admin';
--   -- Move parked temp values to manager
--   UPDATE profiles SET role = 'manager' WHERE role = '_temp_manager';
--   -- Platform owner — phil@sganow.com (separate from any A&A account)
--   UPDATE profiles SET role = 'platform_owner', tenant_id = NULL
--   WHERE email = 'phil@sganow.com';
--
--   -- New role constraint
--   ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
--       CHECK (role IN ('platform_owner', 'admin', 'manager', 'user'));
--
--   -- Assign all tenant users to A&A
--   UPDATE profiles
--   SET tenant_id = (SELECT id FROM alf_tenants WHERE slug = 'aaefs')
--   WHERE role != 'platform_owner' AND tenant_id IS NULL;
--
--   -- Create tenant-scoped RLS policies (all 12 tables × 4 operations)
--   -- Create alf_tenants_read_own policy
--   -- Create/update profiles RLS policies


-- ============================================================================
-- 9. ALF PLATFORM CONFIG DEFAULTS
-- ============================================================================

INSERT INTO alf_platform_config (key, value) VALUES
    ('default_model', '"claude-sonnet-4-5-20250929"'),
    ('default_max_tokens', '8192'),
    ('rate_limit_per_tenant_per_hour', '50');


-- ============================================================================
-- DONE — PHASE 2 COMPLETE
-- ============================================================================
-- Summary of what was created:
--
--   NEW TABLES (18):
--     Platform (alf_ prefix):
--       1. alf_tenants
--       2. alf_platform_config
--       3. alf_agent_definitions
--       4. alf_platform_templates
--       5. alf_platform_brand_assets
--       6. alf_usage_logs
--     Tenant-scoped (no prefix):
--       7. tenant_sites
--       8. client_contacts
--       9. tenant_agent_overrides
--      10. qbu_submissions
--      11. qbu_intake_data
--      12. qbu_photos
--      13. qbu_testimonials
--      14. generated_decks
--      15. contracts
--      16. ar_aging
--      17. benefits_enrollments
--      18. vp_performance
--
--   RLS: Enabled on all 18 tables
--   RLS POLICIES: 6 platform-only policies created
--   SEED: A&A seeded as tenant #1 in alf_tenants
--   CONFIG: 3 platform config defaults set
--
--   EXISTING TABLES TOUCHED: NONE
--   EXISTING QUERIES BROKEN: NONE
--
--   DEFERRED TO PHASE 2b:
--     - profiles.tenant_id column
--     - Role migration (super-admin→platform_owner/admin, admin→manager)
--     - 48+ tenant-scoped RLS policies (12 tables × 4 operations)
--     - alf_tenants_read_own policy
--     - profiles RLS policy updates
-- ============================================================================
