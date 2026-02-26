-- ============================================================================
-- ALF PLATFORM — PHASE 2b: Profiles Migration + Tenant-Scoped RLS
-- ============================================================================
-- Run this in the Supabase SQL Editor AFTER Phase 2 has been verified.
--
-- PREREQUISITE: Phase 2 migration has been run successfully. The following
-- tables must already exist:
--   alf_tenants (with A&A seeded as tenant #1)
--   alf_platform_config, alf_agent_definitions, alf_platform_templates,
--   alf_platform_brand_assets, alf_usage_logs
--   tenant_sites, client_contacts, tenant_agent_overrides,
--   qbu_submissions, qbu_intake_data, qbu_photos, qbu_testimonials,
--   generated_decks, contracts, ar_aging, benefits_enrollments, vp_performance
--
-- WHAT THIS DOES:
--   1. Adds tenant_id column to profiles (nullable FK to alf_tenants)
--   2. Migrates roles: super-admin → platform_owner/admin, admin → manager
--   3. Updates role constraint to new values
--   4. Assigns all tenant users to A&A (tenant #1)
--   5. Creates tenant-scoped RLS policies on all 12 tenant tables
--   6. Creates alf_tenants_read_own policy
--   7. Creates/updates profiles RLS policies
--
-- ROLLBACK NOTE: If anything goes wrong, the transaction can be rolled back.
-- Wrap in BEGIN/COMMIT if running manually.
-- ============================================================================


-- ============================================================================
-- 1. ADD tenant_id TO PROFILES
-- ============================================================================
-- Nullable because platform_owner (Philip) has tenant_id = NULL.
-- All existing users get assigned to A&A in step 4.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES alf_tenants(id);


-- ============================================================================
-- 2. MIGRATE ROLES
-- ============================================================================
-- Current values: 'super-admin', 'admin', 'user'
-- Target values:  'platform_owner', 'admin', 'manager', 'user'
--
-- The tricky part: old 'admin' becomes 'manager', but new 'admin' comes from
-- old 'super-admin'. We use a temp value to avoid collision.
--
-- CRITICAL: Drop the old CHECK constraint FIRST. The old constraint only
-- allows ('super-admin', 'admin', 'user') and would reject the new values.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 1: Park old admins at a temp value (they become managers).
-- Must happen BEFORE super-admin→admin, otherwise we can't distinguish
-- old admins from newly-promoted admins.
UPDATE profiles SET role = '_temp_manager' WHERE role = 'admin';

-- Step 2: ALL super-admins become the new admin (highest tenant role).
-- Every super-admin is an A&A tenant user. None become platform_owner here.
UPDATE profiles SET role = 'admin' WHERE role = 'super-admin';

-- Step 3: Move parked temp values to manager.
UPDATE profiles SET role = 'manager' WHERE role = '_temp_manager';

-- 'user' stays 'user' — no update needed.

-- Step 4: Set platform_owner — Philip's identity is phil@sganow.com,
-- completely separate from any A&A tenant account.
-- If this profile exists, promote it. If not, no rows are affected —
-- Philip will sign up with phil@sganow.com and be promoted manually.
UPDATE profiles SET role = 'platform_owner', tenant_id = NULL
WHERE email = 'phil@sganow.com';

-- Step 5: Add the new constraint with final role set.
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('platform_owner', 'admin', 'manager', 'user'));


-- ============================================================================
-- 3. ASSIGN ALL TENANT USERS TO A&A
-- ============================================================================
-- Every non-platform_owner user is an A&A employee (tenant #1).
-- Future tenants will have users inserted with their own tenant_id.

UPDATE profiles
SET tenant_id = (SELECT id FROM alf_tenants WHERE slug = 'aaefs')
WHERE role != 'platform_owner'
  AND tenant_id IS NULL;


-- ============================================================================
-- 4. PROFILES RLS POLICIES
-- ============================================================================
-- Drop any existing profiles policies to avoid conflicts, then create new ones.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;
-- Drop any legacy policy names that may exist
DROP POLICY IF EXISTS profiles_tenant ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- SELECT: see your tenant's users, always see yourself, platform_owner sees all
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
    id = auth.uid()
    OR tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- UPDATE: admins can update users in their tenant; users can update themselves;
-- platform_owner can update anyone
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
    id = auth.uid()
    OR (
        (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'admin'
        AND tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    )
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- INSERT: platform_owner or admin within their tenant
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
    (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
    OR (
        (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'admin'
        AND tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    )
);

-- DELETE: platform_owner only (tenants deactivate users, not delete)
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
    (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);


-- ============================================================================
-- 5. ALF_TENANTS — TENANT READ-OWN POLICY
-- ============================================================================
-- Tenant users can read their OWN tenant row (for company name, logo, etc.).
-- Platform_owner already has full access via alf_tenants_platform_all (Phase 2).

CREATE POLICY alf_tenants_read_own ON alf_tenants FOR SELECT USING (
    id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
);


-- ============================================================================
-- 6. TENANT-SCOPED RLS POLICIES
-- ============================================================================
-- Standard isolation pattern for all 12 tenant-scoped tables:
--   - Tenant users see/modify only rows matching their tenant_id
--   - Platform owner sees/modifies all rows
--
-- Each table gets SELECT, INSERT, UPDATE, DELETE policies.

-- -------------------------------------------------------
-- tenant_sites
-- -------------------------------------------------------
CREATE POLICY tenant_sites_select ON tenant_sites FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY tenant_sites_insert ON tenant_sites FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY tenant_sites_update ON tenant_sites FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY tenant_sites_delete ON tenant_sites FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- client_contacts
-- -------------------------------------------------------
CREATE POLICY client_contacts_select ON client_contacts FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY client_contacts_insert ON client_contacts FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY client_contacts_update ON client_contacts FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY client_contacts_delete ON client_contacts FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- tenant_agent_overrides
-- -------------------------------------------------------
CREATE POLICY tenant_agent_overrides_select ON tenant_agent_overrides FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY tenant_agent_overrides_insert ON tenant_agent_overrides FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY tenant_agent_overrides_update ON tenant_agent_overrides FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY tenant_agent_overrides_delete ON tenant_agent_overrides FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- qbu_submissions
-- -------------------------------------------------------
CREATE POLICY qbu_submissions_select ON qbu_submissions FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_submissions_insert ON qbu_submissions FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_submissions_update ON qbu_submissions FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_submissions_delete ON qbu_submissions FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- qbu_intake_data
-- -------------------------------------------------------
CREATE POLICY qbu_intake_data_select ON qbu_intake_data FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_intake_data_insert ON qbu_intake_data FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_intake_data_update ON qbu_intake_data FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_intake_data_delete ON qbu_intake_data FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- qbu_photos
-- -------------------------------------------------------
CREATE POLICY qbu_photos_select ON qbu_photos FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_photos_insert ON qbu_photos FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_photos_update ON qbu_photos FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_photos_delete ON qbu_photos FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- qbu_testimonials
-- -------------------------------------------------------
CREATE POLICY qbu_testimonials_select ON qbu_testimonials FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_testimonials_insert ON qbu_testimonials FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_testimonials_update ON qbu_testimonials FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY qbu_testimonials_delete ON qbu_testimonials FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- generated_decks
-- -------------------------------------------------------
CREATE POLICY generated_decks_select ON generated_decks FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY generated_decks_insert ON generated_decks FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY generated_decks_update ON generated_decks FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY generated_decks_delete ON generated_decks FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- contracts
-- -------------------------------------------------------
CREATE POLICY contracts_select ON contracts FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY contracts_insert ON contracts FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY contracts_update ON contracts FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY contracts_delete ON contracts FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- ar_aging
-- -------------------------------------------------------
CREATE POLICY ar_aging_select ON ar_aging FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY ar_aging_insert ON ar_aging FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY ar_aging_update ON ar_aging FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY ar_aging_delete ON ar_aging FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- benefits_enrollments
-- -------------------------------------------------------
CREATE POLICY benefits_enrollments_select ON benefits_enrollments FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY benefits_enrollments_insert ON benefits_enrollments FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY benefits_enrollments_update ON benefits_enrollments FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY benefits_enrollments_delete ON benefits_enrollments FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);

-- -------------------------------------------------------
-- vp_performance
-- -------------------------------------------------------
CREATE POLICY vp_performance_select ON vp_performance FOR SELECT USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY vp_performance_insert ON vp_performance FOR INSERT WITH CHECK (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY vp_performance_update ON vp_performance FOR UPDATE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);
CREATE POLICY vp_performance_delete ON vp_performance FOR DELETE USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) = 'platform_owner'
);


-- ============================================================================
-- DONE — PHASE 2b COMPLETE
-- ============================================================================
-- Summary:
--
--   PROFILES CHANGES:
--     - Added: tenant_id UUID column (nullable, FK to alf_tenants)
--     - Dropped: old role constraint (super-admin, admin, user)
--     - Added: new role constraint (platform_owner, admin, manager, user)
--     - Migrated: all super-admins → admin
--     - Migrated: phil@sganow.com → platform_owner (separate from A&A)
--     - Migrated: old admins → manager
--     - Migrated: users stay user
--     - Assigned: all tenant users → A&A (aaefs)
--
--   RLS POLICIES CREATED:
--     - 4 profiles policies (select, update, insert, delete)
--     - 1 alf_tenants_read_own policy
--     - 48 tenant-scoped policies (12 tables × 4 operations)
--     = 53 total new policies
--
--   WHAT TO VERIFY AFTER RUNNING:
--     1. Log in as phil@sganow.com → should have role 'platform_owner', tenant_id NULL
--     2. Log in as A&A admin → should have role 'admin', tenant_id = A&A UUID
--     3. Log in as A&A manager → should have role 'manager', tenant_id = A&A UUID
--     4. Existing portal pages load without errors
--     5. A&A users can still see each other in user management
--     6. A&A users can read their tenant row from alf_tenants
--
--   FRONTEND IMPACT:
--     The existing portal checks role === 'super-admin' for admin access.
--     That will need updating in Phase 3 (frontend changes). Until then,
--     Philip's platform_owner role won't match 'super-admin' checks in
--     the React code. Options:
--       a. Update UserContext role checks in Phase 3
--       b. Or: keep Philip with a second 'super-admin' alias (not recommended)
--     This is EXPECTED and documented. Phase 3 handles it.
-- ============================================================================
