-- Connection registry — tracks tenant integrations (email, ERP, CRM, etc.)
-- Supplements tenant_api_credentials (encrypted token storage).
-- credential_id FK links to the encrypted token; this table holds status + capabilities.

CREATE TABLE tenant_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL,
    provider        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'not_connected'
                      CHECK (status IN ('not_connected','connected','error','expired')),
    capabilities    JSONB NOT NULL DEFAULT '[]',
    metadata        JSONB NOT NULL DEFAULT '{}',
    credential_id   UUID REFERENCES tenant_api_credentials(id) ON DELETE SET NULL,
    connected_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, connection_type, provider)
);

CREATE INDEX idx_tenant_connections_tenant ON tenant_connections(tenant_id);
CREATE INDEX idx_tenant_connections_status ON tenant_connections(tenant_id, status);

ALTER TABLE tenant_connections ENABLE ROW LEVEL SECURITY;

-- Platform owners: full access
CREATE POLICY tenant_connections_platform_all ON tenant_connections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

-- Super-admins: full access to own tenant
CREATE POLICY tenant_connections_superadmin_all ON tenant_connections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super-admin'
            AND profiles.tenant_id = tenant_connections.tenant_id
        )
    );

-- Tenant users: read-only on own tenant
CREATE POLICY tenant_connections_tenant_select ON tenant_connections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.tenant_id = tenant_connections.tenant_id
        )
    );

-- Service role: full access (backend writes)
CREATE POLICY tenant_connections_service_all ON tenant_connections
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Expand audit log action constraint to include email_sent
ALTER TABLE credential_audit_logs DROP CONSTRAINT IF EXISTS credential_audit_logs_action_check;
ALTER TABLE credential_audit_logs ADD CONSTRAINT credential_audit_logs_action_check
  CHECK (action IN ('created','updated','toggled','deleted','tested','connected','disconnected','refreshed','email_sent'));
