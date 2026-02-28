-- OAuth support: portal_url for callback redirects + expanded audit log actions

-- Add portal_url column for OAuth callback redirects
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS portal_url TEXT;

-- Set A&A's portal URL
UPDATE alf_tenants SET portal_url = 'https://aa-portal-08cq.onrender.com' WHERE slug = 'aaefs';

-- Expand audit log action constraint to include OAuth actions
ALTER TABLE credential_audit_logs DROP CONSTRAINT IF EXISTS credential_audit_logs_action_check;
ALTER TABLE credential_audit_logs ADD CONSTRAINT credential_audit_logs_action_check
  CHECK (action IN ('created','updated','toggled','deleted','tested','connected','disconnected','refreshed'));
