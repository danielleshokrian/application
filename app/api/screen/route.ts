import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { screenResume, researchCandidate } from '@/lib/ai/screening'
import { sendSchedulingEmail } from '@/lib/email'
import { getAvailableSlots, createTentativeHold } from '@/lib/calendar'
import { v4 as uuidv4 } from 'uuid'
import { addDays } from 'date-fns'

const SHORTLIST_THRESHOLD = parseInt(process.env.SHORTLIST_THRESHOLD || '65')

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
    }

    // Fetch application + job details
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (!application.resume_text) {
      console.warn(`[Screen] No resume text for application ${applicationId}`)
    }

    const job = application.job
    const resumeText = application.resume_text || `Candidate: ${application.full_name}\nEmail: ${application.email}`

    // Update status to 'screened'
    await supabaseAdmin
      .from('applications')
      .update({ status: 'screened' })
      .eq('id', applicationId)

    await supabaseAdmin.from('status_history').insert({
      application_id: applicationId,
      from_status: 'applied',
      to_status: 'screened',
      changed_by: 'ai',
      note: 'AI screening initiated',
    })

    // Run AI resume screening
    let screeningResult
    try {
      screeningResult = await screenResume(resumeText, job)
    } catch (err) {
      console.error('[Screen] AI screening failed:', err)
      // Fallback: mark as screened with null score so admin can review manually
      await supabaseAdmin
        .from('applications')
        .update({ status: 'screened' })
        .eq('id', applicationId)
      return NextResponse.json({ error: 'AI screening failed', applicationId }, { status: 500 })
    }

    const isShortlisted = screeningResult.score >= SHORTLIST_THRESHOLD

    // Update application with screening results
    await supabaseAdmin
      .from('applications')
      .update({
        status: isShortlisted ? 'shortlisted' : 'screened',
        ai_score: screeningResult.score,
        ai_score_rationale: screeningResult.rationale,
        ai_parsed_skills: screeningResult.skills,
        ai_years_experience: screeningResult.years_experience,
        ai_education: screeningResult.education,
        ai_employers: screeningResult.employers,
        ai_achievements: screeningResult.achievements,
        ai_strengths: screeningResult.strengths,
        ai_gaps: screeningResult.gaps,
      })
      .eq('id', applicationId)

    if (isShortlisted) {
      await supabaseAdmin.from('status_history').insert({
        application_id: applicationId,
        from_status: 'screened',
        to_status: 'shortlisted',
        changed_by: 'ai',
        note: `AI score ${screeningResult.score}/100 — exceeds threshold of ${SHORTLIST_THRESHOLD}`,
      })

      // Run candidate research asynchronously
      runCandidateResearch(applicationId, application, job).catch(console.error)

      // Trigger scheduling flow
      await triggerSchedulingFlow(applicationId, application, job)
    } else {
      await supabaseAdmin.from('status_history').insert({
        application_id: applicationId,
        from_status: 'screened',
        to_status: 'screened',
        changed_by: 'ai',
        note: `AI score ${screeningResult.score}/100 — below threshold of ${SHORTLIST_THRESHOLD}. Pending human review.`,
      })
    }

    return NextResponse.json({
      success: true,
      applicationId,
      score: screeningResult.score,
      shortlisted: isShortlisted,
    })
  } catch (err) {
    console.error('[Screen API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function runCandidateResearch(
  applicationId: string,
  application: Record<string, unknown>,
  job: Record<string, unknown>
) {
  try {
    const research = await researchCandidate(
      {
        full_name: application.full_name as string,
        email: application.email as string,
        linkedin_url: application.linkedin_url as string | null,
        portfolio_url: application.portfolio_url as string | null,
        resume_text: application.resume_text as string | null,
      },
      job as unknown as Parameters<typeof researchCandidate>[1]
    )

    await supabaseAdmin
      .from('applications')
      .update({
        ai_research_linkedin: research.linkedin_summary,
        ai_research_twitter: research.twitter_summary,
        ai_research_github: research.github_summary,
        ai_discrepancies: research.discrepancies,
        ai_candidate_brief: research.candidate_brief,
      })
      .eq('id', applicationId)
  } catch (err) {
    console.error('[Research] Failed:', err)
  }
}

async function triggerSchedulingFlow(
  applicationId: string,
  application: Record<string, unknown>,
  job: Record<string, unknown>
) {
  try {
    const interviewerEmail = process.env.INTERVIEWER_EMAIL || 'interviewer@talentai.io'

    // Get available slots
    const slots = await getAvailableSlots(interviewerEmail)

    // Create tentative holds for each slot
    const slotRecords = []
    for (const slot of slots) {
      const googleEventId = await createTentativeHold(
        slot,
        application.full_name as string,
        (job as { title: string }).title,
        interviewerEmail
      )

      const { data: slotRecord } = await supabaseAdmin
        .from('interview_slots')
        .insert({
          application_id: applicationId,
          interviewer_email: interviewerEmail,
          start_time: slot.start,
          end_time: slot.end,
          status: 'tentative',
          google_event_id: googleEventId,
        })
        .select()
        .single()

      if (slotRecord) slotRecords.push({ ...slotRecord, label: slot.label, id: slot.id })
    }

    // Create scheduling token (expires in 5 days)
    const token = uuidv4().replace(/-/g, '')
    const { data: tokenRecord } = await supabaseAdmin
      .from('scheduling_tokens')
      .insert({
        application_id: applicationId,
        token,
        expires_at: addDays(new Date(), 5).toISOString(),
      })
      .select()
      .single()

    if (!tokenRecord) return

    // Send scheduling email
    await sendSchedulingEmail({
      to: application.email as string,
      candidateName: application.full_name as string,
      jobTitle: (job as { title: string }).title,
      slots: slots.map((s) => ({ ...s })),
      schedulingToken: token,
    })

    console.log(`[Scheduling] Sent scheduling email to ${application.email}`)
  } catch (err) {
    console.error('[Scheduling] Failed to trigger:', err)
  }
}
