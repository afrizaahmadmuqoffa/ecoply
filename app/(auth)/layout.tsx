import Logo from '@/components/Logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* LEFT: Panel branding (desktop only) */}
      <aside className="hidden lg:flex lg:w-5/12 xl:w-[45%] relative overflow-hidden bg-sage flex-col justify-between p-12 xl:p-16 text-white">
        <div>
          {/* Logo mark */}
          <Logo src="/logo-white.png" height={50} />

          {/* Display headline dengan color-split */}
          <h1 className="mt-24 text-4xl xl:text-[3.25rem] font-extrabold tracking-tight leading-[1.05]">
            Engineered<br />
            for <span className="text-mint">Compliance</span><br />
            & Sustainability
          </h1>

          <p className="mt-6 text-white/75 max-w-sm leading-relaxed text-[15px]">
            Platform RegTech terpadu untuk mengelola regulasi ESG, pelaporan dekarbonisasi, dan kepatuhan perusahaan dalam satu sistem cerdas.
          </p>
        </div>

        {/* Wayfinding meta */}
        <div className="relative z-10 flex items-center justify-between text-xs tracking-[0.18em] uppercase text-white/60 pt-6">
          <span>Brand System</span>
          <span>v1.0 · {new Date().getFullYear()}</span>
        </div>

        {/* Pattern band dekoratif */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-40 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(30deg, rgba(255,255,255,.12) 25%, transparent 25%), linear-gradient(150deg, rgba(255,255,255,.12) 25%, transparent 25%)',
            backgroundSize: '56px 96px',
          }}
        />
      </aside>

      {/* RIGHT: Form area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo (terlihat hanya di mobile) */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo height={96} className="max-h-16" />
          </div>

          {children}

          {/* Footer micro-copy */}
          <p className="mt-8 text-center text-xs text-muted">
            Dengan melanjutkan, kamu menyetujui{' '}
            <a href="#" className="text-sage-dark hover:underline">Syarat</a> &{' '}
            <a href="#" className="text-sage-dark hover:underline">Privasi</a> kami.
          </p>
        </div>
      </main>
    </div>
  )
}