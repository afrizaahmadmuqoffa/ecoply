import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/supabase/actions/auth'
import Logo from '@/components/Logo'
import { ArrowRight, AlertTriangle, LogOut, Clock, Lock } from 'lucide-react'

export const metadata = {
  title: 'Menunggu Verifikasi | ECOPLY',
}

export default async function VerifyBlockedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <NonVerifiedShell
        icon="lock"
        title="Halaman terbatas"
        description="Anda harus masuk untuk melihat status verifikasi akun."
        action={
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-sage text-white text-sm font-semibold hover:bg-sage-dark hover:-translate-y-0.5 transition-all hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)]"
          >
            Masuk
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        }
      />
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, verification_status')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Terverifikasi → tidak perlu ada di halaman ini
  if (profile.verification_status === 'verified') redirect('/dashboard')

  const isRejected = profile.verification_status === 'rejected'

  // Ambil catatan penolakan terakhir (user pemilik berhak membaca request-nya)
  let rejectNote: string | null = null
  if (isRejected) {
    const { data: req } = await supabase
      .from('verification_requests')
      .select('note, reviewed_at')
      .eq('requested_by', user.id)
      .eq('status', 'rejected')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    rejectNote = req?.note || null
  }

  const fixProfileHref =
    profile.role === 'recycler' ? '/recycler/profile' : '/company/profile'

  return (
    <NonVerifiedShell
      icon={isRejected ? 'alert' : 'clock'}
      title={isRejected ? 'Profil Ditolak' : 'Menunggu Verifikasi'}
      description={
        isRejected
          ? 'Profil Anda belum lolos verifikasi admin. Perbaiki data sesuai catatan, lalu kirim ulang untuk ditinjau kembali.'
          : 'Profil Anda sedang ditinjau oleh tim ECOPLY. Anda akan mendapat akses penuh setelah diverifikasi.'
      }
    >
      {isRejected && rejectNote && (
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50/60 p-5 text-left shadow-[0_12px_24px_-16px_rgba(220,38,38,0.2)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-red-700" strokeWidth={2.5} />
            </span>
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
              Catatan dari Admin
            </p>
          </div>
          <p className="text-sm text-red-700 leading-relaxed pl-8">{rejectNote}</p>
        </div>
      )}

      <div className="w-full max-w-md space-y-3 mt-4">
        {isRejected ? (
          <Link
            href={fixProfileHref}
            className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-sage text-white text-sm font-semibold hover:bg-sage-dark hover:-translate-y-0.5 transition-all hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)]"
          >
            Perbaiki & Kirim Ulang
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </Link>
        ) : (
          <>
            <div className="w-full rounded-2xl border border-sage/30 bg-mint/30 p-5 text-left shadow-[0_12px_24px_-16px_rgba(11,31,22,0.12)]">
              <p className="text-xs font-bold text-sage-dark uppercase tracking-wider mb-3">
                Langkah verifikasi
              </p>
              <ol className="space-y-3">
                {[
                  'Admin meninjau data profil & dokumen Anda',
                  'Akun diverifikasi (biasanya 1-2 hari kerja)',
                  'Anda mendapat akses penuh ke platform',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink">
                    <span className="w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="w-full py-3.5 rounded-full border border-border bg-surface text-ink text-sm font-semibold hover:border-sage hover:text-sage-dark transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Akun
          </button>
        </form>
      </div>
    </NonVerifiedShell>
  )
}

function NonVerifiedShell({
  icon,
  title,
  description,
  children,
  action,
}: {
  icon: 'clock' | 'lock' | 'alert'
  title: string
  description: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  const iconConfig = {
    clock: {
      el: (
        <Clock className="w-8 h-8" strokeWidth={1.8} />
      ),
      ring: 'bg-mint text-sage-dark ring-mint/60',
    },
    lock: {
      el: (
        <Lock className="w-8 h-8" strokeWidth={1.8} />
      ),
      ring: 'bg-canvas text-muted ring-border',
    },
    alert: {
      el: (
        <AlertTriangle className="w-8 h-8" strokeWidth={1.8} />
      ),
      ring: 'bg-red-50 text-red-700 ring-red-200',
    },
  }

  const { el, ring } = iconConfig[icon]

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* Brand mark */}
        <div className="flex items-center mb-10">
          <Logo height={70} />
        </div>

        {/* Icon hero */}
        <div
          className={`w-20 h-20 rounded-[22px] ring-8 ${ring} flex items-center justify-center shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)]`}
        >
          {el}
        </div>

        {/* Wayfinding label */}
        <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mt-6 mb-3">
          Status Akun
        </span>

        {/* Color-split headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          {title.includes('Menunggu') ? (
            <>
              Menunggu <span className="text-sage">Verifikasi.</span>
            </>
          ) : title.includes('Ditolak') ? (
            <>
              Profil <span className="text-red-600">Ditolak.</span>
            </>
          ) : title.includes('terbatas') ? (
            <>
              Halaman <span className="text-sage">Terbatas.</span>
            </>
          ) : (
            title
          )}
        </h1>

        <p className="mt-3 text-sm text-muted leading-relaxed max-w-sm">
          {description}
        </p>

        {action && <div className="mt-6 w-full max-w-md">{action}</div>}

        {children && <div className="mt-2 w-full flex flex-col items-center">{children}</div>}

        {/* Footer micro-copy */}
        <p className="mt-10 text-xs text-muted">
          Butuh bantuan?{' '}
          <a href="mailto:support@ECOPLY" className="text-sage-dark hover:underline font-medium">
            Hubungi support
          </a>
        </p>
      </div>
    </div>
  )
}