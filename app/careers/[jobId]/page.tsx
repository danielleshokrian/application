import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Job } from '@/types'

async function getJob(jobId: string): Promise<Job | null> {
  const { data } = await supabaseAdmin.from('jobs').select('*').eq('id', jobId).single()
  return data
}

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const job = await getJob(params.jobId)

  if (!job) notFound()

  const isClosed = job.status === 'closed'
  const isPaused = job.status === 'paused'
  const isUnavailable = isClosed || isPaused

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="font-bold text-xl text-brand-600">TalentAI</Link>
          <span className="text-gray-300">›</span>
          <Link href="/careers" className="text-sm text-gray-500 hover:text-gray-700">Careers</Link>
          <span className="text-gray-300">›</span>
          <span className="text-sm text-gray-700 font-medium">{job.title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {isUnavailable && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            {isClosed
              ? '⚠️ This position is no longer accepting applications.'
              : '⏸️ Applications for this role are temporarily paused.'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded">
                  {job.team}
                </span>
                <span className="badge bg-gray-100 text-gray-700">{job.experience_level}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>📍 {job.location}</span>
                <span>🏠 {job.remote_status}</span>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About the Role</h2>
              <p className="text-gray-600 leading-relaxed">{job.description}</p>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What You'll Do</h2>
              <ul className="space-y-3">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex gap-3 text-gray-600 text-sm">
                    <span className="text-brand-500 font-bold mt-0.5">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What We're Looking For</h2>
              <ul className="space-y-3">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex gap-3 text-gray-600 text-sm">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Role Details</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Team</dt>
                  <dd className="font-medium text-gray-900">{job.team}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="font-medium text-gray-900">{job.location}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Work Style</dt>
                  <dd className="font-medium text-gray-900">{job.remote_status}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Experience</dt>
                  <dd className="font-medium text-gray-900">{job.experience_level}</dd>
                </div>
              </dl>

              <div className="mt-6">
                {isUnavailable ? (
                  <div className="w-full text-center py-3 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium">
                    {isClosed ? 'Position Closed' : 'Applications Paused'}
                  </div>
                ) : (
                  <Link
                    href={`/careers/${job.id}/apply`}
                    className="btn-primary w-full justify-center text-base py-3"
                  >
                    Apply for This Role →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
