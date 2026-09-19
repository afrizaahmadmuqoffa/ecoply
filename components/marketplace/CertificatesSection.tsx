'use client'

import { useState } from 'react'
import { BadgeCheck, Download, Eye, FileText, X } from 'lucide-react'
import ProfileCardHeader from '@/components/profile/ProfileCardHeader'

export type Certification = {
  name: string
  file_url: string
  uploaded_at: string
}

type Props = {
  certifications: Certification[]
  accent?: 'recycler' | 'company'
}

export default function CertificatesSection({ certifications, accent = 'recycler' }: Props) {
  const [viewingCert, setViewingCert] = useState<Certification | null>(null)
  const CertIcon = accent === 'company' ? FileText : BadgeCheck

  return (
    <>
      <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
        <ProfileCardHeader
          icon={<CertIcon className="w-4 h-4" strokeWidth={2} />}
          title="Sertifikasi"
          subtitle="Dokumen bukti sertifikasi"
          count={certifications.length}
        />

        {certifications.length > 0 ? (
          <div className="space-y-2">
            {certifications.map((cert) => (
              <div
                key={cert.file_url}
                className="flex items-center gap-3 p-4 bg-canvas border border-border rounded-xl hover:border-sage/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                  <CertIcon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink tracking-tight truncate">{cert.name}</p>
                  <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                    {new Date(cert.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setViewingCert(cert)}
                  className="group/btn inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-[11px] font-semibold rounded-full transition-all hover:-translate-y-0.5 flex-shrink-0"
                >
                  Lihat
                  <Eye className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-canvas border border-border rounded-xl p-6 text-center">
            <CertIcon className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-muted">Belum ada sertifikasi</p>
          </div>
        )}
      </div>

      {/* Cert preview modal */}
      {viewingCert && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-[22px] max-w-2xl w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                  <CertIcon className="w-5 h-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                    Sertifikasi
                  </span>
                  <h3 className="text-base font-extrabold text-ink tracking-tight truncate">
                    {viewingCert.name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 tabular-nums">
                    Diupload{' '}
                    {new Date(viewingCert.uploaded_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingCert(null)}
                className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 bg-canvas flex justify-center items-center min-h-[300px] max-h-[60vh] overflow-hidden">
              {viewingCert.file_url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewingCert.file_url}
                  alt={viewingCert.name}
                  className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-[0_8px_16px_-8px_rgba(11,31,22,0.12)]"
                />
              ) : (
                <iframe
                  src={viewingCert.file_url}
                  title={viewingCert.name}
                  className="w-full h-[55vh] rounded-xl border border-border bg-surface shadow-inner"
                />
              )}
            </div>

            <div className="px-6 py-5 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setViewingCert(null)}
                className="px-5 py-2.5 border border-border hover:border-sage hover:text-sage-dark text-ink text-sm font-semibold rounded-full transition-all"
              >
                Tutup
              </button>
              <a
                href={viewingCert.file_url}
                download
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
              >
                <Download className="w-4 h-4" strokeWidth={2.5} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}