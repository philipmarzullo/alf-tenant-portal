-- Add 'super-admin' to the allowed profile roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('platform_owner', 'super-admin', 'admin', 'manager', 'user'));
