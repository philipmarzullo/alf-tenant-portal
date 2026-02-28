-- Add brand_website_url to alf_tenants and expose via branding RPC

ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS brand_website_url TEXT;

-- Recreate RPC to include the new column
CREATE OR REPLACE FUNCTION get_tenant_branding(p_tenant_id UUID)
RETURNS TABLE (
    company_name TEXT,
    brand_display_name TEXT,
    brand_logo_url TEXT,
    brand_primary_color TEXT,
    brand_sidebar_bg TEXT,
    brand_website_url TEXT
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT company_name, brand_display_name, brand_logo_url, brand_primary_color, brand_sidebar_bg, brand_website_url
    FROM alf_tenants WHERE id = p_tenant_id AND is_active = true;
$$;
