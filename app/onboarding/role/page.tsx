'use client'

import { useState } from 'react'
import { selectRole } from '@/lib/supabase/actions/auth'
import OnboardingSteps from '@/app/onboarding/_components/OnboardingSteps'
import Logo from '@/components/Logo'
import { Building2, RefreshCw, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react'

type OnboardingRole = 'company' | 'recycler'

const roles: {
  value: OnboardingRole
  title: string
  desc: string
  points: string[]
}[] = [
  {
    value: 'company',
    title: 'Perusahaan',
    desc: 'Untuk perusahaan yang ingin memastikan kepatuhan ESG dan mengelola emisi karbon.',
    points: ['Audit dokumen ESG otomatis', 'Kalkulasi emisi Scope 1, 2 & 3', 'Daftarkan limbah ke marketplace'],
  },
  {
    value: 'recycler',
    title: 'Fasilitas Daur Ulang',
    desc: 'Untuk pengelola fasilitas daur ulang yang ingin mendapatkan pasokan material.',
    points: ['Terima listing limbah dari perusahaan', 'Ajukan penawaran harga', 'Dapatkan sertifikat transaksi'],
  },
]

const roleIcons: Record<OnboardingRole, React.ReactNode> = {
  company: (
    <Building2 className="w-6 h-6" strokeWidth={1.8} />
  ),
  recycler: (
    <RefreshCw className="w-6 h-6" strokeWidth={1.8} />
  ),
}

export default function SelectRolePage() {
  const [selected, setSelected] = useState<OnboardingRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) {
      setError('Pilih salah satu tipe akun untuk melanjutkan.')
      return
    }
    setError(null)
    setLoading(true)
    const result = await selectRole({ role: selected })
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, action redirects — no need to handle
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl animate-fade-in">
        {/* Brand mark */}
        <div className="flex justify-center mb-8">
          <Logo height={70} />
        </div>

        {/* Step indicator */}
        <div className="mb-10">
          <OnboardingSteps current={2} />
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
            Pilih tipe <span className="text-sage">akun.</span>
          </h1>
          <p className="mt-3 text-sm text-muted max-w-md mx-auto">
            Selamat datang! Pilih tipe akun yang sesuai dengan kebutuhan Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                aria-pressed={selected === r.value}
                className={`group relative text-left p-6 sm:p-7 rounded-[18px] border-2 transition-all duration-200 ${
                  selected === r.value
                    ? 'border-sage bg-mint/30 shadow-[0_24px_48px_-12px_rgba(11,31,22,0.12)]'
                    : 'border-border bg-surface hover:border-sage/50 hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selected === r.value ? 'bg-sage text-white' : 'bg-mint text-sage-dark'
                    }`}
                  >
                    {roleIcons[r.value]}
                  </span>
                  {selected === r.value && (
                    <span className="w-6 h-6 rounded-full bg-sage flex items-center justify-center flex-shrink-0 ring-4 ring-sage/20">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-ink tracking-tight mb-1">{r.title}</h3>
                <p className="text-xs text-muted mb-5 leading-relaxed">{r.desc}</p>
                <ul className="space-y-2 border-t border-border pt-4">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-ink/80">
                      <Check className="w-3.5 h-3.5 text-sage mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                      {p}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selected}
            className="group w-full bg-sage hover:bg-sage-dark text-white py-3.5 px-4 rounded-full text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Menyimpan...
              </>
            ) : (
              <>
                Lanjutkan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </>
            )}
          </button>

          {!selected && !error && (
            <p className="mt-3 text-center text-xs text-muted">
              Pilih salah satu tipe akun untuk melanjutkan.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}