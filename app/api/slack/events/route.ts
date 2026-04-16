import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySlackSignature, postWelcomeDM, notifyHRCandidateJoined } from '@/lib/slack'
import { generateSlackWelcome } from '@/lib/ai/screening'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Verify the request came from Slack
  const signature = request.headers.get('x-slack-signature') ?? ''
  const timestamp = request.headers.get('x-slack-request-timestamp') ?? ''

  if (!verifySlackSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  // Slack sends a one-time challenge when you first configure the Events URL
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Acknowledge Slack immediately — processing happens async
  // (Slack requires a 200 within 3 seconds)
  if (payload.type === 'event_callback') {
    void handleEvent(payload.event).catch((err) =>
      console.error('[Slack Events] Handler error:', err)
    )
  }

  return NextResponse.json({ ok: true })
}

// ─── Event handlers ──────────────────────────────────────────────────────────

async function handleEvent(event: Record<string, unknown>) {
  if (event.type === 'team_join') {
    await handleTeamJoin(event.user as SlackUser)
  }
}

interface SlackUser {
  id: string
  profile?: { email?: string }
  email?: string
}

async function handleTeamJoin(user: SlackUser) {
  // Email can be on profile.email or top-level email depending on Slack plan
  const email = user.profile?.email ?? user.email

  if (!email) {
    console.log('[Slack team_join] No email on user object — skipping onboarding')
    return
  }

  console.log(`[Slack team_join] ${email} joined the workspace`)

  // Find the matching offer_signed application
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('*, offer:offer_letters(*)')
    .eq('email', email)
    .eq('status', 'offer_signed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!application) {
    console.log(`[Slack team_join] No offer_signed application for ${email} — ignoring`)
    return
  }

  const offer = Array.isArray(application.offer)
    ? application.offer.find((o: { status: string }) => o.status === 'signed')
    : application.offer

  if (!offer) {
    console.log(`[Slack team_join] No signed offer found for ${email} — ignoring`)
    return
  }

  const formattedStartDate = new Date(offer.start_date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  // Try to retrieve the pre-generated welcome message to avoid a second AI call
  const { data: historyRow } = await supabaseAdmin
    .from('status_history')
    .select('note')
    .eq('application_id', application.id)
    .like('note', 'SLACK_WELCOME:%')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let welcomeMessage: string

  if (historyRow?.note) {
    welcomeMessage = historyRow.note.replace('SLACK_WELCOME:', '')
    console.log(`[Slack team_join] Using stored welcome message for ${application.full_name}`)
  } else {
    // Fallback: re-generate if no stored message (e.g. manual trigger)
    console.log(`[Slack team_join] Re-generating welcome message for ${application.full_name}`)
    welcomeMessage = await generateSlackWelcome({
      full_name: application.full_name,
      job_title: offer.job_title,
      start_date: formattedStartDate,
      reporting_manager: offer.reporting_manager,
      candidate_brief: application.ai_candidate_brief,
    })
  }

  // Send welcome DM using the Slack user ID from the event (no email lookup needed)
  const dmSent = await postWelcomeDM({
    userId: user.id,
    welcomeMessage,
    candidateName: application.full_name,
    jobTitle: offer.job_title,
    startDate: formattedStartDate,
  })

  console.log(`[Slack team_join] Welcome DM sent to ${application.full_name}: ${dmSent}`)

  // Notify HR that the candidate has joined and been welcomed
  await notifyHRCandidateJoined({
    candidateName: application.full_name,
    jobTitle: offer.job_title,
    startDate: formattedStartDate,
    reportingManager: offer.reporting_manager,
    applicationId: application.id,
  })

  // Record in status history
  await supabaseAdmin.from('status_history').insert({
    application_id: application.id,
    from_status: 'offer_signed',
    to_status: 'offer_signed',
    changed_by: 'system',
    note: `Candidate joined Slack workspace. Welcome DM sent: ${dmSent}`,
  })
}
