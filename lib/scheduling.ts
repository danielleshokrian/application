/**
 * Shared scheduling flow — creates fresh slots, tentative holds, a scheduling
 * token, and sends the invite email. Used by:
 *  - /api/screen         (first-time scheduling after AI shortlist)
 *  - /api/schedule/reschedule  (candidate requests different time)
 *  - /api/admin/resend-schedule  (admin manually resends link)
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getAvailableSlots, createTentativeHold } from '@/lib/calendar'
import { sendSchedulingEmail } from '@/lib/email'
import { v4 as uuidv4 } from 'uuid'
import { addDays } from 'date-fns'

interface Application {
  id: string
  full_name: string
  email: string
}

interface Job {
  title: string
}

/**
 * Release all existing tentative slots and invalidate any open scheduling
 * tokens for this application, then create fresh ones.
 */
export async function resetAndSchedule(
  application: Application,
  job: Job,
  /** Optional note shown in the scheduling email (e.g. candidate's availability hint) */
  candidateNote?: string
): Promise<{ token: string } | null> {
  const applicationId = application.id

  // Release existing tentative slots
  await supabaseAdmin
    .from('interview_slots')
    .update({ status: 'released' })
    .eq('application_id', applicationId)
    .eq('status', 'tentative')

  // Invalidate open scheduling tokens
  await supabaseAdmin
    .from('scheduling_tokens')
    .update({ used: true })
    .eq('application_id', applicationId)
    .eq('used', false)

  const interviewerEmail = process.env.INTERVIEWER_EMAIL || 'interviewer@talentai.io'

  // Fetch fresh available slots from calendar
  const slots = await getAvailableSlots(interviewerEmail)

  if (slots.length === 0) {
    console.error('[Scheduling] No available slots returned from calendar')
    return null
  }

  // Create tentative holds and slot records
  for (const slot of slots) {
    const googleEventId = await createTentativeHold(
      slot,
      application.full_name,
      job.title,
      interviewerEmail
    )

    await supabaseAdmin.from('interview_slots').insert({
      application_id: applicationId,
      interviewer_email: interviewerEmail,
      start_time: slot.start,
      end_time: slot.end,
      status: 'tentative',
      google_event_id: googleEventId,
    })
  }

  // Create new scheduling token (5-day expiry)
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

  if (!tokenRecord) {
    console.error('[Scheduling] Failed to create scheduling token')
    return null
  }

  // Send scheduling email (with optional candidate note)
  await sendSchedulingEmail({
    to: application.email,
    candidateName: application.full_name,
    jobTitle: job.title,
    slots: slots.map((s) => ({ ...s })),
    schedulingToken: token,
    note: candidateNote,
  })

  console.log(`[Scheduling] Sent scheduling email to ${application.email} (token: ${token.slice(0, 8)}...)`)
  return { token }
}
