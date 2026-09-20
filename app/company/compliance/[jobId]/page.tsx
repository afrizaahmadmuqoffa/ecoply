import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, AlertCircle, HelpCircle, Info, Loader2 } from "lucide-react"
import RegulationCitedCard from "./_components/RegulationCitedCard"
import type {
  AuditFinding,
  AuditEvidence,
  AuditRecommendation,
  AuditActionItem,
} from "@/lib/gemini/compliance"
import ActionItemList from "./_components/ActionItemList"
import EvidenceSourcePanel, {
  type AreaSource,
} from "./_components/EvidenceSourcePanel"
import StatusPoller from "../_components/StatusPoller"

type RegulationCited = {
  id: string;
  title: string;
  excerpts?: string[];
}

const statusConfig = {
  compliant: {
    label: "Patuh",
    classes: "text-sage-dark bg-mint border-sage/30",
    heroBg: "from-mint to-sage/20",
    icon: (
      <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
    ),
  },
  partial: {
    label: "Sebagian Patuh",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    heroBg: "from-amber-50 to-amber-100/50",
    icon: (
      <AlertTriangle className="w-5 h-5" strokeWidth={2} />
    ),
  },
  non_compliant: {
    label: "Tidak Patuh",
    classes: "text-red-700 bg-red-50 border-red-200",
    heroBg: "from-red-50 to-red-100/50",
    icon: (
      <AlertTriangle className="w-5 h-5" strokeWidth={2} />
    ),
  },
  not_assessed: {
    label: "Tidak Dinilai",
    classes: "text-muted bg-canvas border-border",
    heroBg: "from-canvas to-border/30",
    icon: (
      <HelpCircle className="w-5 h-5" strokeWidth={2} />
    ),
  },
}

const findingStatus = {
  compliant: { label: "Patuh", barColor: "border-l-sage", textColor: "text-sage-dark", iconBg: "bg-sage" },
  partial: { label: "Sebagian", barColor: "border-l-amber-500", textColor: "text-amber-700", iconBg: "bg-amber-500" },
  non_compliant: { label: "Tidak Patuh", barColor: "border-l-red-500", textColor: "text-red-700", iconBg: "bg-red-500" },
  not_assessed: { label: "Tidak Dinilai", barColor: "border-l-border", textColor: "text-muted", iconBg: "bg-muted" },
}

const priorityConfig = {
  high: {
    label: "Prioritas Tinggi",
    classes: "text-red-700 bg-red-50 border-red-200",
    iconBg: "bg-red-100 text-red-700",
    icon: (
      <AlertCircle className="w-3 h-3" strokeWidth={3} />
    ),
  },
  medium: {
    label: "Prioritas Sedang",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    icon: (
      <AlertCircle className="w-3 h-3" strokeWidth={3} />
    ),
  },
  low: {
    label: "Prioritas Rendah",
    classes: "text-muted bg-canvas border-border",
    iconBg: "bg-canvas border border-border text-muted",
    icon: (
      <AlertCircle className="w-3 h-3" strokeWidth={3} />
    ),
  },
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: job }, { data: report }] = await Promise.all([
    supabase
      .from("audit_jobs")
      .select("id, document_name, status, created_at, completed_at, company_id")
      .eq("id", jobId)
      .single(),
    supabase.from("audit_reports").select("*").eq("job_id", jobId).single(),
  ])

  if (!job) notFound()

  if (job.status !== "done" || !report) {
    return (
      <div>
        <StatusPoller status={job.status} />
        <Link
          href="/company/compliance"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          Kembali
        </Link>
        <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-muted animate-spin" />
          </div>
          <p className="text-sm text-muted">
            {job.status === "processing"
              ? "Dokumen sedang diproses..."
              : job.status === "queued"
                ? "Menunggu diproses..."
                : "Audit gagal. Coba upload ulang dokumen."}
          </p>
        </div>
      </div>
    )
  }

  const { data: actionItemRows } = await supabase
    .from("audit_action_items")
    .select("id, item_index, task, completed, completed_at")
    .eq("report_id", report.id)
    .order("item_index")

  const findings = report.findings as AuditFinding[]
  const recommendations = report.recommendations as AuditRecommendation[]
  const actionItems = report.action_items as AuditActionItem[]
  const regulationsCited = report.regulations_cited as RegulationCited[]
  const overallStatus = statusConfig[report.compliance_status as keyof typeof statusConfig]

  // Full-text sources the model actually saw (persisted as area_rag)
  const areaSources = (report.area_rag as AreaSource[] | null) ?? []
  const areaSourceMap = new Map(areaSources.map((s) => [s.area, s]))
  const regulationFullTexts = new Map<string, string[]>()
  for (const s of areaSources) {
    for (const r of s.regulations) {
      const list = regulationFullTexts.get(r.regulation_id) ?? []
      if (!list.includes(r.text_chunk)) list.push(r.text_chunk)
      regulationFullTexts.set(r.regulation_id, list)
    }
  }

  const findingCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const hasActionItems = actionItemRows && actionItemRows.length > 0
  const hasRegulations = regulationsCited.length > 0
  const hasSidebar = hasActionItems || hasRegulations

  return (
    <div>
      {/* Back link + breadcrumb */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <Link
          href="/company/compliance"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          Kembali ke daftar audit
        </Link>
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href="/company/compliance" className="hover:text-sage-dark transition-colors">
            Audit
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-ink font-semibold truncate max-w-[240px]">{job.document_name}</span>
        </nav>
      </div>

      {/* Hero header with status */}
      <div className={`bg-gradient-to-br ${overallStatus.heroBg} border border-border rounded-[22px] p-6 sm:p-8 lg:p-10 mb-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]`}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-5">
          <div className="min-w-0 w-full sm:w-auto sm:flex-1">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-2">
              Laporan Audit
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight leading-tight break-words">
              {job.document_name}
            </h1>
            <p className="text-xs text-muted mt-3 tabular-nums flex items-center flex-wrap gap-x-1">
              <span>
                Diaudit{" "}
                {job.completed_at
                  ? new Date(job.completed_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
              {report.model_version && (
                <>
                  <span aria-hidden className="mx-2 w-1 h-1 rounded-full bg-muted/40 inline-block" />
                  <span>Model: <span className="font-mono">{report.model_version}</span></span>
                </>
              )}
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border flex-shrink-0 ${overallStatus.classes}`}>
            {overallStatus.icon}
            {overallStatus.label}
          </span>
        </div>

        {report.summary && (
          <div className="bg-surface/80 backdrop-blur rounded-xl p-5 lg:p-6 border border-border/50 mb-5">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-2">
              Ringkasan Eksekutif
            </p>
            <p className="text-sm text-ink leading-relaxed max-w-4xl">{report.summary}</p>
          </div>
        )}

        {/* Finding summary pills */}
        {findings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(findingCounts).map(([status, count]) => {
              const s = findingStatus[status as keyof typeof findingStatus]
              if (!s) return null
              return (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-surface border border-border"
                >
                  <span className={`w-2 h-2 rounded-full ${s.iconBg}`} />
                  <span className="text-ink">{count}</span>
                  <span className="text-muted">{s.label}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Main grid: content (left) + sidebar (right) */}
      <div className={`grid grid-cols-1 gap-6 ${hasSidebar ? 'lg:grid-cols-12' : ''} items-start`}>
        {/* Main column: Findings + Recommendations */}
        <div className={hasSidebar ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {/* Findings */}
          {findings.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                  Temuan
                </span>
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
                  {findings.length}
                </span>
              </div>
              <div className="space-y-3">
                {findings.map((f, i) => {
                  const s = findingStatus[f.status as keyof typeof findingStatus] ?? findingStatus.not_assessed
                  return (
                    <div
                      key={i}
                      className={`bg-surface border border-border border-l-[3px] ${s.barColor} rounded-xl p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-bold text-ink tracking-tight flex-1 min-w-0">{f.area}</p>
                        <span className={`inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${s.textColor} bg-canvas border border-border`}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{f.detail}</p>
                      {f.regulation_refs && f.regulation_refs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mr-1">Ref:</span>
                          {f.regulation_refs.map((ref, j) => (
                            <span
                              key={j}
                              className="text-[10px] font-mono text-muted bg-canvas border border-border px-1.5 py-0.5 rounded"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                      {f.evidence && f.evidence.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {f.evidence.map((ev: AuditEvidence, j) => (
                            <div key={j} className="bg-canvas border border-border rounded-lg px-3.5 py-2.5">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-sage-dark">
                                  {ev.source === "company_document" ? "Dokumen" : "Regulasi"}
                                </span>
                                {ev.page_number != null && (
                                  <span className="text-[10px] font-mono text-muted bg-surface border border-border px-1.5 py-0.5 rounded">
                                    hlm. {ev.page_number}
                                  </span>
                                )}
                                {ev.reference_id && (
                                  <span className="text-[10px] font-mono text-muted">
                                    {ev.reference_id}
                                  </span>
                                )}
                              </div>
                              <blockquote className="text-xs text-ink leading-relaxed border-l-[3px] border-sage pl-3">
                                “{ev.quote}”
                              </blockquote>
                            </div>
                          ))}
                        </div>
                      )}
                      {areaSourceMap.has(f.area) &&
                        areaSourceMap.get(f.area)!.evidence.length +
                          areaSourceMap.get(f.area)!.regulations.length >
                          0 && (
                          <EvidenceSourcePanel sources={areaSourceMap.get(f.area)!} />
                        )}
                      {f.missing_requirements && f.missing_requirements.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted block mb-1.5">
                            Belum Terpenuhi / Tidak Ditemukan
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {f.missing_requirements.map((m, j) => (
                              <span
                                key={j}
                                className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                  Rekomendasi
                </span>
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
                  {recommendations.length}
                </span>
              </div>
              <div className="space-y-2">
                {recommendations.map((r, i) => {
                  const p = priorityConfig[r.priority as keyof typeof priorityConfig] ?? priorityConfig.low
                  return (
                    <div
                      key={i}
                      className="bg-surface border border-border rounded-xl px-5 py-4 flex items-start gap-3 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]"
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.iconBg}`}>
                        {p.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border mb-1.5 ${p.classes}`}>
                          {p.label}
                        </span>
                        <p className="text-sm text-ink leading-relaxed">{r.action}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: Action Items + Regulations (sticky on desktop) */}
        {hasSidebar && (
          <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-5">
            {/* Action Items */}
            {hasActionItems && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                    Action Items
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
                    {actionItemRows!.length}
                  </span>
                </div>
                <ActionItemList
                  jobId={jobId}
                  items={actionItemRows!.map((row) => ({
                    ...row,
                    deadline_hint: (actionItems[row.item_index] as AuditActionItem)?.deadline_hint,
                    owner_hint: (actionItems[row.item_index] as AuditActionItem)?.owner_hint,
                  }))}
                />
              </section>
            )}

            {/* Regulations (desktop only, mobile rendered in main column) */}
            {hasRegulations && (
              <section className="hidden lg:block">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                    Regulasi
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
                    {regulationsCited.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {regulationsCited.map((r, i) => (
                    <RegulationCitedCard key={i} regulation={r} fullTexts={regulationFullTexts.get(r.id)} />
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}

        {/* Regulations on mobile (bottom-most, below Action Items) */}
        {hasRegulations && (
          <section className="lg:hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                05 — Regulasi
              </span>
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
                {regulationsCited.length}
              </span>
            </div>
            <div className="space-y-2">
              {regulationsCited.map((r, i) => (
                <RegulationCitedCard key={i} regulation={r} fullTexts={regulationFullTexts.get(r.id)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="bg-canvas rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" strokeWidth={2} />
          <p className="text-[11px] text-muted leading-relaxed">
            Laporan ini dihasilkan oleh AI dan bersifat rekomendasi. Keputusan final tetap memerlukan review manusia.
          </p>
        </div>
      </div>
    </div>
  )
}