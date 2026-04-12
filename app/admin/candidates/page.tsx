import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

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

  const { data, count } = await query
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
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">{total} total applications</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Role</label>
          <select name="role" defaultValue={searchParams.role || ''} className="input py-1.5">
            <option value="">All Roles</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Status</label>
          <select name="status" defaultValue={searchParams.status || ''} className="input py-1.5">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">From Date</label>
          <input type="date" name="from" defaultValue={searchParams.from || ''} className="input py-1.5" />
        </div>
        <div>
          <label className="label text-xs">To Date</label>
          <input type="date" name="to" defaultValue={searchParams.to || ''} className="input py-1.5" />
        </div>
        <button type="submit" className="btn-primary">Filter</button>
        <Link href="/admin/candidates" className="btn-secondary">Clear</Link>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Candidate</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Applied</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">AI Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{app.full_name}</div>
                    <div className="text-xs text-gray-500">{app.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(app as { job?: { title: string } }).job?.title || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {app.ai_score !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              app.ai_score >= 70
                                ? 'bg-green-500'
                                : app.ai_score >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${app.ai_score}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-700">{app.ai_score}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/candidates/${app.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                    >
                      View Profile →
                    </Link>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
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
