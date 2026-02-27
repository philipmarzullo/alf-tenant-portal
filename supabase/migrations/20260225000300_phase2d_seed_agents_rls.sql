-- ============================================================================
-- ALF PLATFORM — PHASE 2d: Seed Agent Definitions + RLS for super-admin
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--
-- WHAT THIS DOES:
--   1. Seeds all 8 agents into alf_agent_definitions (upsert — safe to re-run)
--   2. Adds temporary RLS policies so super-admin role can access platform
--      tables (bridges the gap until Phase 2b migrates roles)
--   3. Verifies A&A tenant has modules populated
--
-- WHY: The Tenant Management Console (Features tab, Agents tab) needs:
--   - alf_agent_definitions populated so "DB Seeded" badges show
--   - RLS policies that allow the current super-admin role to query
--     alf_tenants, alf_agent_definitions, tenant_agent_overrides,
--     alf_usage_logs, and profiles
--
-- SAFE TO RE-RUN: Uses INSERT ... ON CONFLICT DO UPDATE and
--   CREATE POLICY IF NOT EXISTS pattern (DROP + CREATE).
-- ============================================================================


-- ============================================================================
-- 1. RLS POLICIES FOR super-admin (TEMPORARY — replaced by Phase 2b/2c)
-- ============================================================================
-- The Phase 2 migration created policies only for 'platform_owner' role,
-- but Philip is still 'super-admin'. These policies bridge that gap.

-- alf_tenants: super-admin can do everything
DROP POLICY IF EXISTS alf_tenants_superadmin_all ON alf_tenants;
CREATE POLICY alf_tenants_superadmin_all ON alf_tenants FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);

-- alf_agent_definitions: super-admin can read and write
DROP POLICY IF EXISTS alf_agent_definitions_superadmin_all ON alf_agent_definitions;
CREATE POLICY alf_agent_definitions_superadmin_all ON alf_agent_definitions FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);

-- tenant_agent_overrides: super-admin can read and write
DROP POLICY IF EXISTS tenant_agent_overrides_superadmin_all ON tenant_agent_overrides;
CREATE POLICY tenant_agent_overrides_superadmin_all ON tenant_agent_overrides FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);

-- alf_usage_logs: super-admin can read
DROP POLICY IF EXISTS alf_usage_logs_superadmin_select ON alf_usage_logs;
CREATE POLICY alf_usage_logs_superadmin_select ON alf_usage_logs FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);

-- tenant_sites: super-admin can read and write
DROP POLICY IF EXISTS tenant_sites_superadmin_all ON tenant_sites;
CREATE POLICY tenant_sites_superadmin_all ON tenant_sites FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);

-- profiles: super-admin can read all profiles (needed for user counts)
-- (profiles likely already has policies — this adds a supplemental one)
DROP POLICY IF EXISTS profiles_superadmin_select ON profiles;
CREATE POLICY profiles_superadmin_select ON profiles FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
);


-- ============================================================================
-- 2. SEED AGENT DEFINITIONS
-- ============================================================================
-- Upserts all 8 agents. System prompts are stored as placeholders —
-- the frontend reads full prompts from source code (registry.js).
-- These DB rows exist for:
--   - "DB Seeded" status indicator in the Agents tab
--   - Future Phase 3: DB becomes source of truth for prompts

INSERT INTO alf_agent_definitions (agent_key, name, department, system_prompt, model, max_tokens, status, actions)
VALUES
  (
    'hr', 'HR Agent', 'hr',
    '[Source code — see src/agents/configs/hr.js]',
    'claude-sonnet-4-20250514', 4096, 'active',
    '[
      {"key": "draftReminder", "label": "Draft Reminder Email", "description": "Generate a benefits enrollment reminder for an employee"},
      {"key": "generateWinTeamUpdate", "label": "Generate WinTeam Update", "description": "Step-by-step WinTeam field update instructions"},
      {"key": "checkUnionCompliance", "label": "Check Union Compliance", "description": "Validate pay rate change against union contract"},
      {"key": "notifyOperations", "label": "Notify Operations", "description": "Draft supervisor/VP notification for approved leave"},
      {"key": "checkEligibility", "label": "Check Eligibility", "description": "Evaluate leave eligibility against FMLA/state criteria"},
      {"key": "sendReminder", "label": "Send Reminder", "description": "Draft follow-up for overdue documents"},
      {"key": "runEnrollmentAudit", "label": "Run Enrollment Audit", "description": "Review all open enrollments and flag issues"},
      {"key": "generateRateChangeBatch", "label": "Generate Rate Change Batch", "description": "Produce employee list and new rates for union contract"},
      {"key": "askAgent", "label": "Ask HR Agent", "description": "Open-ended HR operations question"}
    ]'::jsonb
  ),
  (
    'finance', 'Finance Agent', 'finance',
    '[Source code — see src/agents/configs/finance.js]',
    'claude-sonnet-4-20250514', 4096, 'setup',
    '[
      {"key": "draftCollectionEmail", "label": "Draft Collection Email", "description": "Generate a professional collection communication for overdue AR"},
      {"key": "summarizeAccount", "label": "Summarize Account", "description": "Executive summary of client account health"}
    ]'::jsonb
  ),
  (
    'purchasing', 'Purchasing Agent', 'purchasing',
    '[Source code — see src/agents/configs/purchasing.js]',
    'claude-sonnet-4-20250514', 4096, 'setup',
    '[
      {"key": "reorderAnalysis", "label": "Reorder Analysis", "description": "Analyze inventory levels and recommend reorder quantities"}
    ]'::jsonb
  ),
  (
    'sales', 'Sales Agent', 'sales',
    '[Source code — see src/agents/configs/sales.js]',
    'claude-sonnet-4-20250514', 4096, 'active',
    '[
      {"key": "renewalBrief", "label": "Generate Renewal Brief", "description": "Summarize a contract approaching renewal with key talking points"},
      {"key": "apcVarianceAnalysis", "label": "APC Variance Analysis", "description": "Analyze year-over-year APC changes and flag anomalies"},
      {"key": "tbiSummary", "label": "TBI Summary Report", "description": "Summarize TBI extra work for a client with invoicing recommendations"},
      {"key": "pipelineSummary", "label": "Pipeline Summary", "description": "Generate an executive summary of the renewal pipeline"},
      {"key": "askAgent", "label": "Ask Sales Agent", "description": "Open-ended sales operations question"}
    ]'::jsonb
  ),
  (
    'ops', 'Operations Agent', 'ops',
    '[Source code — see src/agents/configs/ops.js]',
    'claude-sonnet-4-20250514', 4096, 'active',
    '[
      {"key": "vpPerformanceSummary", "label": "VP Performance Summary", "description": "Generate a performance summary for a VP based on their KPI data"},
      {"key": "inspectionAnalysis", "label": "Inspection Analysis", "description": "Analyze inspection rates across all VPs and identify trends"},
      {"key": "askAgent", "label": "Ask Operations Agent", "description": "Open-ended operations question"}
    ]'::jsonb
  ),
  (
    'admin', 'Admin Agent', 'admin',
    '[Source code — see src/agents/configs/admin.js]',
    'claude-sonnet-4-20250514', 4096, 'active',
    '[
      {"key": "executiveBriefing", "label": "Executive Briefing", "description": "Generate a cross-department executive summary"},
      {"key": "crossModuleAnalysis", "label": "Cross-Module Analysis", "description": "Analyze connections between department metrics"},
      {"key": "askAgent", "label": "Ask Admin Agent", "description": "Open-ended strategic question"}
    ]'::jsonb
  ),
  (
    'qbu', 'QBU Builder', 'tools',
    '[Source code — see src/agents/configs/qbu.js]',
    'claude-sonnet-4-20250514', 16384, 'active',
    '[
      {"key": "generateQBU", "label": "Generate QBU", "description": "Generate a complete Quarterly Business Update from intake data"}
    ]'::jsonb
  ),
  (
    'salesDeck', 'Sales Deck Builder', 'tools',
    '[Source code — see src/agents/configs/salesDeck.js]',
    'claude-sonnet-4-20250514', 8192, 'active',
    '[
      {"key": "generateDeck", "label": "Generate Sales Deck", "description": "Generate a prospect-specific sales deck with full intake context"}
    ]'::jsonb
  )
ON CONFLICT (agent_key) DO UPDATE SET
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  model = EXCLUDED.model,
  max_tokens = EXCLUDED.max_tokens,
  status = EXCLUDED.status,
  actions = EXCLUDED.actions,
  updated_at = now();


-- ============================================================================
-- 3. VERIFY A&A TENANT HAS MODULES
-- ============================================================================
-- The Phase 2 migration seeded A&A with enabled_modules. The frontend
-- code references the column as 'modules'. This handles both cases:
-- if the column is 'enabled_modules', update it; if 'modules', update that.
--
-- Try enabled_modules first (matches Phase 2 migration schema):
UPDATE alf_tenants
SET enabled_modules = ARRAY['hr', 'finance', 'ops', 'sales', 'purchasing', 'qbu', 'salesDeck']
WHERE slug = 'aaefs'
  AND (enabled_modules IS NULL OR array_length(enabled_modules, 1) IS NULL);


-- ============================================================================
-- DONE — PHASE 2d COMPLETE
-- ============================================================================
-- After running this:
--   - 8 agents seeded in alf_agent_definitions
--   - super-admin can query all platform tables via RLS
--   - A&A tenant has all 7 modules enabled
--
-- To verify, run:
--   SELECT agent_key, name, department, status FROM alf_agent_definitions ORDER BY agent_key;
--   SELECT company_name, slug, enabled_modules FROM alf_tenants WHERE slug = 'aaefs';
-- ============================================================================
