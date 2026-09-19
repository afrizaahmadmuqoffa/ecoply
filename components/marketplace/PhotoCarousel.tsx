'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, FileText, FlaskConical, Leaf, Recycle, Wrench, Zap } from 'lucide-react'

interface PhotoCarouselProps {
  photos: string[]
  materialType: string
  category: string
  height?: string
}

const CATEGORY_STYLES: Record<string, { gradient: string; iconBg: string; icon: React.ReactNode }> = {
  Plastik: {
    gradient: 'from-sky-100 via-sky-50 to-blue-50',
    iconBg: 'bg-sky-500',
    icon: (
      <Recycle className="w-8 h-8 text-white" strokeWidth={1.8} />
    ),
  },
  Kertas: {
    gradient: 'from-amber-100 via-amber-50 to-yellow-50',
    iconBg: 'bg-amber-500',
    icon: (
      <FileText className="w-8 h-8 text-white" strokeWidth={1.8} />
    ),
  },
  Logam: {
    gradient: 'from-zinc-200 via-zinc-100 to-slate-50',
    iconBg: 'bg-zinc-600',
    icon: (
      <Wrench className="w-8 h-8 text-white" strokeWidth={1.8} />
    ),
  },
  Kaca: {
    gradient: 'from-cyan-100 via-cyan-50 to-sky-50',
    iconBg: 'bg-cyan-500',
    icon: (
      <FlaskConical className="w-8 h-8 text-white" strokeWidth={1.8} />
    ),
  },
  Organik: {
    gradient: 'from-sage/30 via-mint/40 to-sage/10',
    iconBg: 'bg-sage',
    icon: (
      <Leaf className="w-8 h-8 text-white" strokeWidth={1.8} />
    ),
  },
  Elektronik: {
    gradient: 'from-purple-100 via-purple-50 to-fuchsia-50',
    iconBg: 'bg-purple-500',
    icon: (
      <Zap className="w-8 h-8 text-white" strokeWidth={1.8} />
    ),
  },
}

const FALLBACK = {
  gradient: 'from-canvas to-sage/10',
  iconBg: 'bg-sage',
  icon: (
    <Recycle className="w-8 h-8 text-white" strokeWidth={1.8} />
  ),
}

export default function PhotoCarousel({
  photos,
  materialType,
  category,
  height = 'h-80',
}: PhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const hasPhotos = photos && photos.length > 0
  const totalPhotos = hasPhotos ? photos.length : 0

  useEffect(() => {
    if (!hasPhotos) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos)
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % totalPhotos)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasPhotos, totalPhotos])

  const goToPrev = () => {
    if (totalPhotos === 0) return
    setActiveIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos)
  }

  const goToNext = () => {
    if (totalPhotos === 0) return
    setActiveIndex((prev) => (prev + 1) % totalPhotos)
  }

  // Placeholder
  if (!hasPhotos) {
    const style = CATEGORY_STYLES[category] || FALLBACK

    return (
      <div className={`${height} bg-gradient-to-br ${style.gradient} rounded-[22px] flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
        <span className={`w-20 h-20 rounded-2xl ${style.iconBg} flex items-center justify-center mb-3 shadow-[0_12px_24px_-12px_rgba(11,31,22,0.3)] relative`}>
          {style.icon}
        </span>
        <span className="text-sm font-extrabold tracking-tight text-ink relative">{category}</span>
        <span className="text-xs text-muted mt-1 relative">{materialType}</span>
        <span className="text-[10px] font-bold tracking-wider uppercase text-muted mt-3 relative">Tidak ada foto</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className={`relative ${height} bg-canvas rounded-[22px] overflow-hidden group shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)]`}>
        <Image
          src={photos[activeIndex]}
          alt={`${materialType} - Foto ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority={activeIndex === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
        />

        {/* Counter badge */}
        {totalPhotos > 1 && (
          <div className="absolute top-4 right-4 bg-ink/80 backdrop-blur-md text-white text-[11px] font-bold tracking-wider tabular-nums px-3 py-1.5 rounded-full">
            {activeIndex + 1} / {totalPhotos}
          </div>
        )}

        {/* Prev button */}
        {totalPhotos > 1 && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_-8px_rgba(11,31,22,0.25)] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft className="w-5 h-5 text-ink" strokeWidth={2.5} />
          </button>
        )}

        {/* Next button */}
        {totalPhotos > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_-8px_rgba(11,31,22,0.25)] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Foto berikutnya"
          >
            <ChevronRight className="w-5 h-5 text-ink" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {totalPhotos > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all ${
                index === activeIndex
                  ? 'ring-2 ring-sage ring-offset-2 ring-offset-surface shadow-[0_4px_8px_-4px_rgba(85,158,123,0.3)]'
                  : 'ring-1 ring-border hover:ring-border/70 opacity-60 hover:opacity-100'
              }`}
              aria-label={`Lihat foto ${index + 1}`}
            >
              <Image
                src={photo}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
              {index === activeIndex && (
                <div className="absolute inset-0 ring-2 ring-sage/50 rounded-xl pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}