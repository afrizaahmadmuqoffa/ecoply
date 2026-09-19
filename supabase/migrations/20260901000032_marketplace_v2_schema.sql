-- Marketplace V2: Standardized material, objective condition

-- Add new columns
ALTER TABLE public.waste_listings 
  ADD COLUMN IF NOT EXISTS is_sorted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_cleaned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_mixed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contaminant_note TEXT,
  ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;

-- Drop old subjective condition column (breaking change, dev only)
ALTER TABLE public.waste_listings DROP COLUMN IF EXISTS condition;

-- Add index for material_type (exact match filtering for recycler)
CREATE INDEX IF NOT EXISTS idx_waste_listings_material_type 
  ON public.waste_listings(material_type);

-- Add comments for documentation
COMMENT ON COLUMN public.waste_listings.is_sorted IS 'Material sudah dipilah berdasarkan jenis';
COMMENT ON COLUMN public.waste_listings.is_cleaned IS 'Material sudah dibersihkan/dicuci';
COMMENT ON COLUMN public.waste_listings.is_mixed IS 'Material tercampur dengan jenis lain';
COMMENT ON COLUMN public.waste_listings.contaminant_note IS 'Catatan kontaminan atau detail campuran';
COMMENT ON COLUMN public.waste_listings.pickup_instructions IS 'Instruksi khusus pickup (gedung, pintu, kontak, jam)';
COMMENT ON COLUMN public.waste_listings.address_text IS 'Alamat lengkap hasil reverse geocoding (auto-fill)';