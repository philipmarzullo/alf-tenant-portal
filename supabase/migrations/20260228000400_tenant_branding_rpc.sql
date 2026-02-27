-- Formalize branding columns (added via Studio) and create pre-auth RPC

-- Ensure branding columns exist (idempotent)
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS brand_display_name TEXT;
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS brand_primary_color TEXT;
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS brand_sidebar_bg TEXT;

-- Public RPC for pre-auth branding lookup (login page needs branding before sign-in)
-- SECURITY DEFINER: bypasses RLS but only exposes non-sensitive branding fields
CREATE OR REPLACE FUNCTION get_tenant_branding(p_tenant_id UUID)
RETURNS TABLE (
    company_name TEXT,
    brand_display_name TEXT,
    brand_logo_url TEXT,
    brand_primary_color TEXT,
    brand_sidebar_bg TEXT
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT company_name, brand_display_name, brand_logo_url, brand_primary_color, brand_sidebar_bg
    FROM alf_tenants WHERE id = p_tenant_id AND is_active = true;
$$;
