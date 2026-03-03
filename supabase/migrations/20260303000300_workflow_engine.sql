-- ============================================================================
-- Workflow Orchestration Engine
-- Turns analyzed SOPs into live, runnable workflows with full agent
-- accountability and data flow between steps.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. workflow_definitions
--    An activated SOP becomes a runnable workflow. Points back to sop_analyses
--    and inherits steps from tenant_sop_steps (no duplication).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_definitions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  sop_analysis_id  uuid NOT NULL REFERENCES sop_analyses(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  department       text,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  version          integer NOT NULL DEFAULT 1,
  activated_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activated_at     timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),

  UNIQUE (sop_analysis_id, version)
);

CREATE INDEX idx_workflow_def_tenant
  ON workflow_definitions (tenant_id);
CREATE INDEX idx_workflow_def_tenant_dept
  ON workflow_definitions (tenant_id, department);
CREATE INDEX idx_workflow_def_tenant_status
  ON workflow_definitions (tenant_id, status);
CREATE INDEX idx_workflow_def_sop_analysis
  ON workflow_definitions (sop_analysis_id);

CREATE TRIGGER set_workflow_definitions_updated_at
  BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────────────
-- 2. workflow_triggers
--    Each workflow can have multiple triggers: manual, schedule, event, or
--    chained after another workflow completes.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_triggers (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  workflow_definition_id    uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  trigger_type              text NOT NULL
                              CHECK (trigger_type IN ('manual', 'schedule', 'event', 'chained')),
  is_active                 boolean NOT NULL DEFAULT true,

  -- Schedule trigger fields
  schedule_cron             text,
  schedule_timezone         text DEFAULT 'America/New_York',

  -- Event trigger fields
  event_source              text
                              CHECK (event_source IS NULL OR event_source IN (
                                'sync_completion', 'metric_threshold', 'webhook'
                              )),
  event_config              jsonb,

  -- Chained trigger fields
  chain_after_workflow_id   uuid REFERENCES workflow_definitions(id) ON DELETE SET NULL,
  chain_condition           text
                              CHECK (chain_condition IS NULL OR chain_condition IN (
                                'completed', 'failed', 'any'
                              )),

  created_by                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),

  -- Type-specific validation
  CONSTRAINT chk_trigger_schedule CHECK (
    trigger_type != 'schedule' OR schedule_cron IS NOT NULL
  ),
  CONSTRAINT chk_trigger_event CHECK (
    trigger_type != 'event' OR (event_source IS NOT NULL AND event_config IS NOT NULL)
  ),
  CONSTRAINT chk_trigger_chained CHECK (
    trigger_type != 'chained' OR chain_after_workflow_id IS NOT NULL
  )
);

CREATE INDEX idx_workflow_triggers_definition
  ON workflow_triggers (workflow_definition_id);
CREATE INDEX idx_workflow_triggers_tenant
  ON workflow_triggers (tenant_id);
CREATE INDEX idx_workflow_triggers_chain
  ON workflow_triggers (chain_after_workflow_id)
  WHERE chain_after_workflow_id IS NOT NULL;
CREATE INDEX idx_workflow_triggers_active_schedules
  ON workflow_triggers (workflow_definition_id)
  WHERE trigger_type = 'schedule' AND is_active = true;

CREATE TRIGGER set_workflow_triggers_updated_at
  BEFORE UPDATE ON workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────────────
-- 3. workflow_runs
--    Each execution instance. Same workflow can have multiple concurrent runs.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_runs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  workflow_definition_id   uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  trigger_id               uuid REFERENCES workflow_triggers(id) ON DELETE SET NULL,
  triggered_by_user        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN (
                               'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
                             )),
  current_step_number      integer NOT NULL DEFAULT 0,
  total_steps              integer NOT NULL,
  input_data               jsonb,
  error_message            text,
  error_step_number        integer,
  started_at               timestamptz,
  paused_at                timestamptz,
  completed_at             timestamptz,
  duration_ms              integer,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX idx_workflow_runs_tenant
  ON workflow_runs (tenant_id);
CREATE INDEX idx_workflow_runs_definition
  ON workflow_runs (workflow_definition_id);
CREATE INDEX idx_workflow_runs_tenant_status
  ON workflow_runs (tenant_id, status);
CREATE INDEX idx_workflow_runs_active
  ON workflow_runs (tenant_id, workflow_definition_id)
  WHERE status IN ('pending', 'running', 'paused');
CREATE INDEX idx_workflow_runs_trigger
  ON workflow_runs (trigger_id)
  WHERE trigger_id IS NOT NULL;
CREATE INDEX idx_workflow_runs_tenant_created
  ON workflow_runs (tenant_id, created_at DESC);

CREATE TRIGGER set_workflow_runs_updated_at
  BEFORE UPDATE ON workflow_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────────────
-- 4. workflow_step_runs
--    One row per step per run. Carries the full agent audit trail and data
--    flow chain between steps.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_step_runs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  workflow_run_id           uuid NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  sop_step_id              uuid NOT NULL REFERENCES tenant_sop_steps(id) ON DELETE CASCADE,
  step_number              integer NOT NULL,
  step_classification      text NOT NULL
                             CHECK (step_classification IN ('automated', 'hybrid', 'manual')),

  -- Status
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN (
                               'pending', 'running', 'awaiting_human', 'completed', 'failed', 'skipped'
                             )),

  -- Data flow
  input_data               jsonb,
  output_data              jsonb,

  -- Agent audit (populated for automated + hybrid steps)
  agent_key                text,
  agent_model              text,
  agent_tokens_input       integer DEFAULT 0,
  agent_tokens_output      integer DEFAULT 0,
  agent_system_prompt      text,
  agent_knowledge_injected jsonb,
  agent_messages_sent      jsonb,
  agent_response           jsonb,
  agent_execution_mode     text
                             CHECK (agent_execution_mode IS NULL OR agent_execution_mode IN (
                               'draft', 'review', 'automated'
                             )),

  -- Human edit (populated for hybrid steps)
  human_edited_output      jsonb,
  edited_by                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  edited_at                timestamptz,
  edits_applied            boolean DEFAULT false,

  -- Task link (populated for hybrid + manual steps)
  task_id                  uuid REFERENCES tenant_user_tasks(id) ON DELETE SET NULL,

  -- Error / retry
  error_message            text,
  retry_count              integer NOT NULL DEFAULT 0,
  max_retries              integer NOT NULL DEFAULT 1,

  -- Timing
  started_at               timestamptz,
  completed_at             timestamptz,
  duration_ms              integer,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),

  UNIQUE (workflow_run_id, step_number)
);

CREATE INDEX idx_step_runs_run_step
  ON workflow_step_runs (workflow_run_id, step_number);
CREATE INDEX idx_step_runs_active
  ON workflow_step_runs (workflow_run_id)
  WHERE status IN ('running', 'awaiting_human');
CREATE INDEX idx_step_runs_sop_step
  ON workflow_step_runs (sop_step_id);
CREATE INDEX idx_step_runs_task
  ON workflow_step_runs (task_id)
  WHERE task_id IS NOT NULL;
CREATE INDEX idx_step_runs_agent
  ON workflow_step_runs (agent_key)
  WHERE agent_key IS NOT NULL;

CREATE TRIGGER set_workflow_step_runs_updated_at
  BEFORE UPDATE ON workflow_step_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────────────
-- 5. ALTER tenant_user_tasks — add workflow linkage + expand source_type
-- ────────────────────────────────────────────────────────────────────────────

-- Add workflow FK columns
ALTER TABLE tenant_user_tasks
  ADD COLUMN workflow_run_id      uuid REFERENCES workflow_runs(id) ON DELETE SET NULL,
  ADD COLUMN workflow_step_run_id uuid REFERENCES workflow_step_runs(id) ON DELETE SET NULL;

-- Partial indexes for workflow-linked tasks
CREATE INDEX idx_user_tasks_workflow_run
  ON tenant_user_tasks (workflow_run_id)
  WHERE workflow_run_id IS NOT NULL;

CREATE INDEX idx_user_tasks_workflow_step_run
  ON tenant_user_tasks (workflow_step_run_id)
  WHERE workflow_step_run_id IS NOT NULL;

-- Expand source_type CHECK to include 'workflow'
ALTER TABLE tenant_user_tasks
  DROP CONSTRAINT tenant_user_tasks_source_type_check;

ALTER TABLE tenant_user_tasks
  ADD CONSTRAINT tenant_user_tasks_source_type_check
    CHECK (source_type IN ('agent_output', 'manual_trigger', 'scheduled', 'workflow'));


-- ════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- Pattern: platform_owner full access, tenant admins full on own tenant,
-- tenant users read-only on own tenant.
-- Backend writes via service_role bypass RLS.
-- ════════════════════════════════════════════════════════════════════════════

-- workflow_definitions -------------------------------------------------------
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owner full access" ON workflow_definitions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_owner')
  );

CREATE POLICY "Tenant admins manage own" ON workflow_definitions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super-admin', 'admin')
    )
  );

CREATE POLICY "Tenant users read own" ON workflow_definitions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- workflow_triggers ----------------------------------------------------------
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owner full access" ON workflow_triggers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_owner')
  );

CREATE POLICY "Tenant admins manage own" ON workflow_triggers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super-admin', 'admin')
    )
  );

CREATE POLICY "Tenant users read own" ON workflow_triggers
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- workflow_runs --------------------------------------------------------------
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owner full access" ON workflow_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_owner')
  );

CREATE POLICY "Tenant admins manage own" ON workflow_runs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super-admin', 'admin')
    )
  );

CREATE POLICY "Tenant users read own" ON workflow_runs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- workflow_step_runs ---------------------------------------------------------
ALTER TABLE workflow_step_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owner full access" ON workflow_step_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_owner')
  );

CREATE POLICY "Tenant admins manage own" ON workflow_step_runs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super-admin', 'admin')
    )
  );

CREATE POLICY "Tenant users read own" ON workflow_step_runs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
