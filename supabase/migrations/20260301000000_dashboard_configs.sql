-- Dashboard configuration table
-- Stores per-tenant, per-dashboard KPI/chart customization (labels, visibility, order)

CREATE TABLE dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    dashboard_key TEXT NOT NULL,  -- 'home' | 'operations' | 'labor' | 'quality' | 'timekeeping' | 'safety'
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, dashboard_key)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dashboard_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboard_configs_updated
    BEFORE UPDATE ON dashboard_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_configs_timestamp();

-- RLS
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Tenants read their own rows
CREATE POLICY "Tenants read own dashboard configs"
    ON dashboard_configs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Admins update their own tenant's rows
CREATE POLICY "Admins update own dashboard configs"
    ON dashboard_configs FOR UPDATE
    USING (
        tenant_id IN (
            SELECT p.tenant_id FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
        )
    );

-- Admins insert for their own tenant
CREATE POLICY "Admins insert own dashboard configs"
    ON dashboard_configs FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT p.tenant_id FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super-admin')
        )
    );

-- Service role has full access (implicit via Supabase service key)
-- Platform owners (super-admin without tenant) get access via service key on backend
