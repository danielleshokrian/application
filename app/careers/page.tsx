import { supabaseAdmin } from '@/lib/supabase'
import type { Job } from '@/types'
import Link from 'next/link'

async function getJobs(): Promise<Job[]> {
  const { data } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  return data || []
}

export const revalidate = 60

const experienceColors: Record<string, string> = {
  'Senior (5+ years)': 'bg-purple-100 text-purple-700',
  'Mid-level (2–5 years)': 'bg-blue-100 text-blue-700',
  'Senior / Lead (6+ years)': 'bg-indigo-100 text-indigo-700',
  'Mid-level (3–5 years)': 'bg-cyan-100 text-cyan-700',
}

export default async function CareersPage() {
  const jobs = await getJobs()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-brand-600">TalentAI</Link>
          <span className="text-sm text-gray-500">We're hiring</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join TalentAI</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're building AI tools that transform how companies hire and operate.
            If you think in systems, build fast, and love working with frontier models — we'd love to meet you.
          </p>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/careers/${job.id}`} className="block group">
              <div className="card p-6 hover:border-brand-500 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                        {job.team}
                      </span>
                      <span className={`badge ${experienceColors[job.experience_level] || 'bg-gray-100 text-gray-600'}`}>
                        {job.experience_level}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span>📍 {job.location}</span>
                      <span>•</span>
                      <span>🏠 {job.remote_status}</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="btn-primary">Apply Now →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No open roles at this time.</p>
            <p className="mt-2 text-sm">Check back soon — we're growing fast.</p>
          </div>
        )}
      </main>
    </div>
  )
}
