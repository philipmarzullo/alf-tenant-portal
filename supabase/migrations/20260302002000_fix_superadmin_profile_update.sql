-- Fix: super-admin users could not update other profiles in their tenant.
-- The profiles_update RLS policy only checked for 'admin', not 'super-admin'.

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
    id = auth.uid()
    OR (auth_user_role() IN ('admin', 'super-admin') AND tenant_id = auth_user_tenant_id())
    OR auth_user_role() = 'platform_owner'
);

-- Also fix INSERT policy for consistency (super-admin should be able to create users)
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
    auth_user_role() = 'platform_owner'
    OR (auth_user_role() IN ('admin', 'super-admin') AND tenant_id = auth_user_tenant_id())
);
