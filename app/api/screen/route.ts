import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { screenResume, researchCandidate } from '@/lib/ai/screening'
import { resetAndSchedule } from '@/lib/scheduling'

const SHORTLIST_THRESHOLD = parseInt(process.env.SHORTLIST_THRESHOLD || '65')

export async function POST(request: NextRequest) {
  try {
    const { applicationId, skipScheduling } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
    }

    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const job = application.job
    const resumeText =
      application.resume_text ||
      `Candidate: ${application.full_name}\nEmail: ${application.email}`

    // Statuses at or beyond shortlisted — admin has made a decision, never downgrade.
    const adminDecided = ['shortlisted', 'in_interview', 'offer_sent', 'offer_signed'].includes(
      application.status
    )

    console.log(
      `[Screen] Starting for ${application.full_name}: currentStatus=${application.status}, skipScheduling=${!!skipScheduling}, adminDecided=${adminDecided}`
    )

    // Only reset to 'screened' for fresh auto-screening of newly applied candidates.
    // Never touch status when admin already decided (shortlisted / further along).
    if (!skipScheduling && !adminDecided) {
      await supabaseAdmin
        .from('applications')
        .update({ status: 'screened' })
        .eq('id', applicationId)

      await supabaseAdmin.from('status_history').insert({
        application_id: applicationId,
        from_status: application.status,
        to_status: 'screened',
        changed_by: 'ai',
        note: 'AI screening initiated',
      })
    }

    // Run AI resume screening
    let screeningResult
    try {
      screeningResult = await screenResume(resumeText, job)
    } catch (err) {
      console.error('[Screen] AI screening failed:', err)
      return NextResponse.json({ error: 'AI screening failed', applicationId }, { status: 500 })
    }

    const aiSaysShortlist = screeningResult.score >= SHORTLIST_THRESHOLD

    // AI data saved in all cases; status only written when safe to do so
    const aiDataUpdate = {
      ai_score: screeningResult.score,
      ai_score_rationale: screeningResult.rationale,
      ai_parsed_skills: screeningResult.skills,
      ai_years_experience: screeningResult.years_experience,
      ai_education: screeningResult.education,
      ai_employers: screeningResult.employers,
      ai_achievements: screeningResult.achievements,
      ai_strengths: screeningResult.strengths,
      ai_gaps: screeningResult.gaps,
    }

    if (skipScheduling || adminDecided) {
      // Admin already decided — only save AI data, never touch status
      await supabaseAdmin
        .from('applications')
        .update(aiDataUpdate)
        .eq('id', applicationId)

      runCandidateResearch(applicationId, application, job).catch(console.error)

      console.log(
        `[Screen] Complete for ${application.full_name}: score=${screeningResult.score}, status=${application.status} (unchanged)`
      )
    } else {
      // Auto-triggered on fresh application — status follows AI decision
      const newStatus = aiSaysShortlist ? 'shortlisted' : 'screened'

      await supabaseAdmin
        .from('applications')
        .update({ ...aiDataUpdate, status: newStatus })
        .eq('id', applicationId)

      await supabaseAdmin.from('status_history').insert({
        application_id: applicationId,
        from_status: 'screened',
        to_status: newStatus,
        changed_by: 'ai',
        note: aiSaysShortlist
          ? `AI score ${screeningResult.score}/100 — exceeds threshold of ${SHORTLIST_THRESHOLD}`
          : `AI score ${screeningResult.score}/100 — below threshold of ${SHORTLIST_THRESHOLD}. Pending human review.`,
      })

      if (aiSaysShortlist) {
        runCandidateResearch(applicationId, application, job).catch(console.error)
        await triggerSchedulingFlow(application, job)
      }
    }

    return NextResponse.json({
      success: true,
      applicationId,
      score: screeningResult.score,
      shortlisted: aiSaysShortlist,
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
  application: Record<string, unknown>,
  job: Record<string, unknown>
) {
  try {
    await resetAndSchedule(
      {
        id: application.id as string,
        full_name: application.full_name as string,
        email: application.email as string,
      },
      { title: (job as { title: string }).title }
    )
  } catch (err) {
    console.error('[Scheduling] Failed to trigger:', err)
  }
}
