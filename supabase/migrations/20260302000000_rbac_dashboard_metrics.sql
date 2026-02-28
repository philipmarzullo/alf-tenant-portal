-- RBAC Dashboard Metrics: role templates, site assignments, metric sensitivity tiers
-- Enables per-user scoping of which sites and metrics are visible

-- ─── Dashboard Role Templates ──────────────────────────────────────────────

CREATE TABLE dashboard_role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    metric_tier TEXT NOT NULL DEFAULT 'operational'
        CHECK (metric_tier IN ('operational', 'managerial', 'financial')),
    allowed_domains TEXT[] NOT NULL DEFAULT ARRAY['operations','labor','quality','timekeeping','safety'],
    default_hero_metrics TEXT[],
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, name)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dashboard_role_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboard_role_templates_updated
    BEFORE UPDATE ON dashboard_role_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_role_templates_timestamp();

-- RLS
ALTER TABLE dashboard_role_templates ENABLE ROW LEVEL SECURITY;

-- All tenant users can read templates (needed for first-time setup)
CREATE POLICY "Tenant users read own templates"
    ON dashboard_role_templates FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Admins can manage templates
CREATE POLICY "Admins manage templates"
    ON dashboard_role_templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND tenant_id = dashboard_role_templates.tenant_id
              AND role IN ('admin', 'super-admin')
        )
    );

CREATE POLICY "Admins update templates"
    ON dashboard_role_templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND tenant_id = dashboard_role_templates.tenant_id
              AND role IN ('admin', 'super-admin')
        )
    );

CREATE POLICY "Admins delete templates"
    ON dashboard_role_templates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND tenant_id = dashboard_role_templates.tenant_id
              AND role IN ('admin', 'super-admin')
        )
    );

-- ─── User Site Assignments ─────────────────────────────────────────────────

CREATE TABLE user_site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sf_dim_job(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, job_id)
);

-- RLS
ALTER TABLE user_site_assignments ENABLE ROW LEVEL SECURITY;

-- Users can read their own assignments
CREATE POLICY "Users read own site assignments"
    ON user_site_assignments FOR SELECT
    USING (user_id = auth.uid());

-- Admins can read all assignments for their tenant
CREATE POLICY "Admins read tenant site assignments"
    ON user_site_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND tenant_id = user_site_assignments.tenant_id
              AND role IN ('admin', 'super-admin')
        )
    );

-- Admins can manage assignments
CREATE POLICY "Admins insert site assignments"
    ON user_site_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND tenant_id = user_site_assignments.tenant_id
              AND role IN ('admin', 'super-admin')
        )
    );

CREATE POLICY "Admins delete site assignments"
    ON user_site_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND tenant_id = user_site_assignments.tenant_id
              AND role IN ('admin', 'super-admin')
        )
    );

-- ─── Profile Extension ─────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dashboard_template_id UUID
    REFERENCES dashboard_role_templates(id) ON DELETE SET NULL;

-- ─── Seed Default Templates ────────────────────────────────────────────────
-- Insert 3 default templates for each active tenant

INSERT INTO dashboard_role_templates (tenant_id, name, description, metric_tier, allowed_domains, default_hero_metrics, is_default)
SELECT
    t.id,
    'Executive',
    'Full visibility — all metrics across all domains including financial data',
    'financial',
    ARRAY['operations','labor','quality','timekeeping','safety'],
    ARRAY['total_properties','open_tickets','completion_rate','labor_variance'],
    false
FROM alf_tenants t WHERE t.is_active = true;

INSERT INTO dashboard_role_templates (tenant_id, name, description, metric_tier, allowed_domains, default_hero_metrics, is_default)
SELECT
    t.id,
    'Site Manager',
    'Operational and managerial metrics — site performance, labor hours, quality trends',
    'managerial',
    ARRAY['operations','labor','quality','timekeeping','safety'],
    ARRAY['total_properties','open_tickets','completion_rate'],
    true
FROM alf_tenants t WHERE t.is_active = true;

INSERT INTO dashboard_role_templates (tenant_id, name, description, metric_tier, allowed_domains, default_hero_metrics, is_default)
SELECT
    t.id,
    'Field Supervisor',
    'Operational metrics only — ticket completion, audit results, safety incidents',
    'operational',
    ARRAY['operations','quality','timekeeping','safety'],
    ARRAY['open_tickets','completion_rate'],
    false
FROM alf_tenants t WHERE t.is_active = true;
