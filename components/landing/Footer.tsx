import Link from 'next/link'
import Logo from '@/components/Logo'

const platformLinks = [
  { href: '#layanan', label: 'Layanan' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#teknologi', label: 'Teknologi' },
]

const accountLinks = [
  { href: '/login', label: 'Login' },
  { href: '/signup', label: 'Signup' },
]

export default function Footer() {
  return (
    <footer className="bg-grain relative border-t border-white/10 bg-ink text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/">
              <Logo src="/logo-white.png" height={64} />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Kepatuhan ESG, dekarbonisasi, dan ekonomi sirkular dalam satu
              platform terintegrasi untuk Indonesia.
            </p>
          </div>

          <div className="flex gap-14">
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-sage">
                Platform
              </p>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-sage">
                Akun
              </p>
              <ul className="space-y-2.5">
                {accountLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/40">
          <span>© {new Date().getFullYear()} ECOPLY</span>
          <span className="font-mono">Platform ESG &amp; Dekarbonisasi</span>
        </div>
      </div>
    </footer>
  )
}