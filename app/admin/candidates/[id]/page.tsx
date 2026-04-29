import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import OfferGeneratorPanel from '@/components/OfferGeneratorPanel'
import AdminActions from '@/components/AdminActions'
import InterviewPanel from '@/components/InterviewPanel'
import {
  Check, X, AlertTriangle, Loader2,
  Linkedin, Github, Globe, ArrowLeft, ExternalLink,
} from 'lucide-react'

const STATUS_CLASSES: Record<string, string> = {
  applied: 'status-applied', screened: 'status-screened',
  shortlisted: 'status-shortlisted', in_interview: 'status-in_interview',
  offer_sent: 'status-offer_sent', offer_signed: 'status-offer_signed',
  rejected: 'status-rejected',
}

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied', screened: 'Screened', shortlisted: 'Shortlisted',
  in_interview: 'In Interview', offer_sent: 'Offer Sent',
  offer_signed: 'Offer Signed', rejected: 'Rejected',
}

async function getCandidate(id: string) {
  const { data } = await supabaseAdmin
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('id', id)
    .single()
  console.log(`[Page render] getCandidate ${id.slice(0, 8)}: status=${data?.status}`)
  return data
}

async function getStatusHistory(id: string) {
  const { data } = await supabaseAdmin
    .from('status_history')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: true })
  return data || []
}

async function getInterview(id: string) {
  const { data } = await supabaseAdmin
    .from('interviews')
    .select('*, slot:interview_slots(*)')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getOffer(id: string) {
  const { data } = await supabaseAdmin
    .from('offer_letters')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getPendingSlots(id: string) {
  const { data } = await supabaseAdmin
    .from('interview_slots')
    .select('id, start_time, end_time')
    .eq('application_id', id)
    .eq('status', 'tentative')
    .order('start_time', { ascending: true })
  return data || []
}

async function getActiveSchedulingToken(id: string) {
  const { data } = await supabaseAdmin
    .from('scheduling_tokens')
    .select('expires_at, created_at')
    .eq('application_id', id)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data || null
}

export const dynamic = 'force-dynamic'

export default async function CandidateProfilePage({ params }: { params: { id: string } }) {
  const [application, statusHistory, interview, offer, pendingSlots, schedulingToken] = await Promise.all([
    getCandidate(params.id),
    getStatusHistory(params.id),
    getInterview(params.id),
    getOffer(params.id),
    getPendingSlots(params.id),
    getActiveSchedulingToken(params.id),
  ])

  if (!application) notFound()

  const job = (application as { job?: Record<string, unknown> }).job

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/candidates" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 mb-3 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to Candidates
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-semibold text-zinc-600 shrink-0">
              {application.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">{application.full_name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-400 mt-0.5">
                <span>{application.email}</span>
                {application.linkedin_url && (
                  <a href={application.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 transition-colors">
                    LinkedIn <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  </a>
                )}
                {application.portfolio_url && (
                  <a href={application.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 transition-colors">
                    Portfolio <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <span className={`badge text-xs px-3 py-1 ${STATUS_CLASSES[application.status]}`}>
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Screening Results */}
          <div className="card p-6">
            <h2 className="font-medium text-zinc-900 mb-4">AI Screening</h2>

            {application.ai_score !== null ? (
              <div className="space-y-5">
                {/* Score + verdict banner */}
                <div className={`rounded-xl p-4 flex items-center gap-5 ${
                  application.ai_score >= 70 ? 'bg-emerald-50 border border-emerald-100' :
                  application.ai_score >= 50 ? 'bg-amber-50 border border-amber-100' :
                  'bg-rose-50 border border-rose-100'
                }`}>
                  <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 font-semibold ${
                    application.ai_score >= 70 ? 'bg-emerald-500 text-white' :
                    application.ai_score >= 50 ? 'bg-amber-500 text-white' :
                    'bg-rose-400 text-white'
                  }`}>
                    <span className="text-lg leading-none">{application.ai_score}</span>
                    <span className="text-xs font-normal opacity-75">/100</span>
                  </div>
                  <div>
                    <div className={`text-sm font-semibold mb-1 ${
                      application.ai_score >= 70 ? 'text-emerald-800' :
                      application.ai_score >= 50 ? 'text-amber-800' :
                      'text-rose-800'
                    }`}>
                      {application.ai_score >= 85 ? 'Exceptional Match — Strong hire signal' :
                       application.ai_score >= 70 ? 'Strong Match — Worth interviewing' :
                       application.ai_score >= 55 ? 'Partial Match — Some gaps' :
                       application.ai_score >= 40 ? 'Weak Match — Significant gaps' :
                       'Poor Fit — Does not meet requirements'}
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed">{application.ai_score_rationale}</p>
                  </div>
                </div>

                {/* Score bar */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                    <span>Poor fit</span><span>Exceptional match</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        application.ai_score >= 70 ? 'bg-emerald-400' :
                        application.ai_score >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${application.ai_score}%` }}
                    />
                  </div>
                </div>

                {/* Skills */}
                {application.ai_parsed_skills && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Skills Detected</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {application.ai_parsed_skills.map((skill: string) => (
                        <span key={skill} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-md font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {application.ai_years_experience && (
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <div className="text-xs text-zinc-400 mb-1">Experience</div>
                      <div className="font-semibold text-zinc-900">{application.ai_years_experience} yrs</div>
                    </div>
                  )}
                  {application.ai_education && (
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <div className="text-xs text-zinc-400 mb-1">Education</div>
                      <div className="font-semibold text-zinc-900 text-xs leading-snug">{application.ai_education}</div>
                    </div>
                  )}
                  {application.ai_employers && application.ai_employers.length > 0 && (
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <div className="text-xs text-zinc-400 mb-1">Past Employers</div>
                      <div className="font-semibold text-zinc-900 text-xs leading-snug">
                        {application.ai_employers.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Achievements */}
                {application.ai_achievements && application.ai_achievements.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Key Achievements</h3>
                    <ul className="space-y-1.5">
                      {application.ai_achievements.map((a: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-600 flex gap-2 items-start">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2} />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths & Gaps */}
                {(application.ai_strengths?.length || application.ai_gaps?.length) ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <h3 className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} /> Strengths
                      </h3>
                      <ul className="space-y-1">
                        {(application.ai_strengths || []).map((s: string, i: number) => (
                          <li key={i} className="text-xs text-emerald-800 leading-relaxed">{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-4">
                      <h3 className="text-xs font-medium text-rose-700 mb-2 flex items-center gap-1.5">
                        <X className="h-3.5 w-3.5" strokeWidth={2} /> Gaps
                      </h3>
                      <ul className="space-y-1">
                        {(application.ai_gaps || []).map((g: string, i: number) => (
                          <li key={i} className="text-xs text-rose-800 leading-relaxed">{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-zinc-600">AI screening pending</p>
                  <p className="text-xs text-zinc-400">Click "Re-run AI Screening" in the sidebar to trigger it now</p>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Research */}
          {application.ai_candidate_brief && (
            <div className="card p-6">
              <h2 className="font-medium text-zinc-900 mb-4">Candidate Intelligence Brief</h2>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-zinc-700 leading-relaxed">{application.ai_candidate_brief}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {application.ai_research_linkedin && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-1.5">
                      <Linkedin className="h-3.5 w-3.5" strokeWidth={1.5} /> LinkedIn
                    </h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">{application.ai_research_linkedin}</p>
                  </div>
                )}
                {application.ai_research_github && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-1.5">
                      <Github className="h-3.5 w-3.5" strokeWidth={1.5} /> GitHub / Portfolio
                    </h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">{application.ai_research_github}</p>
                  </div>
                )}
                {application.ai_research_twitter && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-1.5">
                      <Globe className="h-3.5 w-3.5" strokeWidth={1.5} /> X / Twitter
                    </h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">{application.ai_research_twitter}</p>
                  </div>
                )}
                {application.ai_discrepancies && application.ai_discrepancies.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-amber-600 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} /> Discrepancies
                    </h3>
                    <ul className="space-y-1">
                      {application.ai_discrepancies.map((d: string, i: number) => (
                        <li key={i} className="text-sm text-amber-700 leading-relaxed">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interview Section */}
          <InterviewPanel
            interview={interview}
            applicationId={params.id}
            pendingSlots={pendingSlots}
            schedulingToken={schedulingToken}
          />

          {/* Offer Generator */}
          {['in_interview', 'offer_sent', 'offer_signed'].includes(application.status) && (
            <OfferGeneratorPanel
              applicationId={params.id}
              candidateName={application.full_name}
              jobTitle={(job as { title?: string })?.title || ''}
              existingOffer={offer}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <AdminActions application={application} />

          {/* Application Details */}
          <div className="card p-5">
            <h3 className="font-medium text-zinc-900 mb-3">Application Details</h3>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-xs text-zinc-400 mb-0.5">Role</dt>
                <dd className="font-medium text-zinc-800">{(job as { title?: string })?.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400 mb-0.5">Applied</dt>
                <dd className="font-medium text-zinc-800">{new Date(application.created_at).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400 mb-0.5">Resume</dt>
                <dd>
                  <a
                    href={application.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 underline underline-offset-2 text-xs transition-colors"
                  >
                    {application.resume_filename}
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  </a>
                </dd>
              </div>
              {application.admin_override_note && (
                <div>
                  <dt className="text-xs text-amber-600 mb-0.5">Override Note</dt>
                  <dd className="text-amber-700 text-xs leading-relaxed">{application.admin_override_note}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status History */}
          <div className="card p-5">
            <h3 className="font-medium text-zinc-900 mb-3">Status History</h3>
            <div className="space-y-3">
              {statusHistory.map((entry, idx) => (
                <div key={entry.id} className="flex gap-3 relative">
                  {idx < statusHistory.length - 1 && (
                    <div className="absolute left-[3px] top-4 bottom-0 w-px bg-zinc-100" />
                  )}
                  <div className="w-2 h-2 rounded-full bg-zinc-300 mt-1.5 shrink-0 relative z-10" />
                  <div>
                    <div className="text-xs font-medium text-zinc-800">
                      {STATUS_LABELS[entry.to_status] || entry.to_status}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {entry.note} · {entry.changed_by}
                    </div>
                    <div className="text-xs text-zinc-300 mt-0.5">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
