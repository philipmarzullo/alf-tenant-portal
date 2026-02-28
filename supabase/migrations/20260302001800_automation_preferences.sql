-- Automation preferences — per-action execution mode for agent → integration flows
-- Controls whether agent actions draft only, present a send button, or execute automatically.

CREATE TABLE automation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    agent_key TEXT NOT NULL,
    action_key TEXT NOT NULL,
    integration_type TEXT NOT NULL,  -- 'microsoft_email', 'microsoft_teams', 'microsoft_calendar'
    execution_mode TEXT NOT NULL DEFAULT 'draft'
        CHECK (execution_mode IN ('draft', 'review', 'automated')),
    risk_level TEXT NOT NULL
        CHECK (risk_level IN ('low', 'medium', 'high')),
    alf_recommended_mode TEXT NOT NULL
        CHECK (alf_recommended_mode IN ('draft', 'review', 'automated')),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, agent_key, action_key, integration_type)
);

CREATE INDEX idx_automation_preferences_tenant ON automation_preferences(tenant_id);

ALTER TABLE automation_preferences ENABLE ROW LEVEL SECURITY;

-- Platform owner: full access
CREATE POLICY automation_preferences_platform_owner ON automation_preferences
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
    );

-- Super-admin: own tenant only
CREATE POLICY automation_preferences_super_admin ON automation_preferences
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin'
        AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Service role: backend writes
CREATE POLICY automation_preferences_service ON automation_preferences
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
