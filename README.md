# ECOPLY.AI

Platform RegTech & Dekarbonisasi untuk perusahaan di Indonesia.

## Fitur Utama

- **Compliance AI** — Audit otomatis dokumen ESG menggunakan LLM + RAG
- **Carbon Accounting** — Kalkulasi emisi Scope 1, 2, dan 3 dengan cross-check anti-greenwashing
- **Circular Economy Marketplace** — Matching limbah perusahaan dengan fasilitas daur ulang

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript strict, Tailwind CSS |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| AI | Gemini API (`gemini-2.0-flash-lite` + `gemini-embedding-001`) |
| Extensions | pgvector (RAG), PostGIS (location matching) |
| Deploy | Vercel |

## Struktur Folder

```
app/
  (auth)/           # Login & signup (route group, tidak ada layout wrapper)
  onboarding/
    role/           # Step 3: pilih role setelah verifikasi email
    profile/
      company/      # Step 4: setup profil perusahaan
      recycler/     # Step 4: setup profil recycler
  company/          # Dashboard & fitur untuk role company
  recycler/         # Dashboard & fitur untuk role recycler
  admin/            # Panel admin
  auth/callback/    # Handler redirect dari email Supabase

lib/
  supabase/
    client.ts       # Browser client
    server.ts       # Server Component client (SSR)
    admin.ts        # Service role client (bypasses RLS)
    actions/
      auth.ts       # Server Actions: signUp, signIn, selectRole, setupProfile, signOut
  validators/
    auth.ts         # Zod schemas untuk semua form auth

types/
  supabase.ts       # Database types (generate ulang setelah migration)
  roles.ts          # UserRole, VerificationStatus enums

supabase/
  migrations/       # SQL migrations per fase
  email-templates/  # Template HTML email Supabase
  config.toml       # Konfigurasi Supabase local dev
```

## Alur Registrasi

```
/signup
  ↓ isi nama + email + password
  ↓ kirim email konfirmasi

[klik link di email]
  ↓ /auth/callback → exchange code → session

/onboarding/role
  ↓ pilih: Perusahaan atau Recycler

/onboarding/profile/company   (atau /recycler)
  ↓ isi data profil

/company/dashboard   (atau /recycler/dashboard)
```

## Setup Development

### 1. Clone & install

```bash
git clone <repo>
cd ecoply-ai
npm install
```

### 2. Environment variables

Salin `.env.example` ke `.env.local` dan isi nilai-nilainya:

```bash
cp .env.example .env.local
```

| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `GEMINI_API_KEY` | API key Google Gemini |
| `GEMINI_MODEL` | Model generasi teks (`gemini-2.0-flash-lite`) |
| `GEMINI_EMBEDDING_MODEL` | Model embedding (`gemini-embedding-001`) |
| `NEXT_PUBLIC_SITE_URL` | URL app (`http://localhost:3000` untuk dev) |

### 3. Supabase setup

**a. Aktifkan ekstensi** di Supabase Dashboard → Database → Extensions:
- `vector` (pgvector)
- `postgis`
- `uuid-ossp`

**b. Jalankan migrations** secara berurutan di SQL Editor atau via CLI:

```bash
npx supabase db push
```

Urutan migration:
1. `20260901000000_phase0_foundation.sql` — tabel, RLS, helper functions
2. `20260901000001_phase0_storage.sql` — storage buckets & policies

**c. Konfigurasi Auth** di Supabase Dashboard → Authentication:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: tambahkan `http://localhost:3000/**`

**d. Pasang email template** di Authentication → Email Templates → Confirm signup:
- Salin isi `supabase/email-templates/confirmation.html`
- Subject: `Aktivasi Akun ECOPLY.AI — Konfirmasi Email Anda`
- Lihat `supabase/email-templates/README.md` untuk panduan lengkap

**e. Storage buckets** dibuat otomatis via migration SQL. Bucket yang tersedia:
- `regulation-docs` — dokumen regulasi ESG (private, admin only)
- `company-docs` — dokumen legal perusahaan (private)
- `listing-photos` — foto listing limbah (public)
- `pickup-evidence` — foto bukti pengambilan (private)
- `certificates` — sertifikat daur ulang PDF (public)

### 4. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### 5. Generate Supabase types (setelah migration applied)

```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

## Build

```bash
npm run build
```

## Role & Akses

| Role | Akses |
|---|---|
| `company` | `/company/*` — compliance, carbon, marketplace |
| `recycler` | `/recycler/*` — marketplace, profil fasilitas |
| `admin` | `/admin/*` — verifikasi entitas, regulasi, konfigurasi karbon |

RBAC diimplementasikan di dua layer:
1. **Proxy (middleware)** — redirect berdasarkan role
2. **Supabase RLS** — policy di level database, tidak bisa di-bypass dari frontend

## Fase Pengembangan

| Fase | Status | Deskripsi |
|---|---|---|
| 0 | ✅ Selesai | Fondasi: auth, RBAC, skema DB, storage |
| 0b | ✅ Selesai | Flow registrasi 4-step, email template |
| 1 | 🔜 | Admin Foundation: verifikasi, regulasi, emission factors |
| 2 | ⏳ | Compliance AI (RAG + Gemini) |
| 3 | ⏳ | Carbon Accounting |
| 4 | ⏳ | Marketplace |
| 5 | ⏳ | Fulfillment & Sertifikat |
| 6 | ⏳ | Admin lanjutan & Anti-fraud |
| 7 | ⏳ | Performance, security, observability |





