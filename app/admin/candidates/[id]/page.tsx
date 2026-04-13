import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import OfferGeneratorPanel from '@/components/OfferGeneratorPanel'
import AdminActions from '@/components/AdminActions'
import InterviewPanel from '@/components/InterviewPanel'

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
          <Link href="/admin/candidates" className="text-sm text-gray-500 hover:text-gray-700 mb-3 block">
            ← Back to Candidates
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-600">
              {application.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{application.full_name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{application.email}</span>
                {application.linkedin_url && (
                  <a href={application.linkedin_url} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
                    LinkedIn ↗
                  </a>
                )}
                {application.portfolio_url && (
                  <a href={application.portfolio_url} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
                    Portfolio ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge text-sm px-3 py-1 ${STATUS_CLASSES[application.status]}`}>
            {STATUS_LABELS[application.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Screening Results */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">AI Screening</h2>

            {application.ai_score !== null ? (
              <div className="space-y-5">
                {/* Score + verdict banner */}
                <div className={`rounded-xl p-4 flex items-center gap-5 ${
                  application.ai_score >= 70 ? 'bg-green-50 border border-green-200' :
                  application.ai_score >= 50 ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 font-bold ${
                    application.ai_score >= 70 ? 'bg-green-500 text-white' :
                    application.ai_score >= 50 ? 'bg-yellow-500 text-white' :
                    'bg-red-500 text-white'
                  }`}>
                    <span className="text-xl leading-none">{application.ai_score}</span>
                    <span className="text-xs font-normal opacity-80">/100</span>
                  </div>
                  <div>
                    <div className={`text-base font-bold mb-1 ${
                      application.ai_score >= 70 ? 'text-green-800' :
                      application.ai_score >= 50 ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                      {application.ai_score >= 85 ? '🟢 Exceptional Match — Strong hire signal' :
                       application.ai_score >= 70 ? '🟢 Strong Match — Worth interviewing' :
                       application.ai_score >= 55 ? '🟡 Partial Match — Some gaps' :
                       application.ai_score >= 40 ? '🟠 Weak Match — Significant gaps' :
                       '🔴 Poor Fit — Does not meet requirements'}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{application.ai_score_rationale}</p>
                  </div>
                </div>

                {/* Score bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Poor fit</span><span>Exceptional match</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        application.ai_score >= 70 ? 'bg-green-500' :
                        application.ai_score >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${application.ai_score}%` }}
                    />
                  </div>
                </div>

                {/* Skills */}
                {application.ai_parsed_skills && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills Detected</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {application.ai_parsed_skills.map((skill: string) => (
                        <span key={skill} className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {application.ai_years_experience && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Experience</div>
                      <div className="font-semibold text-gray-900 mt-1">{application.ai_years_experience} yrs</div>
                    </div>
                  )}
                  {application.ai_education && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Education</div>
                      <div className="font-semibold text-gray-900 mt-1 text-xs">{application.ai_education}</div>
                    </div>
                  )}
                  {application.ai_employers && application.ai_employers.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Past Employers</div>
                      <div className="font-semibold text-gray-900 mt-1 text-xs">
                        {application.ai_employers.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Achievements */}
                {application.ai_achievements && application.ai_achievements.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Achievements</h3>
                    <ul className="space-y-1">
                      {application.ai_achievements.map((a: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-green-500">✓</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths & Gaps */}
                {(application.ai_strengths?.length || application.ai_gaps?.length) ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-3">
                      <h3 className="text-xs font-semibold text-green-700 mb-2">✓ Strengths</h3>
                      <ul className="space-y-1">
                        {(application.ai_strengths || []).map((s: string, i: number) => (
                          <li key={i} className="text-xs text-green-800">{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <h3 className="text-xs font-semibold text-red-700 mb-2">✗ Gaps</h3>
                      <ul className="space-y-1">
                        {(application.ai_gaps || []).map((g: string, i: number) => (
                          <li key={i} className="text-xs text-red-800">{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4 text-gray-500">
                <div className="animate-spin text-xl">⟳</div>
                <div>
                  <p className="text-sm font-medium">AI screening pending</p>
                  <p className="text-xs text-gray-400">Click "Re-run AI Screening" in the sidebar to trigger it now</p>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Research */}
          {application.ai_candidate_brief && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Candidate Intelligence Brief</h2>
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">{application.ai_candidate_brief}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {application.ai_research_linkedin && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
                      <span>🔗</span> LinkedIn
                    </h3>
                    <p className="text-sm text-gray-600">{application.ai_research_linkedin}</p>
                  </div>
                )}
                {application.ai_research_github && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
                      <span>💻</span> GitHub / Portfolio
                    </h3>
                    <p className="text-sm text-gray-600">{application.ai_research_github}</p>
                  </div>
                )}
                {application.ai_research_twitter && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
                      <span>🐦</span> X / Twitter
                    </h3>
                    <p className="text-sm text-gray-600">{application.ai_research_twitter}</p>
                  </div>
                )}
                {application.ai_discrepancies && application.ai_discrepancies.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-yellow-600 flex items-center gap-1 mb-1">
                      ⚠️ Discrepancies
                    </h3>
                    <ul className="space-y-1">
                      {application.ai_discrepancies.map((d: string, i: number) => (
                        <li key={i} className="text-sm text-yellow-700">{d}</li>
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
          {/* Admin Actions */}
          <AdminActions application={application} />

          {/* Application Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Application Details</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Role</dt>
                <dd className="font-medium">{(job as { title?: string })?.title}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Applied</dt>
                <dd className="font-medium">{new Date(application.created_at).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Resume</dt>
                <dd>
                  <a
                    href={application.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-500 hover:underline text-xs"
                  >
                    {application.resume_filename} ↗
                  </a>
                </dd>
              </div>
              {application.admin_override_note && (
                <div>
                  <dt className="text-yellow-600">Override Note</dt>
                  <dd className="text-yellow-700 text-xs">{application.admin_override_note}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status History */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Status History</h3>
            <div className="space-y-3">
              {statusHistory.map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-gray-900">
                      {STATUS_LABELS[entry.to_status] || entry.to_status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.note} · {entry.changed_by}
                    </div>
                    <div className="text-xs text-gray-400">
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
