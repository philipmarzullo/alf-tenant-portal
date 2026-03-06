-- Fix delete policy: only super-admin/admin can delete submissions in their org
-- Previously restricted to created_by = auth.uid(), which silently fails

DROP POLICY IF EXISTS "Users can delete their own submissions" ON tool_submissions;

CREATE POLICY "Admins can delete their tenant submissions"
  ON tool_submissions FOR DELETE
  USING (
    tenant_id = auth_user_tenant_id()
    AND auth_user_role() IN ('super-admin', 'admin', 'platform_owner')
  );

-- Also add UPDATE policy (needed for status changes, re-saves)
DROP POLICY IF EXISTS "Users can update their tenant submissions" ON tool_submissions;

CREATE POLICY "Users can update their tenant submissions"
  ON tool_submissions FOR UPDATE
  USING (
    tenant_id = auth_user_tenant_id()
  );
