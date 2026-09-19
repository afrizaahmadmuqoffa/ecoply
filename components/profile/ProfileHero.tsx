import type { ReactNode } from 'react'

type Props = {
  avatarUrl?: string | null
  avatarAlt: string
  fallback: ReactNode
  eyebrow: string
  name: string
  badges?: ReactNode
  address?: ReactNode
  footer?: ReactNode
}

export default function ProfileHero({
  avatarUrl,
  avatarAlt,
  fallback,
  eyebrow,
  name,
  badges,
  address,
  footer,
}: Props) {
  return (
    <div className="bg-gradient-to-br from-mint/40 via-sage/5 to-surface border border-sage/20 rounded-[22px] p-6 sm:p-8 mb-6 shadow-[0_12px_24px_-16px_rgba(85,158,123,0.12)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-sage/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/3" />

      <div className="flex items-start gap-5 flex-wrap relative">
        <div className="w-20 h-20 rounded-2xl bg-sage text-white flex items-center justify-center flex-shrink-0 overflow-hidden text-3xl font-extrabold shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] ring-4 ring-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={avatarAlt} className="w-full h-full object-cover" />
          ) : (
            fallback
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-2">
            {eyebrow}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight break-words">
            {name}
          </h1>
          {badges && <div className="flex items-center gap-2 flex-wrap mt-3">{badges}</div>}
          {address}
        </div>
      </div>

      {footer && (
        <div className="relative mt-6 pt-5 border-t border-sage/15">
          {footer}
        </div>
      )}
    </div>
  )
}