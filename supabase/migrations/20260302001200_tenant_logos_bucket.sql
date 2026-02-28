-- Create public storage bucket for tenant logos
-- Public because logos are loaded pre-auth (login page, get_tenant_branding RPC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to tenant logos
CREATE POLICY "Public read access for tenant logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

-- Allow authenticated users to upload/update/delete tenant logos
CREATE POLICY "Authenticated users can manage tenant logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tenant-logos');

CREATE POLICY "Authenticated users can update tenant logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "Authenticated users can delete tenant logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tenant-logos');
