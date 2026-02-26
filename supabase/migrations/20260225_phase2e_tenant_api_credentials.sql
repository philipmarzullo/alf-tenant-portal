-- ============================================================================
-- ALF PLATFORM — PHASE 2e: Tenant API Credential Management
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--
-- WHAT THIS DOES:
--   1. Creates tenant_api_credentials table for storing encrypted API keys
--   2. Adds RLS policies so super-admin can manage credentials
--
-- SECURITY MODEL:
--   - Keys are encrypted with AES-256-GCM in the backend (Node.js crypto)
--   - The database only stores encrypted blobs — never plaintext
--   - Encryption key lives only in backend env (CREDENTIAL_ENCRYPTION_KEY)
--   - key_hint stores last 4 chars for display purposes
--   - One active credential per (tenant, service_type)
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS and DROP POLICY IF EXISTS.
-- ============================================================================


-- ============================================================================
-- 1. TABLE: tenant_api_credentials
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,              -- 'anthropic', 'snowflake', etc.
    credential_label TEXT,                   -- e.g., "Production Key"
    encrypted_key TEXT NOT NULL,             -- AES-256-GCM encrypted, base64
    key_hint TEXT,                           -- last 4 chars for display
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, service_type)
);

-- Enable RLS
ALTER TABLE tenant_api_credentials ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. RLS POLICIES: super-admin full access
-- ============================================================================
-- Primary access control is the backend route (platform admin check).
-- RLS is defense-in-depth — the backend uses a service key, but if
-- anyone queries Supabase directly, only super-admin can see credentials.

DROP POLICY IF EXISTS tenant_api_credentials_superadmin_all ON tenant_api_credentials;
CREATE POLICY tenant_api_credentials_superadmin_all ON tenant_api_credentials FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);

-- Platform owner (future role) also gets full access
DROP POLICY IF EXISTS tenant_api_credentials_platform_owner_all ON tenant_api_credentials;
CREATE POLICY tenant_api_credentials_platform_owner_all ON tenant_api_credentials FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
);


-- ============================================================================
-- DONE — PHASE 2e TABLE READY
-- ============================================================================
-- After running this:
--   - tenant_api_credentials table exists with RLS enabled
--   - super-admin and platform_owner can CRUD via RLS
--
-- To verify:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'tenant_api_credentials' ORDER BY ordinal_position;
-- ============================================================================
