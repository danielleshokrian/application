import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resetAndSchedule } from '@/lib/scheduling'

/**
 * POST /api/schedule/reschedule
 * Called when a candidate clicks "None of these work? Request a different time"
 * on the candidate-facing scheduling page.
 *
 * Body: { token: string, message: string }
 *
 * Flow:
 *  1. Validate the token (not expired, not used)
 *  2. Pull the linked application + job
 *  3. Release existing tentative slots, invalidate token
 *  4. Fetch fresh calendar slots, create new holds + new token
 *  5. Send new scheduling email (including the candidate's availability note)
 */
export async function POST(request: NextRequest) {
  try {
    const { token, message } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 })
    }

    // Validate the scheduling token
    const { data: tokenRecord } = await supabaseAdmin
      .from('scheduling_tokens')
      .select('*, application:applications(*, job:jobs(*))')
      .eq('token', token)
      .single()

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid scheduling link' }, { status: 404 })
    }

    if (tokenRecord.used) {
      return NextResponse.json(
        { error: 'This scheduling link has already been used' },
        { status: 409 }
      )
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This scheduling link has expired. Please contact us for a new one.' },
        { status: 410 }
      )
    }

    const application = tokenRecord.application
    const job = application?.job

    if (!application || !job) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Generate fresh slots, invalidate old ones, send new email with candidate note
    const note = message?.trim()
      ? `Candidate requested: "${message.trim()}"`
      : 'Candidate requested alternative times.'

    const result = await resetAndSchedule(
      { id: application.id, full_name: application.full_name, email: application.email },
      { title: job.title },
      note
    )

    if (!result) {
      return NextResponse.json(
        { error: 'No available slots found. Please contact us directly.' },
        { status: 503 }
      )
    }

    // Record in status history
    await supabaseAdmin.from('status_history').insert({
      application_id: application.id,
      from_status: application.status,
      to_status: application.status,
      changed_by: 'candidate',
      note: `Candidate requested rescheduling: ${message?.trim() || '(no message)'}`,
    })

    return NextResponse.json({
      success: true,
      message: 'New time options have been sent to your email.',
    })
  } catch (err) {
    console.error('[Reschedule]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
