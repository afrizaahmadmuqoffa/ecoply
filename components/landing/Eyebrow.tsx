import type { ReactNode } from 'react'

export default function Eyebrow({
  children,
  dark = false,
}: {
  children: ReactNode
  dark?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-[11px] font-bold tracking-[0.18em] uppercase ${
        dark ? 'text-mint' : 'text-sage-dark'
      }`}
    >
      <span className={`h-px w-6 ${dark ? 'bg-mint/60' : 'bg-sage/60'}`} />
      {children}
    </span>
  )
}