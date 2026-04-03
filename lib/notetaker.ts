/**
 * AI Notetaker Integration — Fireflies.ai
 *
 * DECISION: Chose Fireflies.ai over alternatives because:
 * - Fireflies has a documented GraphQL API for transcript retrieval
 * - It can auto-join meetings via bot invite (no host action required)
 * - API supports retrieval by meeting ID, attendee email, or date range
 * - Fathom has no public API. Read.ai has an MCP server but no REST API.
 * - Otter.ai has enterprise API access but requires manual approval.
 *
 * REAL IMPLEMENTATION:
 * 1. When scheduling an interview, POST to Fireflies to schedule bot attendance
 * 2. After meeting ends, Fireflies sends a webhook to /api/interview/webhook
 * 3. We retrieve the transcript via GraphQL API and store it against the candidate
 *
 * MOCK: Returns realistic mock transcript data for demo purposes.
 */

const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql'

export interface FirefliesTranscript {
  id: string
  title: string
  date: string
  summary: {
    overview: string
    action_items: string[]
    keywords: string[]
  }
  transcript_url: string
  sentences: Array<{
    speaker_name: string
    text: string
    start_time: number
  }>
}

/**
 * Schedule the Fireflies bot to join an upcoming meeting.
 */
export async function scheduleFirefliesBot(params: {
  meetingUrl: string
  meetingTitle: string
  startTime: string
  attendeeEmails: string[]
}): Promise<string | null> {
  if (!FIREFLIES_API_KEY) {
    console.log(`[Fireflies MOCK] Would schedule bot for: ${params.meetingUrl}`)
    return `mock_ff_meeting_${Date.now()}`
  }

  const mutation = `
    mutation ScheduleBot($input: BotInput!) {
      scheduleBot(input: $input) {
        id
      }
    }
  `

  try {
    const res = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIREFLIES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            meeting_link: params.meetingUrl,
            title: params.meetingTitle,
            start_time: params.startTime,
            attendees: params.attendeeEmails,
          },
        },
      }),
    })
    const data = await res.json()
    return data?.data?.scheduleBot?.id || null
  } catch (err) {
    console.error('[Fireflies] Failed to schedule bot:', err)
    return null
  }
}

/**
 * Retrieve transcript for a completed meeting.
 * Called after the Fireflies webhook fires, or on-demand from admin.
 */
export async function getTranscript(
  meetingId: string
): Promise<FirefliesTranscript | null> {
  if (!FIREFLIES_API_KEY || meetingId.startsWith('mock_')) {
    return getMockTranscript(meetingId)
  }

  const query = `
    query GetTranscript($id: String!) {
      transcript(id: $id) {
        id
        title
        date
        summary {
          overview
          action_items
          keywords
        }
        transcript_url
        sentences {
          speaker_name
          text
          start_time
        }
      }
    }
  `

  try {
    const res = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIREFLIES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { id: meetingId } }),
    })
    const data = await res.json()
    return data?.data?.transcript || null
  } catch (err) {
    console.error('[Fireflies] Failed to fetch transcript:', err)
    return null
  }
}

function getMockTranscript(meetingId: string): FirefliesTranscript {
  return {
    id: meetingId,
    title: 'Candidate Interview — TalentAI',
    date: new Date().toISOString(),
    summary: {
      overview:
        'Strong interview. The candidate demonstrated deep familiarity with LLM systems and AI product development. They gave concrete examples of shipping AI features end-to-end and showed good judgment on when to automate vs. when to keep humans in the loop. Culture fit appeared excellent — they asked thoughtful questions about the team\'s AI strategy. Recommend advancing to final round.',
      action_items: [
        'Hiring manager to send follow-up questions on system design',
        'Candidate to share GitHub repo link from portfolio project discussed',
        'Schedule final round within 5 business days',
      ],
      keywords: [
        'LLM',
        'RAG',
        'prompt engineering',
        'TypeScript',
        'Next.js',
        'Supabase',
        'product thinking',
        'agentic workflows',
      ],
    },
    transcript_url: `https://app.fireflies.ai/view/${meetingId}`,
    sentences: [
      { speaker_name: 'Interviewer', text: "Thanks for joining today. Let's start — tell me about a project where you built something meaningful with LLMs.", start_time: 0 },
      { speaker_name: 'Candidate', text: "Sure! My most recent project was an internal tool for a fintech company where I built a RAG system that let compliance officers query 10 years of regulatory documents in plain English. The latency challenge was interesting — I ended up implementing a semantic cache that cut repeat query time by 80%.", start_time: 15 },
      { speaker_name: 'Interviewer', text: "How did you handle hallucinations in that system?", start_time: 45 },
      { speaker_name: 'Candidate', text: "That was the hardest part. I built an evaluation harness with 200 ground-truth Q&A pairs and ran it on every model update. We also added citation tracking so every answer showed the source document — that way compliance officers could verify. It reduced trust issues significantly.", start_time: 55 },
      { speaker_name: 'Interviewer', text: "What does good AI product judgment look like to you?", start_time: 120 },
      { speaker_name: 'Candidate', text: "Knowing where not to use AI is as important as knowing where to use it. I think the best AI products are the ones where the AI handles the boring, repetitive cognitive work and keeps humans in the loop for decisions that actually matter — especially in high-stakes domains like hiring or compliance.", start_time: 130 },
      { speaker_name: 'Interviewer', text: "That's a great perspective. Let me ask about your stack preferences...", start_time: 185 },
    ],
  }
}

/**
 * Format a transcript into a readable string for storage.
 */
export function formatTranscriptToText(transcript: FirefliesTranscript): string {
  const lines = transcript.sentences.map(
    (s) => `[${Math.floor(s.start_time / 60)}:${String(s.start_time % 60).padStart(2, '0')}] ${s.speaker_name}: ${s.text}`
  )
  return lines.join('\n')
}
