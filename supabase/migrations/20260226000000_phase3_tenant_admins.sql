-- Phase 3: Promote A&A admin users
-- These three users get tenant admin role so they can manage users and access admin pages.

UPDATE profiles SET role = 'admin'
WHERE email IN ('pmarzullo@aaefs.com', 'arod@aaefs.com', 'mcd@aaefs.com')
  AND role NOT IN ('admin', 'platform_owner');
