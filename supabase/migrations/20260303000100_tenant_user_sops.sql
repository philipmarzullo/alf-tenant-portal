-- Assign SOPs (tenant_documents) to users — simple many-to-many junction
CREATE TABLE IF NOT EXISTS tenant_user_sops (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES tenant_documents(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, document_id)
);

CREATE INDEX idx_user_sops_user   ON tenant_user_sops (user_id);
CREATE INDEX idx_user_sops_doc    ON tenant_user_sops (document_id);
CREATE INDEX idx_user_sops_tenant ON tenant_user_sops (tenant_id);

ALTER TABLE tenant_user_sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owner full access" ON tenant_user_sops
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_owner'
  ));

CREATE POLICY "Tenant admins manage own" ON tenant_user_sops
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role IN ('super-admin','admin')
  ));

CREATE POLICY "Users see own" ON tenant_user_sops
  FOR SELECT USING (user_id = auth.uid());
