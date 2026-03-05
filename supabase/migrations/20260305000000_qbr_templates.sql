-- QBR (Quarterly Business Review) templates built by tenant admins
CREATE TABLE IF NOT EXISTS qbr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sections JSONB NOT NULL DEFAULT '[]',
  cover_fields JSONB DEFAULT '{}',
  pptx_settings JSONB DEFAULT '{}',
  agent_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- RLS
ALTER TABLE qbr_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qbr_templates_tenant_read"
  ON qbr_templates FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "qbr_templates_tenant_insert"
  ON qbr_templates FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "qbr_templates_tenant_update"
  ON qbr_templates FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "qbr_templates_tenant_delete"
  ON qbr_templates FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Service role bypass for backend/platform admin
CREATE POLICY "qbr_templates_service_all"
  ON qbr_templates FOR ALL
  USING (auth.role() = 'service_role');
