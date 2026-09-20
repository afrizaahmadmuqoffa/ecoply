import { Sparkles } from "lucide-react";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";

const orbitDots = [
  { top: 0, left: "50%", translate: "-50%", delay: 0 },
  { top: "50%", left: 0, translate: "-50%", delay: 1 },
  { top: "50%", left: "100%", translate: "-50%", delay: 2 },
  { top: "100%", left: "50%", translate: "-50%", delay: 3 },
];

export default function Tech() {
  return (
    <section
      id="teknologi"
      className="bg-grain relative scroll-mt-24 overflow-hidden bg-ink py-24 text-white sm:py-32"
    >
      {/* Aurora */}
      <div
        className="pointer-events-none absolute right-[-15%] top-[-20%] h-[30rem] w-[30rem] rounded-full bg-sage/20 blur-[140px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-25%] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-mint/10 blur-[140px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        {/* Orbit abstrak */}
        <Reveal>
          <div className="relative mx-auto mb-10 h-24 w-24">
            <span
              className="absolute inset-0 rounded-full border border-white/15"
              aria-hidden
            />
            <div className="absolute inset-0" aria-hidden>
              {orbitDots.map((dot) => (
                <span
                  key={dot.delay}
                  className="absolute h-2.5 w-2.5 rounded-full border border-sage bg-ink"
                  style={{
                    top: dot.top,
                    left: dot.left,
                    transform: `translate(${dot.translate}, ${dot.translate})`,
                  }}
                />
              ))}
            </div>
            <span
              className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage"
              aria-hidden
            />
          </div>
        </Reveal>

        <Reveal>
          <Eyebrow dark>03 — Teknologi</Eyebrow>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            AI yang membaca{" "}
            <em className="italic text-mint">teks regulasi asli</em> sebelum
            menilai dokumen Anda.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            Sistem mengambil pasal regulasi yang relevan lebih dulu, baru
            menyusun penilaian kepatuhan.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_-10px_rgba(85,158,123,0.6)]">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Gemini AI
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
