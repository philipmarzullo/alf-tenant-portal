-- Tool Submissions
-- Single table for all tool-generated documents (QBU reviews, proposals, transition plans, etc.)

CREATE TABLE IF NOT EXISTS tool_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
  tool_key text NOT NULL,
  title text,
  form_data jsonb DEFAULT '{}',
  agent_output text,
  status text DEFAULT 'complete',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by tenant + tool
CREATE INDEX IF NOT EXISTS idx_tool_submissions_tenant_tool
  ON tool_submissions(tenant_id, tool_key, created_at DESC);

-- RLS
ALTER TABLE tool_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: users can see submissions from their own tenant
CREATE POLICY "Users can view their tenant submissions"
  ON tool_submissions FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: users can insert submissions for their own tenant
CREATE POLICY "Users can create submissions for their tenant"
  ON tool_submissions FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: users can delete their own submissions
CREATE POLICY "Users can delete their own submissions"
  ON tool_submissions FOR DELETE
  USING (
    created_by = auth.uid()
  );
