# Email Templates — ECOPLY.AI

Template email ini dikonfigurasi di **Supabase Dashboard → Authentication → Email Templates**.

## Cara pasang template

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project
2. Masuk ke **Authentication → Email Templates**
3. Pilih template **Confirm signup**
4. Salin isi `confirmation.html` ke kolom **Body (HTML)**
5. Ganti **Subject** dengan:
   ```
   Aktivasi Akun ECOPLY.AI — Konfirmasi Email Anda
   ```
6. Klik **Save**

## Variabel template yang tersedia

| Variabel | Keterangan |
|---|---|
| `{{ .ConfirmationURL }}` | URL aktivasi yang digenerate Supabase |
| `{{ .Email }}` | Email user yang mendaftar |
| `{{ .SiteURL }}` | URL aplikasi (diset di Auth settings) |

## Konfigurasi URL redirect

Di **Authentication → URL Configuration**:
- **Site URL**: `https://yourdomain.com` (production) atau `http://localhost:3000` (dev)
- **Redirect URLs** (tambahkan semua):
  ```
  http://localhost:3000/**
  https://yourdomain.com/**
  ```

Supabase akan otomatis menggunakan `emailRedirectTo` yang dikirim saat `signUp()` 
(lihat `lib/supabase/actions/auth.ts`), yang mengarahkan ke:
```
/auth/callback?next=/onboarding/role
```
