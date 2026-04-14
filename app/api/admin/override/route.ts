import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resetAndSchedule } from '@/lib/scheduling'
import type { ApplicationStatus } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { applicationId, newStatus, note } = await request.json()

    if (!applicationId || !newStatus) {
      return NextResponse.json(
        { error: 'applicationId and newStatus required' },
        { status: 400 }
      )
    }

    const validStatuses: ApplicationStatus[] = [
      'applied', 'screened', 'shortlisted', 'in_interview',
      'offer_sent', 'offer_signed', 'rejected',
    ]

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: current } = await supabaseAdmin
      .from('applications')
      .select('status, full_name, email, job:jobs(title)')
      .eq('id', applicationId)
      .single()

    await supabaseAdmin
      .from('applications')
      .update({ status: newStatus, admin_override_note: note || null })
      .eq('id', applicationId)

    await supabaseAdmin.from('status_history').insert({
      application_id: applicationId,
      from_status: current?.status || null,
      to_status: newStatus,
      changed_by: 'admin',
      note: note || 'Manual override by admin',
    })

    // When admin manually shortlists, trigger scheduling NOW (don't rely on
    // screen route which would ignore score threshold and miss the email).
    if (newStatus === 'shortlisted' && current?.status !== 'shortlisted') {
      const app = current as unknown as { full_name: string; email: string; job?: { title: string } }

      if (app?.email && app?.job?.title) {
        // Fire scheduling in background — don't await so the UI isn't blocked
        resetAndSchedule(
          { id: applicationId, full_name: app.full_name, email: app.email },
          { title: app.job.title }
        )
          .then((result) => {
            if (result) {
              console.log(`[Override] Scheduling email sent to ${app.email}`)
            } else {
              console.error('[Override] resetAndSchedule returned null — no slots available')
            }
          })
          .catch((err) => console.error('[Override] Scheduling failed:', err))

        // Also fire the screen route for AI research + score (but skip scheduling
        // since we just handled it above)
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/screen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId, skipScheduling: true }),
        }).catch((err) => console.error('[Override] Screen trigger failed:', err))
      }
    }

    return NextResponse.json({ success: true, newStatus })
  } catch (err) {
    console.error('[Admin Override]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
