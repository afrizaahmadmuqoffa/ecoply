'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { Menu, X } from 'lucide-react'
import Magnetic from './Magnetic'
import Logo from '@/components/Logo'

const links = [
  { href: '#layanan', label: 'Layanan' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#teknologi', label: 'Teknologi' },
]

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink">
      <motion.div
        style={{ scaleX: progress }}
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-sage"
      />

      <div className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <Logo src="/logo-white.png" height={40} className="max-h-10 sm:max-h-12 lg:max-h-14" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors text-white/70 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Magnetic strength={0.2}>
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-white/80 transition-colors hover:text-white sm:inline-block"
            >
              Masuk
            </Link>
          </Magnetic>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-white transition-colors hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-4 h-4" strokeWidth={2} /> : <Menu className="w-4 h-4" strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-200 ${
          menuOpen ? 'max-h-64 border-b border-white/10 bg-ink' : 'max-h-0'
        }`}
      >
        <nav className="mx-auto max-w-6xl px-6 py-4 flex flex-col gap-3">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold text-white/80 transition-colors hover:text-white py-1"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-semibold text-white/60 transition-colors hover:text-white py-1 sm:hidden"
          >
            Masuk
          </Link>
        </nav>
      </div>
    </header>
  )
}