import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  subtitle?: string
  count?: number
  className?: string
}

export default function ProfileCardHeader({ icon, title, subtitle, count, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 mb-5 ${className}`}>
      <span className="w-9 h-9 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
        {icon}
      </span>
      <div className="min-w-0">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
          {title}
        </span>
        {subtitle && <p className="text-xs font-semibold text-ink mt-0.5">{subtitle}</p>}
      </div>
      {typeof count === 'number' && count > 0 && (
        <span className="ml-auto w-7 h-7 rounded-full bg-sage/20 text-sage-dark flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">
          {count}
        </span>
      )}
    </div>
  )
}