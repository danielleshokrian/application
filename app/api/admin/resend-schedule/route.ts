import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resetAndSchedule } from '@/lib/scheduling'

/**
 * POST /api/admin/resend-schedule
 * Admin action: resend a fresh scheduling link to a candidate.
 * Use cases:
 *  - Token expired before candidate responded
 *  - Candidate missed the email
 *  - Interview was cancelled and needs rescheduling
 *  - Admin manually wants to offer new times
 *
 * Body: { applicationId: string, note?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { applicationId, note } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
    }

    // Fetch application + job
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const job = application.job
    if (!job) {
      return NextResponse.json({ error: 'Job not found for this application' }, { status: 404 })
    }

    // Refuse if already confirmed (interview exists and is scheduled)
    const { data: existingInterview } = await supabaseAdmin
      .from('interviews')
      .select('id, status')
      .eq('application_id', applicationId)
      .eq('status', 'scheduled')
      .single()

    if (existingInterview) {
      return NextResponse.json(
        {
          error:
            'Candidate already has a confirmed interview. Cancel it first before resending the scheduling link.',
        },
        { status: 409 }
      )
    }

    // Release existing slots + invalidate tokens + send fresh scheduling email
    const result = await resetAndSchedule(
      { id: application.id, full_name: application.full_name, email: application.email },
      { title: job.title },
      note?.trim() || undefined
    )

    if (!result) {
      return NextResponse.json(
        { error: 'No available calendar slots. Check the interviewer calendar.' },
        { status: 503 }
      )
    }

    // Ensure application status is at least shortlisted
    if (!['shortlisted', 'in_interview'].includes(application.status)) {
      await supabaseAdmin
        .from('applications')
        .update({ status: 'shortlisted' })
        .eq('id', applicationId)
    }

    await supabaseAdmin.from('status_history').insert({
      application_id: applicationId,
      from_status: application.status,
      to_status: 'shortlisted',
      changed_by: 'admin',
      note: `Scheduling link resent by admin${note ? ': ' + note : ''}`,
    })

    return NextResponse.json({
      success: true,
      message: `New scheduling link sent to ${application.email}`,
    })
  } catch (err) {
    console.error('[Resend Schedule]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
