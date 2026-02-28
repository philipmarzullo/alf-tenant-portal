-- Additional role templates + rename Site Manager → Site Supervisor

-- Rename existing "Site Manager" to "Site Supervisor"
UPDATE dashboard_role_templates SET name = 'Site Supervisor' WHERE name = 'Site Manager';

-- Insert Operations Leader template for each active tenant
INSERT INTO dashboard_role_templates (tenant_id, name, description, metric_tier, allowed_domains, default_hero_metrics, is_default)
SELECT
    t.id,
    'Operations Leader',
    'Managerial view focused on operations, quality, and safety performance',
    'managerial',
    ARRAY['operations','quality','safety'],
    ARRAY['completion_rate','open_tickets'],
    false
FROM alf_tenants t WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Insert Finance Leader template for each active tenant
INSERT INTO dashboard_role_templates (tenant_id, name, description, metric_tier, allowed_domains, default_hero_metrics, is_default)
SELECT
    t.id,
    'Finance Leader',
    'Financial visibility into labor budgets, variance, and operational spend',
    'financial',
    ARRAY['labor','operations'],
    ARRAY['labor_variance','completion_rate'],
    false
FROM alf_tenants t WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;
