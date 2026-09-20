import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Eyebrow from './Eyebrow'
import Magnetic from './Magnetic'
import Reveal from './Reveal'

export default function FinalCta() {
  return (
    <section id="mulai" className="scroll-mt-24 bg-canvas py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="bg-grain relative overflow-hidden rounded-[28px] bg-ink px-6 py-20 text-center text-white sm:px-16 sm:py-24">
            {/* Aurora */}
            <div
              className="pointer-events-none absolute left-1/2 top-[-40%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-sage/30 blur-[120px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-[-45%] left-[10%] h-[22rem] w-[22rem] rounded-full bg-mint/15 blur-[120px]"
              aria-hidden
            />

            <div className="relative z-10 mx-auto max-w-2xl">
              <Eyebrow dark>04 — Mulai</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Segera audit <em className="italic text-sage">kepatuhan</em>{' '}
                &amp; <em className="italic text-sage">dekarbonisasi</em> Anda.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
                Daftar sebagai perusahaan/umkm atau fasilitas daur ulang, gratis
                dan tanpa kartu kredit.
              </p>

              <div className="mt-10 flex w-full max-w-sm mx-auto flex-row items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:gap-4">
                <Magnetic>
                  <Link
                    href="/signup"
                    className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sage px-4 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-sage-dark hover:shadow-[0_22px_44px_-12px_rgba(85,158,123,0.6)] sm:flex-initial sm:px-7"
                  >
                    Buat Akun
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
                  Login
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}