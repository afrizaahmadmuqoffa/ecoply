import type { Metadata } from 'next'
import { Fraunces, Geist } from 'next/font/google'
import Toaster from '@/components/ui/Toaster'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ECOPLY — Platform RegTech & Dekarbonisasi',
  description:
    'Platform terintegrasi untuk kepatuhan ESG, carbon accounting, dan circular economy marketplace.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
