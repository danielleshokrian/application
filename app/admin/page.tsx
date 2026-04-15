import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getStats() {
  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select('status, ai_score, created_at')

  const all = apps || []
  const byStatus = all.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  const avgScore =
    all.filter((a) => a.ai_score !== null).reduce((s, a) => s + (a.ai_score || 0), 0) /
    (all.filter((a) => a.ai_score !== null).length || 1)

  const week = new Date()
  week.setDate(week.getDate() - 7)
  const recent = all.filter((a) => new Date(a.created_at) > week).length

  return { total: all.length, byStatus, avgScore: Math.round(avgScore), recent }
}

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screened: 'Screened',
  shortlisted: 'Shortlisted',
  in_interview: 'In Interview',
  offer_sent: 'Offer Sent',
  offer_signed: 'Offer Signed',
  rejected: 'Rejected',
}

export default async function AdminOverviewPage() {
  const stats = await getStats()

  const pipeline = [
    { key: 'applied',      color: 'bg-zinc-300' },
    { key: 'screened',     color: 'bg-sky-300' },
    { key: 'shortlisted',  color: 'bg-amber-300' },
    { key: 'in_interview', color: 'bg-violet-300' },
    { key: 'offer_sent',   color: 'bg-orange-300' },
    { key: 'offer_signed', color: 'bg-emerald-300' },
    { key: 'rejected',     color: 'bg-rose-200' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900">Hiring Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">Real-time pipeline across all roles</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Applications', value: stats.total },
          { label: 'This Week', value: stats.recent },
          { label: 'Avg AI Score', value: `${stats.avgScore}/100` },
          { label: 'Offers Signed', value: stats.byStatus['offer_signed'] || 0 },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="text-2xl font-semibold text-zinc-900">{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div className="card p-6 mb-8">
        <h2 className="font-medium text-zinc-900 mb-5">Pipeline Funnel</h2>
        <div className="space-y-3">
          {pipeline.map((stage) => {
            const count = stats.byStatus[stage.key] || 0
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
            return (
              <div key={stage.key} className="flex items-center gap-4">
                <div className="w-28 text-xs text-zinc-500 shrink-0">
                  {STATUS_LABELS[stage.key]}
                </div>
                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <div className="w-20 text-right text-xs text-zinc-600">
                  {count} <span className="text-zinc-400">({pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/candidates" className="btn-primary">
          View All Candidates <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
        <Link href="/careers" target="_blank" className="btn-secondary">
          Career Portal <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
