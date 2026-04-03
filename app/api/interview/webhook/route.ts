/**
 * Fireflies.ai webhook handler.
 * Fireflies calls this endpoint when a meeting transcript is ready.
 * Configure in Fireflies dashboard: Settings → Webhooks → Add URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTranscript, formatTranscriptToText } from '@/lib/notetaker'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    console.log('[Fireflies Webhook] Received:', JSON.stringify(payload, null, 2))

    // Fireflies webhook payload structure:
    // { meetingId: "...", eventType: "Transcription completed", ... }
    const { meetingId, eventType } = payload

    if (eventType !== 'Transcription completed') {
      return NextResponse.json({ received: true, action: 'none' })
    }

    // Find the interview with this Fireflies meeting ID
    const { data: interview } = await supabaseAdmin
      .from('interviews')
      .select('id, application_id')
      .eq('fireflies_meeting_id', meetingId)
      .single()

    if (!interview) {
      console.warn(`[Fireflies Webhook] No interview found for meetingId: ${meetingId}`)
      return NextResponse.json({ received: true, action: 'no_match' })
    }

    // Fetch and store transcript
    const transcript = await getTranscript(meetingId)
    if (transcript) {
      const transcriptText = formatTranscriptToText(transcript)
      await supabaseAdmin
        .from('interviews')
        .update({
          transcript: transcriptText,
          summary: transcript.summary.overview,
          status: 'completed',
        })
        .eq('id', interview.id)
    }

    return NextResponse.json({ received: true, action: 'transcript_stored' })
  } catch (err) {
    console.error('[Fireflies Webhook]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
