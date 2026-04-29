import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_CLASSES: Record<string, string> = {
  applied: 'status-applied',
  screened: 'status-screened',
  shortlisted: 'status-shortlisted',
  in_interview: 'status-in_interview',
  offer_sent: 'status-offer_sent',
  offer_signed: 'status-offer_signed',
  rejected: 'status-rejected',
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

async function getCandidates(params: {
  role?: string
  status?: string
  from?: string
  to?: string
}) {
  let query = supabaseAdmin
    .from('applications')
    .select('*, job:jobs(id, title)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params.role) query = query.eq('job_id', params.role)
  if (params.status) query = query.eq('status', params.status)
  if (params.from) query = query.gte('created_at', params.from)
  if (params.to) query = query.lte('created_at', params.to)

  const { data, count, error } = await query
  if (error) {
    console.error('[Candidates] Supabase query error:', error)
  }
  return { applications: data || [], total: count || 0 }
}

async function getJobs() {
  const { data } = await supabaseAdmin.from('jobs').select('id, title').order('title')
  return data || []
}

interface PageProps {
  searchParams: {
    role?: string
    status?: string
    from?: string
    to?: string
  }
}

export default async function CandidatesPage({ searchParams }: PageProps) {
  const [{ applications, total }, jobs] = await Promise.all([
    getCandidates(searchParams),
    getJobs(),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Candidates</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{total} total applications</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Role</label>
          <select name="role" defaultValue={searchParams.role || ''} className="input py-1.5">
            <option value="">All Roles</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={searchParams.status || ''} className="input py-1.5">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From Date</label>
          <input type="date" name="from" defaultValue={searchParams.from || ''} className="input py-1.5" />
        </div>
        <div>
          <label className="label">To Date</label>
          <input type="date" name="to" defaultValue={searchParams.to || ''} className="input py-1.5" />
        </div>
        <button type="submit" className="btn-primary">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} /> Filter
        </button>
        <Link href="/admin/candidates" className="btn-secondary">Clear</Link>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">Candidate</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">Applied</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Score</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-zinc-900">{app.full_name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{app.email}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-600">
                    {(app as { job?: { title: string } }).job?.title || '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {app.ai_score !== null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 bg-zinc-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              app.ai_score >= 70 ? 'bg-emerald-400'
                              : app.ai_score >= 50 ? 'bg-amber-400'
                              : 'bg-rose-400'
                            }`}
                            style={{ width: `${app.ai_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-700">{app.ai_score}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/candidates/${app.id}`}
                      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-zinc-300 text-sm">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
