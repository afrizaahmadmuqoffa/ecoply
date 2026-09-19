-- Tambah kolom location & address_text ke companies
-- (address_text hasil reverse geocoding, location untuk RPC radius)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS location geography(Point),
  ADD COLUMN IF NOT EXISTS address_text text;

-- Index untuk performa query radius
CREATE INDEX IF NOT EXISTS idx_companies_location_gist
  ON public.companies USING GIST (location);

COMMENT ON COLUMN public.companies.location IS 'Koordinat fasilitas untuk radius search';
COMMENT ON COLUMN public.companies.address_text IS 'Alamat hasil reverse geocoding (auto-fill)';