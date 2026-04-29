import { supabaseAdmin } from '@/lib/supabase'
import type { Job } from '@/types'
import Link from 'next/link'
import { MapPin, Globe, ArrowRight } from 'lucide-react'

async function getJobs(): Promise<Job[]> {
  const { data } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  return data || []
}

export const revalidate = 60

export default async function CareersPage() {
  const jobs = await getJobs()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-base text-zinc-900 tracking-tight">TalentAI</Link>
          <span className="text-sm text-zinc-400">We're hiring</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight mb-4">Join TalentAI</h1>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            We're building AI tools that transform how companies hire and operate.
            If you think in systems, build fast, and love working with frontier models — we'd love to meet you.
          </p>
        </div>

        {/* Job Listings */}
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/careers/${job.id}`} className="block group">
              <div className="border border-zinc-200 rounded-xl p-6 bg-white hover:border-zinc-400 hover:shadow-sm transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {job.team}
                      </span>
                      <span className="badge bg-zinc-100 text-zinc-500">
                        {job.experience_level}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        {job.remote_status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-500 line-clamp-2 leading-relaxed">{job.description}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg group-hover:bg-zinc-700 transition-colors">
                      Apply <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg font-medium text-zinc-600">No open roles at this time.</p>
            <p className="mt-2 text-sm">Check back soon — we're growing fast.</p>
          </div>
        )}
      </main>
    </div>
  )
}
