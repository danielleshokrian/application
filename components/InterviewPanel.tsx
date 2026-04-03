'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Interview {
  id: string
  meeting_url: string | null
  transcript: string | null
  summary: string | null
  status: string
  slot?: {
    start_time: string
    end_time: string
    status: string
  } | null
}

interface Props {
  interview: Interview | null
  applicationId: string
}

export default function InterviewPanel({ interview, applicationId }: Props) {
  const router = useRouter()
  const [isFetching, setIsFetching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!interview) {
    return (
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Interview</h2>
        <p className="text-sm text-gray-500">No interview scheduled yet. Shortlist the candidate to trigger scheduling.</p>
      </div>
    )
  }

  const fetchTranscript = async () => {
    setIsFetching(true)
    setMessage(null)

    const res = await fetch('/api/interview/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: interview.id }),
    })
    const data = await res.json()
    setIsFetching(false)

    if (res.ok) {
      setMessage('Transcript fetched successfully.')
      setTimeout(() => router.refresh(), 500)
    } else {
      setMessage(data.error || 'Failed to fetch transcript')
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Interview</h2>
        <span className={`badge ${interview.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
          {interview.status}
        </span>
      </div>

      <div className="space-y-3 text-sm mb-4">
        {interview.slot && (
          <div>
            <span className="text-gray-500">Scheduled: </span>
            <span className="font-medium">
              {new Date(interview.slot.start_time).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
              })}
            </span>
          </div>
        )}
        {interview.meeting_url && (
          <div>
            <span className="text-gray-500">Meeting: </span>
            <a href={interview.meeting_url} target="_blank" rel="noreferrer"
              className="text-brand-500 hover:underline font-medium">
              Join Link ↗
            </a>
          </div>
        )}
      </div>

      {interview.summary ? (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Summary</h3>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
            {interview.summary}
          </div>
          {interview.transcript && (
            <details className="mt-3">
              <summary className="text-xs text-brand-500 cursor-pointer hover:underline">
                View full transcript
              </summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {interview.transcript}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div>
          {message && (
            <p className="text-sm text-green-600 mb-3">{message}</p>
          )}
          <button
            onClick={fetchTranscript}
            disabled={isFetching}
            className="btn-secondary text-sm"
          >
            {isFetching ? '⟳ Fetching...' : '📝 Fetch Transcript from Fireflies'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Fireflies bot auto-joins the meeting and transcript is available post-call.
          </p>
        </div>
      )}
    </div>
  )
}
