-- Rename "Agent Knowledge" → "Knowledge Base" in tenant_nav_sections items
UPDATE tenant_nav_sections
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN item->>'label' = 'Agent Knowledge'
      THEN jsonb_set(item, '{label}', '"Knowledge Base"')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE section_key = 'admin'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'label' = 'Agent Knowledge'
  );

-- Remove "Analytics Chat" from analytics nav section items
UPDATE tenant_nav_sections
SET items = (
  SELECT jsonb_agg(item)
  FROM jsonb_array_elements(items) AS item
  WHERE item->>'key' != 'analytics-chat'
)
WHERE section_key = 'analytics'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'key' = 'analytics-chat'
  );

-- Rename in module registry
UPDATE tenant_module_registry
SET label = 'Knowledge Base'
WHERE module_key = 'knowledge'
  AND label = 'Agent Knowledge';
