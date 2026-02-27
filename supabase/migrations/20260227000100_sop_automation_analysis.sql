-- ============================================================================
-- SOP AUTOMATION ANALYSIS — Tables, Indexes, RLS
-- ============================================================================
-- Run in the Supabase SQL Editor.
--
-- WHAT THIS DOES:
--   - Creates sop_analyses table (one row per analyzed SOP document)
--   - Creates dept_automation_roadmaps table (one row per department per tenant)
--   - Enables RLS on both tables
--   - Creates RLS policies: tenants read own rows, service key bypasses for writes
--   - Adds indexes for common query patterns
-- ============================================================================


-- ============================================================================
-- 1. SOP_ANALYSES — per-document analysis results
-- ============================================================================

CREATE TABLE sop_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES tenant_documents(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
    analysis JSONB,
    model TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    analyzed_by UUID REFERENCES auth.users(id),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (document_id)  -- re-analysis replaces existing row
);

-- Indexes
CREATE INDEX idx_sop_analyses_tenant ON sop_analyses(tenant_id);
CREATE INDEX idx_sop_analyses_tenant_dept ON sop_analyses(tenant_id, department);
CREATE INDEX idx_sop_analyses_status ON sop_analyses(status);

-- RLS
ALTER TABLE sop_analyses ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own analyses
CREATE POLICY "Tenants read own sop_analyses"
    ON sop_analyses FOR SELECT
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Service role (backend) can do everything
CREATE POLICY "Service role full access on sop_analyses"
    ON sop_analyses FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 2. DEPT_AUTOMATION_ROADMAPS — per-department aggregated roadmap
-- ============================================================================

CREATE TABLE dept_automation_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    roadmap JSONB,
    sop_analysis_ids UUID[] DEFAULT '{}',
    model TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    generated_by UUID REFERENCES auth.users(id),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, department)  -- one roadmap per department per tenant
);

-- Indexes
CREATE INDEX idx_dept_roadmaps_tenant ON dept_automation_roadmaps(tenant_id);
CREATE INDEX idx_dept_roadmaps_tenant_dept ON dept_automation_roadmaps(tenant_id, department);

-- RLS
ALTER TABLE dept_automation_roadmaps ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own roadmaps
CREATE POLICY "Tenants read own dept_automation_roadmaps"
    ON dept_automation_roadmaps FOR SELECT
    USING (
        tenant_id = (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Service role (backend) can do everything
CREATE POLICY "Service role full access on dept_automation_roadmaps"
    ON dept_automation_roadmaps FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 3. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sop_analyses_updated_at
    BEFORE UPDATE ON sop_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_dept_roadmaps_updated_at
    BEFORE UPDATE ON dept_automation_roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
