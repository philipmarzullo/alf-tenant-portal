-- ============================================================
-- Fix 1: tenant-logos — restrict writes to platform admins only
-- (Only Alf platform admins upload logos via Brand tab)
-- ============================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete tenant logos" ON storage.objects;

-- Replace with platform-admin-only write access
CREATE POLICY "Platform admins can upload tenant logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

CREATE POLICY "Platform admins can update tenant logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

CREATE POLICY "Platform admins can delete tenant logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

-- ============================================================
-- Fix 2: platform-backups — add storage object policies
-- Bucket is private, but add explicit policies for defense in depth
-- ============================================================

CREATE POLICY "Platform admins can read backups"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'platform-backups'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

CREATE POLICY "Platform admins can write backups"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'platform-backups'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

CREATE POLICY "Platform admins can delete backups"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'platform-backups'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

-- ============================================================
-- Fix 3: alf_backups table — enable RLS + add policies
-- Backend uses service role (bypasses RLS), but this prevents
-- any direct Supabase client queries from leaking across tenants
-- ============================================================

ALTER TABLE alf_backups ENABLE ROW LEVEL SECURITY;

-- Service role (backend) bypasses RLS automatically — no policy needed

-- Platform admins see all backups
CREATE POLICY "Platform admins full access to backups"
  ON alf_backups FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('platform_owner', 'super-admin')
  );

-- Tenant users can see their own tenant's backups (read-only)
CREATE POLICY "Tenant users see own backups"
  ON alf_backups FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
