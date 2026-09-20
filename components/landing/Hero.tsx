'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ClipboardCheck,
  Leaf,
  Recycle,
} from 'lucide-react'
import Magnetic from './Magnetic'

const capabilities = [
  { icon: ClipboardCheck, label: 'Compliance AI' },
  { icon: Leaf, label: 'Carbon Accounting' },
  { icon: Recycle, label: 'Circular Marketplace' },
]

const pillVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

export default function Hero() {
  return (
    <section className="bg-grain relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink text-white">
      {/* Grid halus */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        aria-hidden
      />

      {/* Aurora drifting */}
      <motion.div
        className="pointer-events-none absolute -left-32 top-[-10%] h-[34rem] w-[34rem] rounded-full bg-sage/25 blur-[130px]"
        animate={{ x: [0, 70, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-40 top-[20%] h-[30rem] w-[30rem] rounded-full bg-mint/15 blur-[130px]"
        animate={{ x: [0, -60, 0], y: [0, -50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-15%] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#7fbfa0]/20 blur-[140px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Cincin pulsing halus di belakang teks */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-sage/20"
            style={{
              width: 320 + i * 140,
              height: 320 + i * 140,
              left: -(320 + i * 140) / 2,
              top: -(320 + i * 140) / 2,
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.1, 0.45] }}
            transition={{
              duration: 7 + i * 2,
              repeat: Infinity,
              delay: i * 0.7,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Konten */}
      <div className="relative z-10 px-6 py-32 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-7 max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          Kepatuhan ESG, <em className="italic text-sage">dekarbonisasi,</em> dan{' '}
          <em className="italic text-sage">ekonomi sirkular.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-2xl text-base text-white/60 text-balance sm:text-lg"
        >
          Audit dokumen ESG berbasis AI berdasarkan regulasi Indonesia, kalkulasi emisi karbon Scope 1–3, dan marketplace
          ekonomi sirkular untuk perusahaan/umkm dan fasilitas daur ulang di
          Indonesia.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex w-full max-w-sm mx-auto flex-row items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:gap-4"
        >
          <Magnetic>
            <Link
              href="/signup"
              className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sage px-4 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-sage-dark hover:shadow-[0_22px_44px_-12px_rgba(85,158,123,0.6)] sm:flex-initial sm:px-7"
            >
              Mulai Gratis
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </Link>
          </Magnetic>
          <Link
            href="/login"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-3.5 font-semibold text-white backdrop-blur transition-all hover:bg-white/10 sm:flex-initial sm:px-7"
          >
            Masuk
          </Link>
        </motion.div>

        {/* Pills kapabilitas */}
        <motion.ul
          className="mt-14 flex flex-wrap items-center justify-center gap-2"
          initial="hidden"
          animate="show"
          variants={{
            show: {
              transition: { staggerChildren: 0.12, delayChildren: 0.55 },
            },
          }}
        >
          {capabilities.map((cap) => (
            <motion.li
              key={cap.label}
              variants={pillVariants}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/70 backdrop-blur sm:gap-2 sm:px-3 sm:text-xs"
            >
              <cap.icon className="h-3 w-3 text-sage sm:h-3.5 sm:w-3.5" strokeWidth={2} />
              {cap.label}
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Indikator scroll */}
      <div
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/40"
        aria-hidden
      >
        <span className="text-[10px] uppercase tracking-[0.22em]">Scroll</span>
        <motion.span
          className="block h-9 w-px bg-gradient-to-b from-sage to-transparent"
          animate={{ y: [0, 6, 0], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </section>
  )
}