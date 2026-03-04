-- Drop the rigid CHECK constraint on tenant_documents.department.
-- The UI dropdown + workspace department_keys provide sufficient validation.
-- The constraint blocked valid departments like 'safety' and 'ops'.
ALTER TABLE tenant_documents DROP CONSTRAINT IF EXISTS tenant_documents_department_check;
