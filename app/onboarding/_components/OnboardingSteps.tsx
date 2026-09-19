import { Check } from 'lucide-react'

const STEPS = ['Daftar', 'Verifikasi email', 'Pilih tipe akun', 'Lengkapi profil']

export default function OnboardingSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-3" aria-label="Progres onboarding">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <span
                aria-hidden
                className={`h-px w-4 sm:w-8 ${i <= current ? 'bg-sage' : 'bg-border'}`}
              />
            )}
            <span className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  done
                    ? 'bg-sage text-white'
                    : active
                      ? 'bg-ink text-white ring-4 ring-ink/10'
                      : 'bg-surface border border-border text-muted'
                }`}
              >
                {done ? (
                  <Check className="w-3 h-3" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  active ? 'text-ink inline' : done ? 'text-muted hidden md:inline' : 'text-muted hidden md:inline'
                }`}
              >
                {label}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}