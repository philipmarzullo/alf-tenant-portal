-- ============================================================================
-- ALF PLATFORM — PHASE 2c: RLS Hotfix
-- ============================================================================
-- EMERGENCY FIX: Phase 2b profiles policies use self-referencing subqueries
-- that cause circular RLS evaluation. PostgreSQL blocks all reads → blank page
-- for ALL users (production is down).
--
-- Fix: SECURITY DEFINER helper functions bypass RLS to read the calling user's
-- role and tenant_id. All policies rewritten to use these helpers.
-- ============================================================================


-- ============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;


-- ============================================================================
-- 2. FIX PROFILES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;

-- SELECT: see yourself, your tenant's users, or everything if platform_owner
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
    id = auth.uid()
    OR tenant_id = auth_user_tenant_id()
    OR auth_user_role() = 'platform_owner'
);

-- UPDATE: yourself, admin can update tenant users, platform_owner can update anyone
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
    id = auth.uid()
    OR (auth_user_role() = 'admin' AND tenant_id = auth_user_tenant_id())
    OR auth_user_role() = 'platform_owner'
);

-- INSERT: platform_owner or admin within their tenant
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
    auth_user_role() = 'platform_owner'
    OR (auth_user_role() = 'admin' AND tenant_id = auth_user_tenant_id())
);

-- DELETE: platform_owner only
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
    auth_user_role() = 'platform_owner'
);


-- ============================================================================
-- 3. FIX ALF_TENANTS READ-OWN POLICY
-- ============================================================================

DROP POLICY IF EXISTS alf_tenants_read_own ON alf_tenants;
CREATE POLICY alf_tenants_read_own ON alf_tenants FOR SELECT USING (
    id = auth_user_tenant_id()
);


-- ============================================================================
-- 4. FIX PLATFORM-ONLY TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS alf_platform_config_all ON alf_platform_config;
CREATE POLICY alf_platform_config_all ON alf_platform_config FOR ALL USING (
    auth_user_role() = 'platform_owner'
);

DROP POLICY IF EXISTS alf_agent_definitions_all ON alf_agent_definitions;
CREATE POLICY alf_agent_definitions_all ON alf_agent_definitions FOR ALL USING (
    auth_user_role() = 'platform_owner'
);

DROP POLICY IF EXISTS alf_platform_templates_all ON alf_platform_templates;
CREATE POLICY alf_platform_templates_all ON alf_platform_templates FOR ALL USING (
    auth_user_role() = 'platform_owner'
);

DROP POLICY IF EXISTS alf_platform_brand_assets_all ON alf_platform_brand_assets;
CREATE POLICY alf_platform_brand_assets_all ON alf_platform_brand_assets FOR ALL USING (
    auth_user_role() = 'platform_owner'
);

DROP POLICY IF EXISTS alf_usage_logs_select ON alf_usage_logs;
CREATE POLICY alf_usage_logs_select ON alf_usage_logs FOR SELECT USING (
    auth_user_role() = 'platform_owner'
);

DROP POLICY IF EXISTS alf_tenants_platform_all ON alf_tenants;
CREATE POLICY alf_tenants_platform_all ON alf_tenants FOR ALL USING (
    auth_user_role() = 'platform_owner'
);


-- ============================================================================
-- 5. FIX TENANT-SCOPED TABLE POLICIES (12 tables × 4 ops = 48 policies)
-- ============================================================================

-- tenant_sites
DROP POLICY IF EXISTS tenant_sites_select ON tenant_sites;
DROP POLICY IF EXISTS tenant_sites_insert ON tenant_sites;
DROP POLICY IF EXISTS tenant_sites_update ON tenant_sites;
DROP POLICY IF EXISTS tenant_sites_delete ON tenant_sites;
CREATE POLICY tenant_sites_select ON tenant_sites FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY tenant_sites_insert ON tenant_sites FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY tenant_sites_update ON tenant_sites FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY tenant_sites_delete ON tenant_sites FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- client_contacts
DROP POLICY IF EXISTS client_contacts_select ON client_contacts;
DROP POLICY IF EXISTS client_contacts_insert ON client_contacts;
DROP POLICY IF EXISTS client_contacts_update ON client_contacts;
DROP POLICY IF EXISTS client_contacts_delete ON client_contacts;
CREATE POLICY client_contacts_select ON client_contacts FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY client_contacts_insert ON client_contacts FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY client_contacts_update ON client_contacts FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY client_contacts_delete ON client_contacts FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- tenant_agent_overrides
DROP POLICY IF EXISTS tenant_agent_overrides_select ON tenant_agent_overrides;
DROP POLICY IF EXISTS tenant_agent_overrides_insert ON tenant_agent_overrides;
DROP POLICY IF EXISTS tenant_agent_overrides_update ON tenant_agent_overrides;
DROP POLICY IF EXISTS tenant_agent_overrides_delete ON tenant_agent_overrides;
CREATE POLICY tenant_agent_overrides_select ON tenant_agent_overrides FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY tenant_agent_overrides_insert ON tenant_agent_overrides FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY tenant_agent_overrides_update ON tenant_agent_overrides FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY tenant_agent_overrides_delete ON tenant_agent_overrides FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- qbu_submissions
DROP POLICY IF EXISTS qbu_submissions_select ON qbu_submissions;
DROP POLICY IF EXISTS qbu_submissions_insert ON qbu_submissions;
DROP POLICY IF EXISTS qbu_submissions_update ON qbu_submissions;
DROP POLICY IF EXISTS qbu_submissions_delete ON qbu_submissions;
CREATE POLICY qbu_submissions_select ON qbu_submissions FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_submissions_insert ON qbu_submissions FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_submissions_update ON qbu_submissions FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_submissions_delete ON qbu_submissions FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- qbu_intake_data
DROP POLICY IF EXISTS qbu_intake_data_select ON qbu_intake_data;
DROP POLICY IF EXISTS qbu_intake_data_insert ON qbu_intake_data;
DROP POLICY IF EXISTS qbu_intake_data_update ON qbu_intake_data;
DROP POLICY IF EXISTS qbu_intake_data_delete ON qbu_intake_data;
CREATE POLICY qbu_intake_data_select ON qbu_intake_data FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_intake_data_insert ON qbu_intake_data FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_intake_data_update ON qbu_intake_data FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_intake_data_delete ON qbu_intake_data FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- qbu_photos
DROP POLICY IF EXISTS qbu_photos_select ON qbu_photos;
DROP POLICY IF EXISTS qbu_photos_insert ON qbu_photos;
DROP POLICY IF EXISTS qbu_photos_update ON qbu_photos;
DROP POLICY IF EXISTS qbu_photos_delete ON qbu_photos;
CREATE POLICY qbu_photos_select ON qbu_photos FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_photos_insert ON qbu_photos FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_photos_update ON qbu_photos FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_photos_delete ON qbu_photos FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- qbu_testimonials
DROP POLICY IF EXISTS qbu_testimonials_select ON qbu_testimonials;
DROP POLICY IF EXISTS qbu_testimonials_insert ON qbu_testimonials;
DROP POLICY IF EXISTS qbu_testimonials_update ON qbu_testimonials;
DROP POLICY IF EXISTS qbu_testimonials_delete ON qbu_testimonials;
CREATE POLICY qbu_testimonials_select ON qbu_testimonials FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_testimonials_insert ON qbu_testimonials FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_testimonials_update ON qbu_testimonials FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY qbu_testimonials_delete ON qbu_testimonials FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- generated_decks
DROP POLICY IF EXISTS generated_decks_select ON generated_decks;
DROP POLICY IF EXISTS generated_decks_insert ON generated_decks;
DROP POLICY IF EXISTS generated_decks_update ON generated_decks;
DROP POLICY IF EXISTS generated_decks_delete ON generated_decks;
CREATE POLICY generated_decks_select ON generated_decks FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY generated_decks_insert ON generated_decks FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY generated_decks_update ON generated_decks FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY generated_decks_delete ON generated_decks FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- contracts
DROP POLICY IF EXISTS contracts_select ON contracts;
DROP POLICY IF EXISTS contracts_insert ON contracts;
DROP POLICY IF EXISTS contracts_update ON contracts;
DROP POLICY IF EXISTS contracts_delete ON contracts;
CREATE POLICY contracts_select ON contracts FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY contracts_insert ON contracts FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY contracts_update ON contracts FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY contracts_delete ON contracts FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- ar_aging
DROP POLICY IF EXISTS ar_aging_select ON ar_aging;
DROP POLICY IF EXISTS ar_aging_insert ON ar_aging;
DROP POLICY IF EXISTS ar_aging_update ON ar_aging;
DROP POLICY IF EXISTS ar_aging_delete ON ar_aging;
CREATE POLICY ar_aging_select ON ar_aging FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY ar_aging_insert ON ar_aging FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY ar_aging_update ON ar_aging FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY ar_aging_delete ON ar_aging FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- benefits_enrollments
DROP POLICY IF EXISTS benefits_enrollments_select ON benefits_enrollments;
DROP POLICY IF EXISTS benefits_enrollments_insert ON benefits_enrollments;
DROP POLICY IF EXISTS benefits_enrollments_update ON benefits_enrollments;
DROP POLICY IF EXISTS benefits_enrollments_delete ON benefits_enrollments;
CREATE POLICY benefits_enrollments_select ON benefits_enrollments FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY benefits_enrollments_insert ON benefits_enrollments FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY benefits_enrollments_update ON benefits_enrollments FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY benefits_enrollments_delete ON benefits_enrollments FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');

-- vp_performance
DROP POLICY IF EXISTS vp_performance_select ON vp_performance;
DROP POLICY IF EXISTS vp_performance_insert ON vp_performance;
DROP POLICY IF EXISTS vp_performance_update ON vp_performance;
DROP POLICY IF EXISTS vp_performance_delete ON vp_performance;
CREATE POLICY vp_performance_select ON vp_performance FOR SELECT USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY vp_performance_insert ON vp_performance FOR INSERT WITH CHECK (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY vp_performance_update ON vp_performance FOR UPDATE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');
CREATE POLICY vp_performance_delete ON vp_performance FOR DELETE USING (tenant_id = auth_user_tenant_id() OR auth_user_role() = 'platform_owner');


-- ============================================================================
-- DONE — PHASE 2c HOTFIX COMPLETE
-- ============================================================================
-- Created: auth_user_role() and auth_user_tenant_id() SECURITY DEFINER functions
-- Replaced: 57 RLS policies (4 profiles + 1 alf_tenants + 6 platform + 48 tenant)
-- All policies now use helper functions instead of self-referencing subqueries.
-- ============================================================================
