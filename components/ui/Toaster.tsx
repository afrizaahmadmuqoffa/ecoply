'use client'

import { Toaster as Sonner } from 'sonner'

export default function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          borderRadius: '16px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 600,
        },
      }}
    />
  )
}
