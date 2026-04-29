import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Job } from '@/types'
import { MapPin, Globe, AlertTriangle, PauseCircle, Check, ArrowRight, ChevronRight } from 'lucide-react'

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-2 text-sm">
          <Link href="/" className="font-semibold text-zinc-900 tracking-tight">TalentAI</Link>
          <ChevronRight className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          <Link href="/careers" className="text-zinc-400 hover:text-zinc-700 transition-colors">Careers</Link>
          <ChevronRight className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          <span className="text-zinc-700 font-medium">{job.title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {isUnavailable && (
          <div className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            isClosed
              ? 'bg-zinc-50 border border-zinc-200 text-zinc-600'
              : 'bg-amber-50 border border-amber-100 text-amber-700'
          }`}>
            {isClosed
              ? <><AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} /> This position is no longer accepting applications.</>
              : <><PauseCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} /> Applications for this role are temporarily paused.</>
            }
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md">
                  {job.team}
                </span>
                <span className="badge bg-zinc-100 text-zinc-500">{job.experience_level}</span>
              </div>
              <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">{job.title}</h1>
              <div className="flex items-center gap-5 mt-3 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {job.remote_status}
                </span>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-semibold text-zinc-900 mb-3">About the Role</h2>
              <p className="text-zinc-600 leading-relaxed text-sm">{job.description}</p>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-semibold text-zinc-900 mb-4">What You'll Do</h2>
              <ul className="space-y-3">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex gap-3 text-zinc-600 text-sm">
                    <ArrowRight className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-semibold text-zinc-900 mb-4">What We're Looking For</h2>
              <ul className="space-y-3">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex gap-3 text-zinc-600 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-6 sticky top-6">
              <h3 className="font-medium text-zinc-900 mb-4">Role Details</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-400 mb-0.5">Team</dt>
                  <dd className="font-medium text-zinc-800">{job.team}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400 mb-0.5">Location</dt>
                  <dd className="font-medium text-zinc-800">{job.location}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400 mb-0.5">Work Style</dt>
                  <dd className="font-medium text-zinc-800">{job.remote_status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400 mb-0.5">Experience</dt>
                  <dd className="font-medium text-zinc-800">{job.experience_level}</dd>
                </div>
              </dl>

              <div className="mt-6">
                {isUnavailable ? (
                  <div className="w-full text-center py-3 bg-zinc-50 text-zinc-400 rounded-lg text-sm font-medium border border-zinc-200">
                    {isClosed ? 'Position Closed' : 'Applications Paused'}
                  </div>
                ) : (
                  <Link
                    href={`/careers/${job.id}/apply`}
                    className="btn-primary w-full justify-center text-base py-3"
                  >
                    Apply for This Role <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
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
