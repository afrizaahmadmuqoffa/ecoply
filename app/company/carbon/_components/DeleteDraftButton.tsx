'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  deleteCombustion,
  deleteVehicle,
  deleteFugitive,
  deleteEnergy,
  deleteS3C1,
  deleteS3C2,
} from '@/lib/supabase/actions/carbon-activity'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Trash2 } from 'lucide-react'

type ActivityType = 'combustion' | 'vehicle' | 'fugitive' | 'energy' | 's3c1' | 's3c2'

const deleteActions: Record<ActivityType, (id: string) => Promise<{ error?: string; success?: boolean }>> = {
  combustion: deleteCombustion,
  vehicle: deleteVehicle,
  fugitive: deleteFugitive,
  energy: deleteEnergy,
  s3c1: deleteS3C1,
  s3c2: deleteS3C2,
}

const typeLabels: Record<ActivityType, string> = {
  combustion: 'kegiatan pembakaran',
  vehicle: 'kendaraan',
  fugitive: 'emisi fugitif',
  energy: 'energi',
  s3c1: 'draft Scope 3 kategori 1',
  s3c2: 'draft Scope 3 kategori 2',
}

type Props = {
  id: string
  type: ActivityType
}

export default function DeleteDraftButton({ id, type }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const deleteFn = deleteActions[type]
    const result = await deleteFn(id)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      setConfirming(false)
      return
    }

    toast.success(`Draft ${typeLabels[type]} berhasil dihapus`)
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
        title="Hapus draft ini"
      >
        <Trash2 className="w-4 h-4" strokeWidth={2} />
      </button>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleDelete}
        loading={loading}
        title="Hapus Draft?"
        message="Draft aktivitas ini akan dihapus permanen dan tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
      />
    </>
  )
}