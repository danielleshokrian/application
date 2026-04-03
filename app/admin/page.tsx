import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

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

  // Recent 7 days
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
    { key: 'applied', color: 'bg-gray-400' },
    { key: 'screened', color: 'bg-blue-400' },
    { key: 'shortlisted', color: 'bg-yellow-400' },
    { key: 'in_interview', color: 'bg-purple-400' },
    { key: 'offer_sent', color: 'bg-orange-400' },
    { key: 'offer_signed', color: 'bg-green-400' },
    { key: 'rejected', color: 'bg-red-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hiring Overview</h1>
        <p className="text-gray-500 mt-1">Real-time pipeline across all roles</p>
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
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div className="card p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-5">Pipeline Funnel</h2>
        <div className="space-y-3">
          {pipeline.map((stage) => {
            const count = stats.byStatus[stage.key] || 0
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
            return (
              <div key={stage.key} className="flex items-center gap-4">
                <div className="w-28 text-sm text-gray-600 shrink-0">
                  {STATUS_LABELS[stage.key]}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-medium text-gray-700">
                  {count} <span className="text-gray-400">({pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/candidates" className="btn-primary">
          View All Candidates →
        </Link>
        <Link href="/careers" className="btn-secondary">
          Career Portal ↗
        </Link>
      </div>
    </div>
  )
}
