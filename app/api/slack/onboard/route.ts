import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSlackInvitation, postWelcomeDM, notifyHRInviteSent } from '@/lib/slack'
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

    // Find the signed offer (offer_letters is a 1:many relation)
    const offer = Array.isArray(application.offer)
      ? application.offer.find((o: { status: string }) => o.status === 'signed')
      : application.offer

    if (!offer) {
      return NextResponse.json({ error: 'No signed offer found' }, { status: 404 })
    }

    const formattedStartDate = new Date(offer.start_date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

    // 1. Generate personalized welcome message via Claude
    const welcomeMessage = await generateSlackWelcome({
      full_name: application.full_name,
      job_title: offer.job_title,
      start_date: formattedStartDate,
      reporting_manager: offer.reporting_manager,
      candidate_brief: application.ai_candidate_brief,
    })

    // 2. Send Slack workspace invitation
    const inviteResult = await sendSlackInvitation({
      email: application.email,
      candidateName: application.full_name,
      jobTitle: offer.job_title,
    })

    // 3. Attempt welcome DM immediately — succeeds if the candidate was already
    //    in the workspace (e.g. re-hire). The team_join webhook will send it
    //    for new users when they actually accept the invite.
    const dmSent = await postWelcomeDM({
      userEmail: application.email,
      welcomeMessage,
      candidateName: application.full_name,
      jobTitle: offer.job_title,
      startDate: formattedStartDate,
    }).catch(() => false)

    // 4. Notify HR that the invite has been sent (joined notification comes later)
    await notifyHRInviteSent({
      candidateName: application.full_name,
      jobTitle: offer.job_title,
      startDate: formattedStartDate,
      reportingManager: offer.reporting_manager,
      applicationId,
      inviteSuccess: inviteResult.success,
    })

    // 5. Persist the generated welcome message in status_history so the
    //    team_join webhook can retrieve it without re-running the AI call.
    await supabaseAdmin.from('status_history').insert({
      application_id: applicationId,
      from_status: 'offer_signed',
      to_status: 'offer_signed',
      changed_by: 'system',
      note: `SLACK_WELCOME:${welcomeMessage}`,
    })

    console.log(
      `[Slack Onboard] ${application.full_name}: invite=${inviteResult.success}, dmSent=${dmSent}`
    )

    return NextResponse.json({ success: true, inviteResult, dmSent })
  } catch (err) {
    console.error('[Slack Onboard API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
