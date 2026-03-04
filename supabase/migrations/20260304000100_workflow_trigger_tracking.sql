-- Add trigger tracking columns to prevent double-firing and show next run
ALTER TABLE workflow_triggers ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;
ALTER TABLE workflow_triggers ADD COLUMN IF NOT EXISTS next_trigger_at TIMESTAMPTZ;
