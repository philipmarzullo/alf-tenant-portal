-- Backup tracking table + storage bucket
CREATE TABLE IF NOT EXISTS alf_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('tenant', 'platform')),
  tenant_id UUID REFERENCES alf_tenants(id) ON DELETE SET NULL,
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  triggered_by_name TEXT,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  row_count INTEGER,
  table_summary JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alf_backups_created ON alf_backups(created_at DESC);

-- Storage bucket for backup files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-backups', 'platform-backups', false)
ON CONFLICT (id) DO NOTHING;
