'use client'

import { motion } from 'motion/react'
import Eyebrow from './Eyebrow'
import Reveal from './Reveal'

const steps = [
  {
    n: '01',
    title: 'Daftar & pilih peran',
    desc: 'Buat akun perusahaan/umkm atau fasilitas daur ulang.',
  },
  {
    n: '02',
    title: 'Audit dokumen',
    desc: 'Unggah dokumen ESG, AI membaca dan menilai kepatuhan terhadap regulasi.',
  },
  {
    n: '03',
    title: 'Hitung emisi',
    desc: 'Masukkan data aktivitas; emisi Scope 1–3 dihitung dan direkap otomatis.',
  },
  {
    n: '04',
    title: 'Transaksi sirkular',
    desc: 'Daftarkan limbah, terima penawaran atau kirim permintaan pickup, lalu dapatkan sertifikat transaksi.',
  },
]

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className="scroll-mt-24 bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <Eyebrow>02 — Cara Kerja</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
              Empat langkah, dari <em className="italic text-sage-dark">dokumen</em>{' '}
              hingga <em className="italic text-sage-dark">transaksi.</em>
            </h2>
          </div>
        </Reveal>

        <div className="relative mt-14 hidden h-px bg-border md:block">
          <motion.div
            className="absolute inset-0 origin-left bg-sage"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:mt-8 md:grid-cols-4 md:gap-6">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12} className="h-full">
              <div className="group h-full rounded-[18px] border border-border bg-canvas p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sage/40 hover:shadow-[0_18px_36px_-18px_rgba(11,31,22,0.16)]">
                <span className="font-mono text-sm font-bold tracking-tight text-sage-dark">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}