'use client'

const words = [
  'Compliance AI',
  'Carbon Accounting',
  'Circular Marketplace',
]

const REPEATS = 6

export default function Marquee() {
  return (
    <section
      aria-hidden
      className="relative overflow-hidden border-y border-white/10 bg-ink py-5"
    >
      <div className="flex w-max animate-marquee will-change-transform hover:[animation-play-state:paused]">
        {Array.from({ length: REPEATS }).map((_, copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {words.map((word, i) => (
              <span key={i} className="flex items-center">
                <span className="text-sm font-bold uppercase tracking-[0.22em] text-white/35">
                  {word}
                </span>
                <span className="mx-6 h-1.5 w-1.5 rounded-full bg-sage/50" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}