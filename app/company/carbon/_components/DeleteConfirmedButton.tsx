'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteConfirmedEntry } from '@/lib/supabase/actions/carbon-activity'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Trash2 } from 'lucide-react'

type ActivityType = 'combustion' | 'vehicle' | 'fugitive' | 'energy' | 's3c1' | 's3c2'

type Props = {
  id: string
  type: ActivityType
}

const typeLabels: Record<ActivityType, string> = {
  combustion: 'entri pembakaran',
  vehicle: 'entri kendaraan',
  fugitive: 'entri fugitif',
  energy: 'entri energi',
  s3c1: 'entri Scope 3 kategori 1',
  s3c2: 'entri Scope 3 kategori 2',
}

export default function DeleteConfirmedButton({ id, type }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteConfirmedEntry({ id, type })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      setConfirming(false)
      return
    }

    toast.success(`Entri ${typeLabels[type]} berhasil dihapus`)
    setConfirming(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setConfirming(true)
        }}
        disabled={loading}
        className="w-8 h-8 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
        title="Hapus entri confirmed ini"
      >
        <Trash2 className="w-4 h-4" strokeWidth={2} />
      </button>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleDelete}
        loading={loading}
        title="Hapus Entri?"
        message="Entri ini akan dihapus permanen beserta seluruh perhitungan emisinya."
        confirmLabel="Ya, Hapus"
      />
    </>
  )
}