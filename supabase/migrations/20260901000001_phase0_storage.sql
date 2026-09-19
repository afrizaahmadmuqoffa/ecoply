-- ============================================================
-- ECOPLY.AI — Phase 0: Storage Buckets & Policies
-- ============================================================
-- Supabase Storage uses the `storage` schema.
-- Buckets are rows in storage.buckets.
-- Access is controlled via storage.objects RLS policies.
-- ============================================================

-- ------------------------------------------------------------
-- CREATE BUCKETS
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Admin uploads ESG regulation documents (PDF, Word, etc.)
  (
    'regulation-docs',
    'regulation-docs',
    false,
    52428800, -- 50 MB
    array['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain']
  ),

  -- Companies upload legal documents for verification
  (
    'company-docs',
    'company-docs',
    false,
    52428800, -- 50 MB
    array['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg', 'image/png', 'image/webp']
  ),

  -- Waste listing photos — public read so recyclers can browse
  (
    'listing-photos',
    'listing-photos',
    true,
    10485760, -- 10 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),

  -- Recycler uploads pickup evidence photos — private
  (
    'pickup-evidence',
    'pickup-evidence',
    false,
    10485760, -- 10 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),

  -- System-generated recycling certificates — public read
  (
    'certificates',
    'certificates',
    true,
    5242880, -- 5 MB
    array['application/pdf']
  )

on conflict (id) do nothing;

-- ============================================================
-- STORAGE RLS POLICIES
-- Supabase Storage uses storage.objects with these columns:
--   bucket_id, name, owner, metadata, ...
-- auth.uid() returns the current user's UUID.
-- ============================================================

-- ------------------------------------------------------------
-- regulation-docs
-- Upload: admin only
-- Read:   admin + authenticated company/recycler (for audit use)
-- Delete: admin only
-- ------------------------------------------------------------

create policy "regulation-docs: admin can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'regulation-docs'
    and public.is_admin()
  );

create policy "regulation-docs: authenticated can read"
  on storage.objects for select
  using (
    bucket_id = 'regulation-docs'
    and auth.role() = 'authenticated'
  );

create policy "regulation-docs: admin can update"
  on storage.objects for update
  using (
    bucket_id = 'regulation-docs'
    and public.is_admin()
  );

create policy "regulation-docs: admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'regulation-docs'
    and public.is_admin()
  );

-- ------------------------------------------------------------
-- company-docs
-- Upload: company owner (path must start with their user_id)
-- Read:   owner + admin
-- Delete: admin only (preserve audit trail)
-- ------------------------------------------------------------

create policy "company-docs: owner can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'company-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "company-docs: owner can read"
  on storage.objects for select
  using (
    bucket_id = 'company-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

create policy "company-docs: owner can update"
  on storage.objects for update
  using (
    bucket_id = 'company-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "company-docs: admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'company-docs'
    and public.is_admin()
  );

-- ------------------------------------------------------------
-- listing-photos
-- Upload: verified company only (path: {user_id}/{listing_id}/...)
-- Read:   public (bucket is public, policy allows all reads)
-- Delete: owner or admin
-- ------------------------------------------------------------

create policy "listing-photos: company can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.current_user_role() = 'company'
  );

create policy "listing-photos: public read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "listing-photos: owner or admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

-- ------------------------------------------------------------
-- pickup-evidence
-- Upload: recycler who owns the pickup record
--         path: {user_id}/{manifest_id}/...
-- Read:   recycler owner + related company + admin
--         (simplified: recycler owner + admin for now;
--          company read added in Fase 5 when manifests table exists)
-- Delete: admin only
-- ------------------------------------------------------------

create policy "pickup-evidence: recycler can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'pickup-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.current_user_role() = 'recycler'
  );

create policy "pickup-evidence: owner or admin can read"
  on storage.objects for select
  using (
    bucket_id = 'pickup-evidence'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

create policy "pickup-evidence: admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'pickup-evidence'
    and public.is_admin()
  );

-- ------------------------------------------------------------
-- certificates
-- Upload: service role only (system generates PDFs)
--         We do NOT add an insert policy here — only the
--         service role client (admin.ts) can write.
-- Read:   public (bucket is public)
-- Delete: admin only
-- ------------------------------------------------------------

create policy "certificates: public read"
  on storage.objects for select
  using (bucket_id = 'certificates');

create policy "certificates: admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and public.is_admin()
  );
