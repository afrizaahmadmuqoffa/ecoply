'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/supabase/actions/auth'
import type { SignInInput } from '@/lib/validators/auth'
import { AlertTriangle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm] = useState<SignInInput>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signIn(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, signIn() redirects — no need to handle here
  }

  return (
    <div className="bg-surface rounded-[18px] shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)] border border-border p-8 sm:p-10">

      {/* Color-split headline */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
        Selamat datang<br />
        <span className="text-sage">kembali.</span>
      </h1>
      <p className="mt-3 text-sm text-muted">
        Lanjutkan perjalanan dekarbonisasimu bersama ECOPLY
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Password
            </label>
            <a href="#" className="text-xs text-sage-dark hover:underline font-medium">
              Lupa password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-3 pr-12 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="••••••••"
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
              Memverifikasi...
            </>
          ) : (
            <>
              Masuk
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted">
          Belum punya akun?{' '}
          <Link href="/signup" className="text-ink hover:text-sage-dark font-semibold underline-offset-4 hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}