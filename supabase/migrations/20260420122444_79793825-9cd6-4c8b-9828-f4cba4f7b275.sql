-- Tambah kolom profil
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS bio text;

-- Tambah kolom dokumen driver
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS sim_url text,
  ADD COLUMN IF NOT EXISTS stnk_url text,
  ADD COLUMN IF NOT EXISTS sim_expiry date,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS avatars
DROP POLICY IF EXISTS "Avatars publicly viewable" ON storage.objects;
CREATE POLICY "Avatars publicly viewable" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects 
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects 
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS driver-documents
DROP POLICY IF EXISTS "Drivers read own docs" ON storage.objects;
CREATE POLICY "Drivers read own docs" ON storage.objects 
  FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Drivers upload own docs" ON storage.objects;
CREATE POLICY "Drivers upload own docs" ON storage.objects 
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Drivers update own docs" ON storage.objects;
CREATE POLICY "Drivers update own docs" ON storage.objects 
  FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Drivers delete own docs" ON storage.objects;
CREATE POLICY "Drivers delete own docs" ON storage.objects 
  FOR DELETE TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admin read driver docs" ON storage.objects;
CREATE POLICY "Admin read driver docs" ON storage.objects 
  FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents' AND public.has_role(auth.uid(), 'admin'));