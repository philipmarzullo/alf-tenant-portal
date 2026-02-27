-- Tenant Tiers: Update A&A to Galaxy, insert 2 demo tenants
-- Melmac (basic) / Orbit (mid) / Galaxy (enterprise)

-- 1. Update A&A to galaxy tier (idempotent — safe if first run partially applied)
UPDATE alf_tenants
SET plan = 'galaxy'
WHERE slug = 'aaefs';

-- 2. Insert Greenfield Property Group — Melmac tier
INSERT INTO alf_tenants (
  company_name, slug, plan,
  enabled_modules, max_users
) VALUES (
  'Greenfield Property Group',
  'greenfield',
  'melmac',
  ARRAY['hr', 'finance', 'ops'],
  10
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert Summit Facilities Management — Orbit tier
INSERT INTO alf_tenants (
  company_name, slug, plan,
  enabled_modules, max_users
) VALUES (
  'Summit Facilities Management',
  'summit-fm',
  'orbit',
  ARRAY['hr', 'finance', 'purchasing', 'sales', 'ops', 'qbu'],
  25
)
ON CONFLICT (slug) DO NOTHING;
