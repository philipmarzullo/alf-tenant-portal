-- Add execution tracking and auto-promotion columns to automation_preferences

ALTER TABLE automation_preferences
  ADD COLUMN IF NOT EXISTS total_executions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_approved_without_edit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_promote_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_promote_threshold INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_from TEXT,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Expand audit log action constraint to include auto_promoted
ALTER TABLE credential_audit_logs DROP CONSTRAINT IF EXISTS credential_audit_logs_action_check;
ALTER TABLE credential_audit_logs ADD CONSTRAINT credential_audit_logs_action_check
  CHECK (action IN ('created','updated','toggled','deleted','tested','connected','disconnected','refreshed','auto_promoted'));
