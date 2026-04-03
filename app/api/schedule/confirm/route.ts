import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { confirmSlotAndReleaseOthers, generateICS } from '@/lib/calendar'
import { sendInterviewConfirmation } from '@/lib/email'
import { scheduleFirefliesBot } from '@/lib/notetaker'
import type { CalendarSlot } from '@/lib/calendar'

export async function POST(request: NextRequest) {
  try {
    const { token, slotDbId } = await request.json()

    if (!token || !slotDbId) {
      return NextResponse.json({ error: 'token and slotDbId required' }, { status: 400 })
    }

    // Validate token
    const { data: tokenRecord } = await supabaseAdmin
      .from('scheduling_tokens')
      .select('*, application:applications(*, job:jobs(*))')
      .eq('token', token)
      .single()

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid scheduling link' }, { status: 404 })
    }

    if (tokenRecord.used) {
      return NextResponse.json({ error: 'This scheduling link has already been used' }, { status: 409 })
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This scheduling link has expired' }, { status: 410 })
    }

    const application = tokenRecord.application
    const job = application.job

    // Fetch the confirmed slot
    const { data: confirmedSlot } = await supabaseAdmin
      .from('interview_slots')
      .select('*')
      .eq('id', slotDbId)
      .eq('application_id', application.id)
      .single()

    if (!confirmedSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    if (confirmedSlot.status === 'confirmed') {
      return NextResponse.json({ error: 'This slot is already confirmed' }, { status: 409 })
    }

    // Fetch all other tentative slots for this application (to release)
    const { data: otherSlots } = await supabaseAdmin
      .from('interview_slots')
      .select('google_event_id')
      .eq('application_id', application.id)
      .eq('status', 'tentative')
      .neq('id', slotDbId)

    const releaseEventIds = (otherSlots || [])
      .map((s: { google_event_id: string | null }) => s.google_event_id)
      .filter((id: string | null): id is string => id !== null)

    // Confirm on Google Calendar + release holds
    const { meetingUrl, calendarEventId } = await confirmSlotAndReleaseOthers(
      confirmedSlot.google_event_id || '',
      releaseEventIds,
      application.full_name,
      application.email,
      job.title
    )

    // Update confirmed slot in DB
    await supabaseAdmin
      .from('interview_slots')
      .update({ status: 'confirmed', google_event_id: calendarEventId })
      .eq('id', slotDbId)

    // Release other slots
    await supabaseAdmin
      .from('interview_slots')
      .update({ status: 'released' })
      .eq('application_id', application.id)
      .neq('id', slotDbId)

    // Create interview record
    const { data: interview } = await supabaseAdmin
      .from('interviews')
      .insert({
        application_id: application.id,
        slot_id: slotDbId,
        meeting_url: meetingUrl,
        status: 'scheduled',
      })
      .select()
      .single()

    // Update application status
    await supabaseAdmin
      .from('applications')
      .update({ status: 'in_interview' })
      .eq('id', application.id)

    await supabaseAdmin.from('status_history').insert({
      application_id: application.id,
      from_status: 'shortlisted',
      to_status: 'in_interview',
      changed_by: 'candidate',
      note: `Interview scheduled for ${new Date(confirmedSlot.start_time).toLocaleString()}`,
    })

    // Mark scheduling token as used
    await supabaseAdmin
      .from('scheduling_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id)

    // Schedule Fireflies bot
    if (interview) {
      const slotObj: CalendarSlot = {
        id: slotDbId,
        start: confirmedSlot.start_time,
        end: confirmedSlot.end_time,
        label: new Date(confirmedSlot.start_time).toLocaleString(),
        googleEventId: confirmedSlot.google_event_id || undefined,
      }

      const ffMeetingId = await scheduleFirefliesBot({
        meetingUrl,
        meetingTitle: `Interview: ${application.full_name} — ${job.title}`,
        startTime: confirmedSlot.start_time,
        attendeeEmails: [application.email, confirmedSlot.interviewer_email],
      })

      if (ffMeetingId) {
        await supabaseAdmin
          .from('interviews')
          .update({ fireflies_meeting_id: ffMeetingId })
          .eq('id', interview.id)
      }

      // Send confirmation email with .ics attachment
      const ics = generateICS(
        slotObj,
        application.full_name,
        confirmedSlot.interviewer_email,
        job.title,
        meetingUrl
      )

      const slotLabel = new Date(confirmedSlot.start_time).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })

      await sendInterviewConfirmation({
        to: application.email,
        candidateName: application.full_name,
        jobTitle: job.title,
        slotLabel,
        meetingUrl,
        icsContent: ics,
      })
    }

    return NextResponse.json({
      success: true,
      meetingUrl,
      message: 'Interview confirmed! Check your email for the calendar invite.',
    })
  } catch (err) {
    console.error('[Schedule Confirm]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
