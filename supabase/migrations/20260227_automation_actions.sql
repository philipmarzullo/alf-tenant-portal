-- ============================================================================
-- AUTOMATION ACTIONS — Actionable items derived from SOP roadmaps
-- ============================================================================
-- Run in the Supabase SQL Editor.
--
-- WHAT THIS DOES:
--   - Creates automation_actions table (roadmap items → trackable actions)
--   - Each action is classified as agent-executable, hybrid, or manual
--   - Agent-executable actions get skill prompts injected into tenant agents
--   - Enables RLS: tenants read/update own rows, service_role full access
-- ============================================================================


CREATE TABLE automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    roadmap_id UUID REFERENCES dept_automation_roadmaps(id) ON DELETE SET NULL,
    phase TEXT NOT NULL CHECK (phase IN ('quick-win', 'medium-term', 'long-term')),

    -- What
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_sop TEXT,

    -- Classification
    assignee_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (assignee_type IN ('agent', 'human', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'skill_generating', 'ready_for_review',
                          'active', 'manual', 'dismissed')),

    -- Agent linkage (for agent/hybrid types)
    agent_key TEXT,
    agent_skill_prompt TEXT,
    agent_skill_context TEXT,

    -- Effort/impact from roadmap
    effort TEXT CHECK (effort IN ('low', 'medium', 'high')),
    impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
    estimated_time_saved TEXT,

    -- Deliverables (agent output stored here)
    deliverables JSONB DEFAULT '[]',

    -- Human notes
    tenant_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_automation_actions_tenant ON automation_actions(tenant_id);
CREATE INDEX idx_automation_actions_tenant_dept ON automation_actions(tenant_id, department);
CREATE INDEX idx_automation_actions_status ON automation_actions(tenant_id, status);

-- RLS
ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own actions"
    ON automation_actions FOR SELECT
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Tenants can update own actions"
    ON automation_actions FOR UPDATE
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role full access on automation_actions"
    ON automation_actions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Updated_at trigger (reuses existing function from sop_automation_analysis migration)
CREATE TRIGGER update_automation_actions_updated_at
    BEFORE UPDATE ON automation_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
