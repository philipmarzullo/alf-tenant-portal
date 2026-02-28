-- Sync infrastructure: sync_configs, sync_logs, natural key indexes on sf_* tables
-- Supports snowflake, generic_sql, and file_upload connector types

-- ─── sync_configs ───────────────────────────────────────────────────────
CREATE TABLE sync_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    connector_type TEXT NOT NULL CHECK (connector_type IN ('snowflake', 'generic_sql', 'file_upload')),
    label TEXT NOT NULL DEFAULT 'Default Sync',
    config JSONB NOT NULL DEFAULT '{}',
    tables_to_sync TEXT[] NOT NULL DEFAULT '{}',
    schedule TEXT,  -- cron expression or null for manual-only
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, connector_type)
);

CREATE INDEX idx_sync_configs_tenant ON sync_configs(tenant_id);

-- ─── sync_logs ──────────────────────────────────────────────────────────
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    sync_config_id UUID REFERENCES sync_configs(id) ON DELETE SET NULL,
    connector_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'error')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    row_counts JSONB DEFAULT '{}',
    errors JSONB DEFAULT '[]',
    triggered_by TEXT NOT NULL DEFAULT 'manual',
    file_name TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_tenant ON sync_logs(tenant_id);
CREATE INDEX idx_sync_logs_config ON sync_logs(sync_config_id);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────

ALTER TABLE sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- sync_configs: service role full access
CREATE POLICY "sync_configs_service_role"
    ON sync_configs FOR ALL
    USING (auth.role() = 'service_role');

-- sync_configs: platform admins full access
CREATE POLICY "sync_configs_platform_admin"
    ON sync_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super-admin', 'platform_owner')
        )
    );

-- sync_configs: tenant admins read own data
CREATE POLICY "sync_configs_tenant_read"
    ON sync_configs FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- sync_logs: service role full access
CREATE POLICY "sync_logs_service_role"
    ON sync_logs FOR ALL
    USING (auth.role() = 'service_role');

-- sync_logs: platform admins full access
CREATE POLICY "sync_logs_platform_admin"
    ON sync_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super-admin', 'platform_owner')
        )
    );

-- sync_logs: tenant admins read own data
CREATE POLICY "sync_logs_tenant_read"
    ON sync_logs FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ─── Natural key unique indexes on sf_* tables (needed for upsert) ────

CREATE UNIQUE INDEX IF NOT EXISTS uq_sf_dim_job_tenant_name
    ON sf_dim_job(tenant_id, job_name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sf_dim_employee_tenant_number
    ON sf_dim_employee(tenant_id, employee_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sf_fact_labor_budget_tenant_job_period
    ON sf_fact_labor_budget_actual(tenant_id, job_id, period_start, period_end);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sf_fact_job_daily_tenant_job_date
    ON sf_fact_job_daily(tenant_id, job_id, date_key);
