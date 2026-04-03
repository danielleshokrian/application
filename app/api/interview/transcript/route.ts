import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTranscript, formatTranscriptToText } from '@/lib/notetaker'

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json()

    const { data: interview, error } = await supabaseAdmin
      .from('interviews')
      .select('*, application:applications(full_name, email)')
      .eq('id', interviewId)
      .single()

    if (error || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const meetingId = interview.fireflies_meeting_id || `mock_${interviewId}`
    const transcript = await getTranscript(meetingId)

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not available yet' }, { status: 404 })
    }

    const transcriptText = formatTranscriptToText(transcript)

    await supabaseAdmin
      .from('interviews')
      .update({
        transcript: transcriptText,
        summary: transcript.summary.overview,
        status: 'completed',
      })
      .eq('id', interviewId)

    return NextResponse.json({ success: true, summary: transcript.summary })
  } catch (err) {
    console.error('[Transcript API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const applicationId = searchParams.get('applicationId')

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
  }

  const { data: interview } = await supabaseAdmin
    .from('interviews')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ interview })
}
