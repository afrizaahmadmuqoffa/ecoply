'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'

export default function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 220, damping: 15 })
  const springY = useSpring(y, { stiffness: 220, damping: 15 })

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
  }

  function handleLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </motion.div>
  )
}