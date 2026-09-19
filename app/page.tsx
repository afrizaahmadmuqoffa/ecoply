import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import Marquee from '@/components/landing/Marquee'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Tech from '@/components/landing/Tech'
import FinalCta from '@/components/landing/FinalCta'
import Footer from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <main
    data-landing
    className="min-h-screen bg-canvas text-ink"
  >
    <Nav />
    <Hero />
    <Marquee />
    <Features />
    <HowItWorks />
    <Tech />
    <FinalCta />
    <Footer />
  </main>
  )
}