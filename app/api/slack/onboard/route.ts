import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSlackInvitation, postWelcomeMessage, notifyHRTeam } from '@/lib/slack'
import { generateSlackWelcome } from '@/lib/ai/screening'

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = await request.json()

    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('*, job:jobs(*), offer:offer_letters(*)')
      .eq('id', applicationId)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Find the signed offer
    const offer = Array.isArray(application.offer)
      ? application.offer.find((o: { status: string }) => o.status === 'signed')
      : application.offer

    if (!offer) {
      return NextResponse.json({ error: 'No signed offer found' }, { status: 404 })
    }

    // 1. Generate personalized welcome message via Claude
    const welcomeMessage = await generateSlackWelcome({
      full_name: application.full_name,
      job_title: offer.job_title,
      start_date: new Date(offer.start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      reporting_manager: offer.reporting_manager,
      candidate_brief: application.ai_candidate_brief,
    })

    // 2. Send Slack workspace invitation
    const inviteResult = await sendSlackInvitation({
      email: application.email,
      candidateName: application.full_name,
      jobTitle: offer.job_title,
    })

    // 3. Post welcome DM (will succeed once they join)
    // In production: triggered by team_join webhook event
    // Here: attempt immediately (will work if user already exists in Slack)
    await postWelcomeMessage({
      userEmail: application.email,
      welcomeMessage,
    }).catch((err) => console.warn('[Slack] Could not post welcome DM yet:', err))

    // 4. Notify HR team
    await notifyHRTeam({
      candidateName: application.full_name,
      jobTitle: offer.job_title,
      startDate: new Date(offer.start_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      reportingManager: offer.reporting_manager,
      applicationId,
    })

    // Store generated welcome message on the application record for audit trail
    await supabaseAdmin.from('status_history').insert({
      application_id: applicationId,
      from_status: 'offer_signed',
      to_status: 'offer_signed',
      changed_by: 'system',
      note: `Slack onboarding triggered. Invite sent: ${inviteResult.success}. ${inviteResult.note || ''}`,
    })

    return NextResponse.json({
      success: true,
      welcomeMessage,
      inviteResult,
    })
  } catch (err) {
    console.error('[Slack Onboard API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
