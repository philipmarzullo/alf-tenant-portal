-- QBU file storage: bucket for photos + generated PPTX decks
-- Photos stored as files instead of base64 blobs in JSONB (prevents DB bloat)

-- 1. Create private bucket for QBU files (photos + decks)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qbu-files', 'qbu-files', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies — tenant users can manage files under their tenant prefix
CREATE POLICY "Tenant users can upload qbu files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qbu-files'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can read own qbu files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'qbu-files'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can delete own qbu files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'qbu-files'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- 3. Add column for stored PPTX deck path
ALTER TABLE tool_submissions ADD COLUMN IF NOT EXISTS deck_path text;
