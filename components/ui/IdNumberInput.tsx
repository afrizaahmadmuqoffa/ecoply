'use client'

import { useId } from 'react'
import { Check, AlertTriangle, HelpCircle, Circle } from 'lucide-react'
import {
  ID_NUMBER_SPEC,
  messagesFor,
  stripDigits,
  type IdNumberKind,
} from '@/lib/utils/idnumbers'

type Size = 'lg' | 'md'

type Props = {
  kind: IdNumberKind
  label?: string
  value: string
  onChange: (digits: string) => void
  required?: boolean
  optionalHint?: string
  size?: Size
  className?: string
  autoComplete?: string
}

const SIZE_CLS: Record<Size, { input: string; label: string; meta: string }> = {
  lg: {
    input:
      'w-full px-4 py-3 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all',
    label:
      'block text-xs font-semibold text-ink uppercase tracking-wider mb-2',
    meta: 'text-xs',
  },
  md: {
    input:
      'w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all',
    label: 'block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5',
    meta: 'text-[10px]',
  },
}

export default function IdNumberInput({
  kind,
  label,
  value,
  onChange,
  required = false,
  optionalHint,
  size = 'lg',
  className = '',
  autoComplete = 'off',
}: Props) {
  const spec = ID_NUMBER_SPEC[kind]
  const uid = useId()
  const inputId = `${uid}-input`
  const statusId = `${uid}-status`
  const hintId = `${uid}-hint`

  const digits = value || ''
  const status = messagesFor(kind, digits)
  const invalid = digits.length > 0 && !spec.isValid(digits)

  const toDigits = (raw: string) => stripDigits(raw).slice(0, spec.maxLength)

  return (
    <div className={className}>
      {(label || optionalHint) && (
        <div className={SIZE_CLS[size].label}>
          {label} {required && <span className="text-sage-dark">*</span>}{' '}
          {optionalHint && (
            <span className="text-muted font-normal normal-case tracking-normal">
              ({optionalHint})
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete={autoComplete}
          spellCheck={false}
          value={spec.format(digits)}
          onChange={(e) => {
            onChange(toDigits(e.target.value))
          }}
          onPaste={(e) => {
            e.preventDefault()
            onChange(toDigits(e.clipboardData.getData('text')))
          }}
          aria-invalid={invalid}
          aria-describedby={`${statusId} ${hintId}`}
          className={`${SIZE_CLS[size].input} font-mono pr-10`}
          placeholder={`${spec.maxLength} digit`}
        />
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${SIZE_CLS[size].meta}`}
          aria-hidden="true"
        >
          {status.tone === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
          ) : status.tone === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
          ) : (
            <Circle className="w-4 h-4 text-muted/40" strokeWidth={2.5} />
          )}
        </span>
      </div>

      <div
        id={statusId}
        className={`${SIZE_CLS[size].meta} mt-1.5 flex items-center gap-1.5 ${
          status.tone === 'success'
            ? 'text-emerald-700'
            : status.tone === 'warning'
              ? 'text-amber-700'
              : 'text-muted'
        }`}
      >
        <span>{status.text}</span>
        <span className="ml-auto font-semibold tabular-nums">
          {status.counter}
        </span>
      </div>

      <details
        id={hintId}
        className={`group ${SIZE_CLS[size].meta} mt-1.5 text-muted`}
      >
        <summary className="cursor-pointer list-none flex items-center gap-1.5 hover:text-sage-dark transition-colors w-fit">
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={2.2} />
          <span>Di mana menemukan nomor ini?</span>
        </summary>
        <p className="mt-1 pl-5 leading-relaxed">{spec.source}</p>
      </details>
    </div>
  )
}