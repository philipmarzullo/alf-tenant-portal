-- Per-user dashboard config overrides + dashboard sharing
-- Enables 3-tier resolution: user → tenant → registry defaults

-- ─── User Dashboard Configs ──────────────────────────────────────────────────

CREATE TABLE user_dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    dashboard_key TEXT NOT NULL,  -- 'home' | 'operations' | 'labor' | 'quality' | 'timekeeping' | 'safety'
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, tenant_id, dashboard_key)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_dashboard_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_dashboard_configs_updated
    BEFORE UPDATE ON user_dashboard_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_dashboard_configs_timestamp();

-- RLS
ALTER TABLE user_dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Users CRUD their own rows
CREATE POLICY "Users read own dashboard configs"
    ON user_dashboard_configs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users insert own dashboard configs"
    ON user_dashboard_configs FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own dashboard configs"
    ON user_dashboard_configs FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users delete own dashboard configs"
    ON user_dashboard_configs FOR DELETE
    USING (user_id = auth.uid());

-- ─── Dashboard Shares ────────────────────────────────────────────────────────

CREATE TABLE dashboard_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    dashboard_key TEXT NOT NULL,
    shared_by UUID NOT NULL REFERENCES profiles(id),
    shared_with UUID NOT NULL REFERENCES profiles(id),
    permissions TEXT NOT NULL DEFAULT 'view',  -- 'view' only for now
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, dashboard_key, shared_with)
);

-- RLS
ALTER TABLE dashboard_shares ENABLE ROW LEVEL SECURITY;

-- Admins who created the share can manage it
CREATE POLICY "Admins manage own shares"
    ON dashboard_shares FOR ALL
    USING (shared_by = auth.uid());

-- Recipients can read shares directed at them
CREATE POLICY "Recipients read their shares"
    ON dashboard_shares FOR SELECT
    USING (shared_with = auth.uid());
