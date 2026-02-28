-- Custom tools built by tenant admins via the Tool Builder
CREATE TABLE IF NOT EXISTS tenant_custom_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Wrench',
  intake_schema JSONB NOT NULL DEFAULT '[]',
  purpose TEXT NOT NULL,
  output_format TEXT DEFAULT 'text' CHECK (output_format IN ('text', 'pdf')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, tool_key)
);

-- RLS
ALTER TABLE tenant_custom_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_custom_tools_tenant_read"
  ON tenant_custom_tools FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_custom_tools_tenant_insert"
  ON tenant_custom_tools FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_custom_tools_tenant_update"
  ON tenant_custom_tools FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_custom_tools_tenant_delete"
  ON tenant_custom_tools FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Service role bypass for backend/platform admin
CREATE POLICY "tenant_custom_tools_service_all"
  ON tenant_custom_tools FOR ALL
  USING (auth.role() = 'service_role');
