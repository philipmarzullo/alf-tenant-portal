-- SOP Builder: add structured_content and created_via to tenant_documents
-- structured_content stores the editor's structured JSON (title, version, sections array)
-- created_via distinguishes builder-created ('builder') from uploaded ('upload') SOPs

ALTER TABLE tenant_documents
  ADD COLUMN IF NOT EXISTS structured_content JSONB DEFAULT NULL;

ALTER TABLE tenant_documents
  ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'upload';
