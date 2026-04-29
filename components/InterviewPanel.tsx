'use client'

import { useState } from 'react'
import {
  CalendarPlus, RefreshCw, Loader2, Clock,
  Video, FileText, AlertCircle,
} from 'lucide-react'

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
  pendingSlots?: PendingSlot[]
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
        <h2 className="font-semibold text-zinc-900 mb-2">Interview</h2>
        <p className="text-sm text-zinc-500 mb-4">
          No interview scheduled yet. Shortlist the candidate to trigger the scheduling email, or use the button below to send a link manually.
        </p>
        {message && (
          <p className={`text-sm mb-3 ${messageType === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
        <button
          onClick={resendSchedulingLink}
          disabled={isResending}
          className="btn-secondary text-sm"
        >
          {isResending
            ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Sending…</>
            : <><CalendarPlus className="h-4 w-4" strokeWidth={1.5} /> Send Scheduling Link</>
          }
        </button>
      </div>
    )
  }

  // ── State 2: Slots sent, awaiting candidate response ───────────────────────
  if (!interview && hasPendingSlots) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900">Interview</h2>
          <span className={`badge ${
            isExpired
              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
          }`}>
            {isExpired ? 'Link expired' : 'Awaiting response'}
          </span>
        </div>

        {schedulingToken && (
          <p className={`text-xs mb-4 flex items-center gap-1.5 ${isExpired ? 'text-rose-500' : 'text-zinc-400'}`}>
            {isExpired
              ? <><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> The scheduling link has expired — resend to offer new slots.</>
              : `Scheduling link expires in ${expiresIn} day${expiresIn !== 1 ? 's' : ''}`
            }
          </p>
        )}

        <div className="mb-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Slots offered to candidate
          </p>
          <div className="space-y-1.5">
            {pendingSlots.map((slot) => {
              const start = new Date(slot.start_time)
              return (
                <div
                  key={slot.id}
                  className="flex items-center gap-2.5 text-sm text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2"
                >
                  <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <span className="font-medium">
                    {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-zinc-400">
                    {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {message && (
          <p className={`text-sm mb-3 ${messageType === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}

        <button
          onClick={resendSchedulingLink}
          disabled={isResending}
          className="btn-secondary text-sm w-full justify-center"
        >
          {isResending
            ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Sending…</>
            : <><RefreshCw className="h-4 w-4" strokeWidth={1.5} /> {isExpired ? 'Resend with Fresh Slots' : 'Resend Scheduling Link'}</>
          }
        </button>
        <p className="text-xs text-zinc-400 mt-2 text-center">
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
        <h2 className="font-semibold text-zinc-900">Interview</h2>
        <div className="flex items-center gap-2">
          <span className={`badge ${
            interview.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
              : interview.status === 'cancelled'
              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
              : 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
          }`}>
            {interview.status === 'scheduled' ? 'Scheduled'
              : interview.status === 'completed' ? 'Completed'
              : 'Cancelled'}
          </span>
          {interview.status === 'cancelled' && (
            <button
              onClick={resendSchedulingLink}
              disabled={isResending}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {isResending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                : 'Reschedule →'
              }
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5 text-sm mb-4">
        {interview.slot && (
          <div className="flex items-center gap-2 text-zinc-600">
            <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
            <span className="font-medium">
              {new Date(interview.slot.start_time).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
              })}
            </span>
          </div>
        )}
        {interview.meeting_url && (
          <div className="flex items-center gap-2">
            <Video className="h-3.5 w-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
            <a
              href={interview.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-700 hover:text-zinc-900 underline underline-offset-2 font-medium"
            >
              Join Meeting
            </a>
          </div>
        )}
      </div>

      {interview.summary ? (
        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">AI Summary</h3>
          <div className="bg-zinc-50 rounded-lg p-3 text-sm text-zinc-700 leading-relaxed">
            {interview.summary}
          </div>
          {interview.transcript && (
            <details className="mt-3">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-700 transition-colors">
                View full transcript
              </summary>
              <pre className="mt-2 text-xs text-zinc-600 bg-zinc-50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {interview.transcript}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div>
          {message && (
            <p className={`text-sm mb-3 ${messageType === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
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
                {isFetching
                  ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Fetching…</>
                  : <><FileText className="h-4 w-4" strokeWidth={1.5} /> Fetch Transcript from Fireflies</>
                }
              </button>
              <p className="text-xs text-zinc-400 mt-2">
                Fireflies bot auto-joins the meeting. Transcript is available after the call ends.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
