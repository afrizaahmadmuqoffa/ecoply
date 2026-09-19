'use client'

import { motion } from 'motion/react'
import { Check, ClipboardCheck, Leaf, Recycle } from 'lucide-react'
import Eyebrow from './Eyebrow'
import Reveal from './Reveal'

const features = [
  {
    icon: ClipboardCheck,
    title: 'Compliance AI',
    desc: 'AI membaca dokumen ESG Anda dan mengecek kepatuhannya terhadap regulasi Indonesia yang berlaku.',
    points: [
      'Regulasi ditarik dari basis data yang bisa diperbarui kapan saja',
      'Penilaian dipecah per pasal regulasi, bukan skor tunggal',
      'Rekomendasi perbaikan ditulis untuk tiap pasal yang gagal',
    ],
  },
  {
    icon: Leaf,
    title: 'Carbon Accounting',
    desc: 'Kalkulasi emisi Scope 1, 2, dan 3 dengan pendekatan yang konsisten dan terdokumentasi.',
    points: [
      'Pelacakan Scope 1, 2 & 3',
      'Faktor emisi & unit terstandar',
      'Rekap terpusat siap dilaporkan',
    ],
  },
  {
    icon: Recycle,
    title: 'Circular Marketplace',
    desc: 'Perusahaan mendaftarkan limbah, fasilitas daur ulang menawar atau menerima permintaan pickup langsung.',
    points: [
      'Fasilitas daur ulang bisa menawar listing Anda, atau Anda kirim permintaan pickup langsung',
      'Negosiasi langsung antara perusahaan/umkm dan fasilitas daur ulang',
      'Sertifikat transaksi digital untuk tiap kesepakatan',
    ],
  },
]

export default function Features() {
  return (
    <section
      id="layanan"
      className="scroll-mt-24 bg-canvas py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <Eyebrow>01 — Kapabilitas</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
              Satu platform untuk <em className="italic text-sage-dark">tiga pilar</em>{' '}
              keberlanjutan.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Dari kepatuhan, kalkulasi karbon emisi, hingga transaksi sirkular. ECOPLY menutup celah
              yang biasanya terpisah di banyak platform.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.1} className="h-full">
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                className="group h-full rounded-[18px] border border-border bg-surface p-8 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)] transition-shadow duration-300 hover:border-sage/40 hover:shadow-[0_30px_56px_-22px_rgba(11,31,22,0.18)]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-sage-dark transition-colors duration-300 group-hover:bg-sage group-hover:text-white">
                    <feature.icon className="h-7 w-7" strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-xs text-muted/60">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.desc}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
                  {feature.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-ink/75"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage"
                        strokeWidth={2.5}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}