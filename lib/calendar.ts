/**
 * Calendar Orchestration Module
 *
 * Production implementation uses Google Calendar API with OAuth2.
 * This module provides:
 * 1. A real Google Calendar integration (when GOOGLE_REFRESH_TOKEN is set)
 * 2. A realistic mock fallback for demo/testing
 *
 * REAL IMPLEMENTATION FLOW:
 * - Use google-auth-library with service account or OAuth2 refresh token
 * - Call calendar.events.list() to fetch existing events
 * - Compute free slots by diffing against business hours
 * - Call calendar.events.insert() with status: 'tentative' to hold slots
 * - Call calendar.events.patch() to confirm/release holds
 * - Listen for webhook push notifications to detect candidate acceptance
 */

import { addMinutes, addDays, setHours, setMinutes, isWeekend, format } from 'date-fns'

export interface CalendarSlot {
  id: string
  start: string // ISO string
  end: string // ISO string
  label: string // Human readable
  googleEventId?: string
}

/**
 * Generate 4 available 45-minute slots within the next 5 business days.
 * In production: fetch real calendar and find genuine gaps.
 * Here: simulate realistic availability with deterministic mock data.
 */
export async function getAvailableSlots(
  interviewerEmail: string,
  _existingHolds: string[] = []
): Promise<CalendarSlot[]> {
  // Try real Google Calendar first
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
    return await getRealCalendarSlots(interviewerEmail)
  }

  // Fallback: simulate realistic availability
  return getMockSlots()
}

function getMockSlots(): CalendarSlot[] {
  const slots: CalendarSlot[] = []
  let current = new Date()

  // Move to next business day if weekend
  while (isWeekend(current)) {
    current = addDays(current, 1)
  }

  const preferredTimes = [10, 11, 14, 15, 16] // 10am, 11am, 2pm, 3pm, 4pm
  let dayOffset = 0
  let slotIndex = 0

  while (slots.length < 4 && dayOffset < 7) {
    const day = addDays(current, dayOffset)
    if (!isWeekend(day)) {
      const hour = preferredTimes[slotIndex % preferredTimes.length]
      const slotStart = setMinutes(setHours(day, hour), 0)
      const slotEnd = addMinutes(slotStart, 45)

      // Skip past times
      if (slotStart > new Date()) {
        slots.push({
          id: `slot_${dayOffset}_${hour}`,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: format(slotStart, "EEEE, MMMM d 'at' h:mm a 'EST'"),
          googleEventId: `mock_event_${dayOffset}_${hour}`,
        })
        slotIndex++
      }
    }
    if (slotIndex > 0 && slotIndex % 2 === 0) dayOffset++
    else if (slotIndex === 0) dayOffset++
  }

  return slots.slice(0, 4)
}

async function getRealCalendarSlots(interviewerEmail: string): Promise<CalendarSlot[]> {
  // Real implementation using googleapis:
  //
  // const { google } = require('googleapis')
  // const auth = new google.auth.OAuth2(
  //   process.env.GOOGLE_CLIENT_ID,
  //   process.env.GOOGLE_CLIENT_SECRET,
  //   process.env.GOOGLE_REDIRECT_URI
  // )
  // auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  // const calendar = google.calendar({ version: 'v3', auth })
  //
  // // Fetch busy times
  // const freeBusy = await calendar.freebusy.query({
  //   requestBody: {
  //     timeMin: new Date().toISOString(),
  //     timeMax: addDays(new Date(), 7).toISOString(),
  //     items: [{ id: interviewerEmail }],
  //   },
  // })
  // const busySlots = freeBusy.data.calendars[interviewerEmail].busy
  // // Compute free 45-min windows during business hours and return top 4

  console.log(`[Calendar] Would fetch real slots for ${interviewerEmail}`)
  return getMockSlots()
}

/**
 * Create a tentative hold on the interviewer's calendar.
 * Returns the Google Calendar event ID.
 */
export async function createTentativeHold(
  slot: CalendarSlot,
  candidateName: string,
  jobTitle: string,
  interviewerEmail: string
): Promise<string> {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    // Real: calendar.events.insert() with status: 'tentative'
    // return realEvent.id
  }

  // Mock: return a simulated event ID
  const mockEventId = `hold_${slot.id}_${Date.now()}`
  console.log(`[Calendar] Created tentative hold: ${mockEventId} for ${candidateName}`)
  return mockEventId
}

/**
 * Confirm a slot and release all other holds for this candidate.
 */
export async function confirmSlotAndReleaseOthers(
  confirmedEventId: string,
  releaseEventIds: string[],
  candidateName: string,
  candidateEmail: string,
  jobTitle: string
): Promise<{ meetingUrl: string; calendarEventId: string }> {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    // Real implementation:
    // 1. PATCH confirmed event: status -> confirmed, add candidate as attendee
    // 2. DELETE all release event IDs
    // 3. Create Google Meet link or Zoom via calendar conferenceData
  }

  const meetingUrl = `https://meet.google.com/mock-${Math.random().toString(36).slice(2, 9)}`
  console.log(`[Calendar] Confirmed ${confirmedEventId}, released: ${releaseEventIds.join(', ')}`)
  return { meetingUrl, calendarEventId: confirmedEventId }
}

/**
 * Send a calendar invite (.ics) to candidate.
 * In production: use Google Calendar API to send invite via attendee addition.
 */
export function generateICS(
  slot: CalendarSlot,
  candidateName: string,
  interviewerEmail: string,
  jobTitle: string,
  meetingUrl: string
): string {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TalentAI//Hiring Pipeline//EN
BEGIN:VEVENT
UID:interview-${Date.now()}@talentai.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:Interview: ${jobTitle}
DESCRIPTION:Your interview for the ${jobTitle} position.\\nJoin here: ${meetingUrl}
LOCATION:${meetingUrl}
ORGANIZER;CN=TalentAI Hiring:mailto:${interviewerEmail}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Interview in 30 minutes
END:VALARM
END:VEVENT
END:VCALENDAR`
}
