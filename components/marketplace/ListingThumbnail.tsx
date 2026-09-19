'use client'

import Image from 'next/image'
import { Camera, FileText, FlaskConical, Leaf, Recycle, Wrench, Zap } from 'lucide-react'

interface ListingThumbnailProps {
  photos: string[]
  materialType: string
  category: string
  className?: string
}

// Gradient per kategori
const CATEGORY_STYLES: Record<string, { gradient: string; iconBg: string; icon: React.ReactNode }> = {
  Plastik: {
    gradient: 'from-sky-100 via-sky-50 to-blue-50',
    iconBg: 'bg-sky-500',
    icon: (
      <Recycle className="w-6 h-6 text-white" strokeWidth={1.8} />
    ),
  },
  Kertas: {
    gradient: 'from-amber-100 via-amber-50 to-yellow-50',
    iconBg: 'bg-amber-500',
    icon: (
      <FileText className="w-6 h-6 text-white" strokeWidth={1.8} />
    ),
  },
  Logam: {
    gradient: 'from-zinc-200 via-zinc-100 to-slate-50',
    iconBg: 'bg-zinc-600',
    icon: (
      <Wrench className="w-6 h-6 text-white" strokeWidth={1.8} />
    ),
  },
  Kaca: {
    gradient: 'from-cyan-100 via-cyan-50 to-sky-50',
    iconBg: 'bg-cyan-500',
    icon: (
      <FlaskConical className="w-6 h-6 text-white" strokeWidth={1.8} />
    ),
  },
  Organik: {
    gradient: 'from-sage/30 via-mint/40 to-sage/10',
    iconBg: 'bg-sage',
    icon: (
      <Leaf className="w-6 h-6 text-white" strokeWidth={1.8} />
    ),
  },
  Elektronik: {
    gradient: 'from-purple-100 via-purple-50 to-fuchsia-50',
    iconBg: 'bg-purple-500',
    icon: (
      <Zap className="w-6 h-6 text-white" strokeWidth={1.8} />
    ),
  },
}

const FALLBACK = {
  gradient: 'from-canvas to-sage/10',
  iconBg: 'bg-sage',
  icon: (
    <Recycle className="w-6 h-6 text-white" strokeWidth={1.8} />
  ),
}

export default function ListingThumbnail({
  photos,
  materialType,
  category,
  className = 'h-40',
}: ListingThumbnailProps) {
  const hasPhoto = photos && photos.length > 0

  if (hasPhoto) {
    return (
      <div className={`relative w-full ${className} overflow-hidden bg-canvas`}>
        <Image
          src={photos[0]}
          alt={`${materialType} - ${category}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Subtle gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/40 to-transparent pointer-events-none" />

        {/* Photo count badge */}
        {photos.length > 1 && (
          <div className="absolute top-3 right-3 bg-ink/70 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Camera className="w-3 h-3" strokeWidth={2.5} />
            +{photos.length - 1}
          </div>
        )}

        {/* Category tag bottom-left */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-ink text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded">
            {category}
          </span>
        </div>
      </div>
    )
  }

  // Placeholder
  const style = CATEGORY_STYLES[category] || FALLBACK

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center`}>
      {/* Decorative dots pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '16px 16px'
      }} />

      <span className={`w-14 h-14 rounded-[14px] ${style.iconBg} flex items-center justify-center mb-2 shadow-[0_8px_16px_-8px_rgba(11,31,22,0.25)]`}>
        {style.icon}
      </span>
      <span className="text-xs font-bold tracking-tight text-ink">{category}</span>
      <span className="text-[11px] text-muted mt-0.5">{materialType}</span>
    </div>
  )
}