-- Recycler V2: certifications dengan evidence file
-- Ubah certifications dari text[] ke jsonb agar bisa simpan name + file_url

-- Tambah storage bucket untuk sertifikat recycler
INSERT INTO storage.buckets (id, name, public)
VALUES ('recycler-certs', 'recycler-certs', true)
ON CONFLICT (id) DO NOTHING;

-- Alter column certifications jadi jsonb
ALTER TABLE public.recycler_details 
  ALTER COLUMN certifications TYPE jsonb 
  USING certifications::jsonb;

-- Default value untuk jsonb
ALTER TABLE public.recycler_details 
  ALTER COLUMN certifications SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.recycler_details.certifications IS 
  'Array of {name: string, file_url: string, uploaded_at: string}';

-- Recycler bisa upload & manage sertifikatnya sendiri
CREATE POLICY "Recyclers can upload their own certs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recycler-certs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Recyclers can view their own certs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recycler-certs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Recyclers can delete their own certs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recycler-certs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin bisa lihat semua
CREATE POLICY "Admins can view all certs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recycler-certs'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);