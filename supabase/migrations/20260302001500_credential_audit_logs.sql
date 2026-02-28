-- Credential audit log — tracks all credential operations by user
-- Used by the Connections page and Alf Platform credential management

CREATE TABLE credential_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    credential_id UUID,  -- nullable because credential may be deleted
    service_type TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'toggled', 'deleted', 'tested')),
    detail JSONB DEFAULT '{}',  -- e.g. { "is_active": false }, { "test_result": "success" }
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_name TEXT,  -- denormalized for readability in logs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credential_audit_tenant ON credential_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_credential_audit_credential ON credential_audit_logs(credential_id, created_at DESC);

ALTER TABLE credential_audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform owners see all audit logs
CREATE POLICY credential_audit_platform_select ON credential_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'platform_owner'
        )
    );

-- Tenant super-admins see their own tenant's audit logs
CREATE POLICY credential_audit_tenant_select ON credential_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super-admin'
            AND profiles.tenant_id = credential_audit_logs.tenant_id
        )
    );

-- Service role can insert (backend writes)
CREATE POLICY credential_audit_service_insert ON credential_audit_logs
    FOR INSERT TO service_role
    WITH CHECK (true);
