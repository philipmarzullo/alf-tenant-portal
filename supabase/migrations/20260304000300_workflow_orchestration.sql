-- Workflow Orchestration Runtime: Stages, Stage Runs, Dedup
-- Stages consolidate granular SOP steps into executable units.
-- The runtime executes stages (not individual SOP steps).

-- ============================================================
-- 1. workflow_stages — defines execution stages per workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  classification TEXT NOT NULL DEFAULT 'automated'
    CHECK (classification IN ('automated', 'hybrid', 'manual')),
  agent_key TEXT,
  routing_rule JSONB DEFAULT '{}',
  sla_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workflow_definition_id, stage_number)
);

-- ============================================================
-- 2. workflow_stage_steps — maps SOP steps to stages
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_stage_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
  sop_step_id UUID NOT NULL REFERENCES tenant_sop_steps(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,

  UNIQUE(workflow_stage_id, sop_step_id)
);

-- ============================================================
-- 3. workflow_stage_runs — runtime execution per stage
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_stage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES alf_tenants(id),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_stage_id UUID NOT NULL REFERENCES workflow_stages(id),
  stage_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'awaiting_human', 'completed', 'failed', 'skipped')),

  -- Data flow
  input_data JSONB,
  output_data JSONB,

  -- Agent audit trail (automated + hybrid)
  agent_key TEXT,
  agent_model TEXT,
  agent_tokens_input INTEGER,
  agent_tokens_output INTEGER,
  agent_system_prompt TEXT,
  agent_messages_sent JSONB,
  agent_response JSONB,

  -- Human review (hybrid + manual)
  assigned_to UUID REFERENCES profiles(id),
  human_edited_output JSONB,
  edited_by UUID REFERENCES profiles(id),
  edited_at TIMESTAMPTZ,
  task_id UUID REFERENCES tenant_user_tasks(id),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 1,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workflow_run_id, stage_number)
);

-- ============================================================
-- 4. Add dedup_key + routing_rules to existing tables
-- ============================================================
ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS dedup_key TEXT,
  ADD COLUMN IF NOT EXISTS current_stage_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_dedup
  ON workflow_runs(dedup_key, created_at)
  WHERE dedup_key IS NOT NULL;

ALTER TABLE workflow_definitions
  ADD COLUMN IF NOT EXISTS routing_rules JSONB DEFAULT '{}';

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX idx_stages_workflow ON workflow_stages(workflow_definition_id);
CREATE INDEX idx_stages_tenant ON workflow_stages(tenant_id);
CREATE INDEX idx_stage_steps_stage ON workflow_stage_steps(workflow_stage_id);
CREATE INDEX idx_stage_steps_sop ON workflow_stage_steps(sop_step_id);
CREATE INDEX idx_stage_runs_run ON workflow_stage_runs(workflow_run_id);
CREATE INDEX idx_stage_runs_tenant ON workflow_stage_runs(tenant_id);
CREATE INDEX idx_stage_runs_status ON workflow_stage_runs(status);
CREATE INDEX idx_stage_runs_assigned ON workflow_stage_runs(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 6. RLS Policies
-- ============================================================
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stage_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stage_runs ENABLE ROW LEVEL SECURITY;

-- workflow_stages
CREATE POLICY "Tenant isolation" ON workflow_stages
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY "Service role bypass" ON workflow_stages
  FOR ALL USING (auth.role() = 'service_role');

-- workflow_stage_steps (access via stage's tenant)
CREATE POLICY "Tenant isolation" ON workflow_stage_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflow_stages ws
      WHERE ws.id = workflow_stage_steps.workflow_stage_id
        AND ws.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    )
  );
CREATE POLICY "Service role bypass" ON workflow_stage_steps
  FOR ALL USING (auth.role() = 'service_role');

-- workflow_stage_runs
CREATE POLICY "Tenant isolation" ON workflow_stage_runs
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
CREATE POLICY "Service role bypass" ON workflow_stage_runs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 7. Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workflow_stages_updated
  BEFORE UPDATE ON workflow_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_workflow_stage_runs_updated
  BEFORE UPDATE ON workflow_stage_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
