'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { toggleActionItem } from '@/lib/supabase/actions/compliance-actions'
import { CalendarDays, Check, User } from 'lucide-react'

type Item = {
  id: string
  item_index: number
  task: string
  completed: boolean
  completed_at: string | null
  deadline_hint?: string
  owner_hint?: string
}

type Props = {
  items: Item[]
  jobId: string
}

export default function ActionItemList({ items, jobId }: Props) {
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.completed]))
  )
  const [pending, startTransition] = useTransition()

  function handleToggle(id: string) {
    const newVal = !states[id]
    setStates((s) => ({ ...s, [id]: newVal }))
    startTransition(async () => {
      const result = await toggleActionItem(id, newVal, jobId)
      if (result.error) {
        setStates((s) => ({ ...s, [id]: !newVal }))
        toast.error(result.error)
      }
    })
  }

  const completedCount = Object.values(states).filter(Boolean).length
  const progressPct = items.length ? (completedCount / items.length) * 100 : 0

  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
      {/* Header with progress */}
      <div className="px-5 py-4 border-b border-border bg-canvas/40">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
            Progress
          </span>
          <span className="text-sm font-extrabold text-ink tracking-tight tabular-nums">
            {completedCount}
            <span className="text-muted font-medium">/{items.length}</span>
          </span>
        </div>
        <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
          <div
            className="bg-sage h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.id}
            className={`px-5 py-4 flex items-start gap-3 transition-colors ${
              states[item.id] ? 'bg-mint/20' : 'hover:bg-canvas/40'
            }`}
          >
            <button
              onClick={() => handleToggle(item.id)}
              disabled={pending}
              className="flex-shrink-0 mt-0.5"
              aria-label={states[item.id] ? "Tandai belum selesai" : "Tandai selesai"}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                states[item.id]
                  ? 'bg-sage border-sage'
                  : 'border-border hover:border-sage'
              }`}>
                {states[item.id] && (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                )}
              </span>
            </button>
            <div className={`min-w-0 flex-1 transition-all ${states[item.id] ? 'opacity-60' : ''}`}>
              <p className={`text-sm text-ink leading-relaxed ${states[item.id] ? 'line-through' : 'font-medium'}`}>
                {item.task}
              </p>
              {(item.owner_hint || item.deadline_hint) && (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  {item.owner_hint && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted bg-canvas border border-border px-2 py-0.5 rounded-full">
                      <User className="w-3 h-3" strokeWidth={2} />
                      {item.owner_hint}
                    </span>
                  )}
                  {item.deadline_hint && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted bg-canvas border border-border px-2 py-0.5 rounded-full">
                      <CalendarDays className="w-3 h-3" strokeWidth={2} />
                      {item.deadline_hint}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}