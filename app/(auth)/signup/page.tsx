'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/supabase/actions/auth'
import type { SignUpInput } from '@/lib/validators/auth'
import { Mail, AlertTriangle, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const [form, setForm] = useState<SignUpInput>({
    email: '',
    password: '',
    fullName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signUp(form)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="bg-surface rounded-[18px] shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)] border border-border p-8 text-center">
        <div className="w-16 h-16 bg-mint rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-mint/40">
          <Mail className="w-7 h-7 text-sage-dark" strokeWidth={2.5} />
        </div>
        <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-3">
          Verifikasi Email
        </span>
        <h2 className="text-xl font-bold text-ink mb-2 tracking-tight">Cek inbox email kamu</h2>
        <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
          Link aktivasi sudah dikirim ke{' '}
          <span className="font-semibold text-ink">{form.email}</span>.
          Klik link tersebut untuk melanjutkan pendaftaran.
        </p>
        <div className="mt-6 pt-6 border-t border-border flex flex-col gap-2">
          <p className="text-xs text-muted">
            Tidak menerima email? Periksa folder spam atau{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-sage-dark hover:text-sage font-semibold underline-offset-2 hover:underline"
            >
              coba daftar ulang
            </button>
          </p>
          <Link
            href="/login"
            className="text-sm text-ink hover:text-sage-dark font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-[18px] shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)] border border-border p-8 sm:p-10">
      {/* Color-split headline */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
        Buat akun<br />
        <span className="text-sage">baru.</span>
      </h1>
      <p className="mt-3 text-sm text-muted">
        Gratis, tanpa kartu kredit. Mulai perjalanan dekarbonisasimu.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
            Nama Lengkap
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoFocus
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="w-full px-4 py-3 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder="Nama lengkap"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder="nama@perusahaan.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-3 pr-12 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Min. 8 karakter"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-sage" />
            Minimal 8 karakter, mengandung huruf kapital dan angka
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3.5 px-4 rounded-full text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Mendaftar...
            </>
          ) : (
            <>
              Daftar Sekarang
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-ink hover:text-sage-dark font-semibold underline-offset-4 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}