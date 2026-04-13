'use client'

import { useState } from 'react'

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

interface PendingSlot {
  id: string
  start_time: string
  end_time: string
}

interface SchedulingToken {
  expires_at: string
  created_at: string
}

interface Props {
  interview: Interview | null
  applicationId: string
  /** Tentative slots that were sent to the candidate but not yet confirmed */
  pendingSlots?: PendingSlot[]
  /** The active (unused, non-expired) scheduling token, if any */
  schedulingToken?: SchedulingToken | null
}

export default function InterviewPanel({
  interview,
  applicationId,
  pendingSlots = [],
  schedulingToken,
}: Props) {
  const [isFetching, setIsFetching] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const fetchTranscript = async () => {
    setIsFetching(true)
    setMessage(null)

    const res = await fetch('/api/interview/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: interview?.id }),
    })
    const data = await res.json()
    setIsFetching(false)

    if (res.ok) {
      setMessage('Transcript fetched. Reloading…')
      setMessageType('success')
      setTimeout(() => window.location.reload(), 800)
    } else {
      setMessage(data.error || 'Failed to fetch transcript')
      setMessageType('error')
    }
  }

  const resendSchedulingLink = async () => {
    setIsResending(true)
    setMessage(null)

    const res = await fetch('/api/admin/resend-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId }),
    })
    const data = await res.json()
    setIsResending(false)

    if (res.ok) {
      setMessage('New scheduling link sent! Reloading…')
      setMessageType('success')
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setMessage(data.error || 'Failed to resend link')
      setMessageType('error')
    }
  }

  const hasPendingSlots = pendingSlots.length > 0
  const tokenExpiry = schedulingToken ? new Date(schedulingToken.expires_at) : null
  const isExpired = tokenExpiry ? tokenExpiry < new Date() : false
  const expiresIn = tokenExpiry
    ? Math.ceil((tokenExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  // ── State 1: Nothing sent yet ──────────────────────────────────────────────
  if (!interview && !hasPendingSlots) {
    return (
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Interview</h2>
        <p className="text-sm text-gray-500 mb-4">
          No interview scheduled yet. Shortlist the candidate to trigger the scheduling email, or use the button below to send a link manually.
        </p>
        {message && (
          <p className={`text-sm mb-3 ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
        <button
          onClick={resendSchedulingLink}
          disabled={isResending}
          className="btn-secondary text-sm"
        >
          {isResending ? '⟳ Sending…' : '📅 Send Scheduling Link'}
        </button>
      </div>
    )
  }

  // ── State 2: Slots sent, awaiting candidate response ───────────────────────
  if (!interview && hasPendingSlots) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Interview</h2>
          <span className={`badge ${isExpired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {isExpired ? 'Link expired' : 'Awaiting response'}
          </span>
        </div>

        {/* Expiry info */}
        {schedulingToken && (
          <p className={`text-xs mb-4 ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
            {isExpired
              ? 'The scheduling link has expired — resend to offer new slots.'
              : `Scheduling link expires in ${expiresIn} day${expiresIn !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* Offered slots */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Slots offered to candidate
          </p>
          <div className="space-y-1.5">
            {pendingSlots.map((slot) => {
              const start = new Date(slot.start_time)
              return (
                <div
                  key={slot.id}
                  className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-gray-400">◷</span>
                  <span className="font-medium">
                    {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-gray-400">
                    {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <p className={`text-sm mb-3 ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        {/* Resend button */}
        <button
          onClick={resendSchedulingLink}
          disabled={isResending}
          className="btn-secondary text-sm w-full justify-center"
        >
          {isResending
            ? '⟳ Sending…'
            : isExpired
            ? '🔄 Resend with Fresh Slots'
            : '🔄 Resend Scheduling Link'}
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Replaces current slots with new availability and resends the email.
        </p>
      </div>
    )
  }

  // ── State 3 & 4: Interview confirmed or completed ──────────────────────────
  if (!interview) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Interview</h2>
        <div className="flex items-center gap-2">
          <span className={`badge ${
            interview.status === 'completed'
              ? 'bg-green-100 text-green-700'
              : interview.status === 'cancelled'
              ? 'bg-red-100 text-red-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {interview.status === 'scheduled' ? 'Scheduled' :
             interview.status === 'completed' ? 'Completed' : 'Cancelled'}
          </span>
          {/* Allow resending even after cancellation */}
          {interview.status === 'cancelled' && (
            <button
              onClick={resendSchedulingLink}
              disabled={isResending}
              className="text-xs text-brand-500 hover:underline"
            >
              {isResending ? '⟳' : 'Reschedule →'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 text-sm mb-4">
        {interview.slot && (
          <div>
            <span className="text-gray-500">Scheduled: </span>
            <span className="font-medium">
              {new Date(interview.slot.start_time).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
              })}
            </span>
          </div>
        )}
        {interview.meeting_url && (
          <div>
            <span className="text-gray-500">Meeting: </span>
            <a
              href={interview.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-500 hover:underline font-medium"
            >
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
            <p className={`text-sm mb-3 ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
          {interview.status === 'scheduled' && (
            <>
              <button
                onClick={fetchTranscript}
                disabled={isFetching}
                className="btn-secondary text-sm"
              >
                {isFetching ? '⟳ Fetching…' : '📝 Fetch Transcript from Fireflies'}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Fireflies bot auto-joins the meeting. Transcript is available after the call ends.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
