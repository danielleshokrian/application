'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, MailCheck, ArrowRight, ArrowLeft } from 'lucide-react'

interface Slot {
  id: string
  start_time: string
  end_time: string
  status: string
}

interface Props {
  token: string
  slots: Slot[]
  applicationId: string
}

export default function ScheduleSelector({ token, slots, applicationId }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState<{ meetingUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showCustom, setShowCustom] = useState(false)
  const [customTime, setCustomTime] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [rescheduled, setRescheduled] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setIsConfirming(true)
    setError(null)

    const res = await fetch('/api/schedule/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, slotDbId: selected }),
    })

    const data = await res.json()
    setIsConfirming(false)

    if (!res.ok) {
      setError(data.error || 'Failed to confirm slot. Please try again.')
      return
    }

    setConfirmed({ meetingUrl: data.meetingUrl })
  }

  const handleRescheduleRequest = async () => {
    if (!customTime.trim()) return
    setIsRescheduling(true)
    setError(null)

    const res = await fetch('/api/schedule/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, message: customTime.trim() }),
    })

    const data = await res.json()
    setIsRescheduling(false)

    if (!res.ok) {
      setError(data.error || 'Could not send your request. Please try again.')
      return
    }

    setRescheduled(true)
  }

  if (confirmed) {
    return (
      <div className="card p-10 text-center">
        <div className="flex justify-center mb-5">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Interview Confirmed</h2>
        <p className="text-zinc-500 mb-6">
          You'll receive a calendar invite and confirmation email shortly.
        </p>
        <div className="bg-zinc-50 rounded-xl p-4 text-sm inline-block">
          <p className="text-zinc-400 mb-1 text-xs">Meeting link</p>
          <a
            href={confirmed.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-700 hover:text-zinc-900 underline underline-offset-2 font-medium"
          >
            {confirmed.meetingUrl}
          </a>
        </div>
      </div>
    )
  }

  if (rescheduled) {
    return (
      <div className="card p-10 text-center">
        <div className="flex justify-center mb-5">
          <MailCheck className="h-12 w-12 text-zinc-400" strokeWidth={1} />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Request Received</h2>
        <p className="text-zinc-500">
          We've sent fresh interview times to your email based on your availability.
          Please check your inbox and select a slot from the new options.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {slots.map((slot) => {
        const start = new Date(slot.start_time)
        const end = new Date(slot.end_time)
        const isSelected = selected === slot.id

        return (
          <button
            key={slot.id}
            onClick={() => { setSelected(slot.id); setShowCustom(false) }}
            className={`w-full card p-4 text-left transition-all ${
              isSelected
                ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10'
                : 'hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <div className="font-semibold text-zinc-900">
                  {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-sm text-zinc-500 mt-0.5">
                  {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' — '}
                  {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
                  <span className="ml-2 text-xs text-zinc-400">45 min</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}

      <button
        onClick={() => { setShowCustom(!showCustom); setSelected(null) }}
        className="w-full text-center text-sm text-zinc-500 hover:text-zinc-900 py-2 transition-colors flex items-center justify-center gap-1"
      >
        {showCustom
          ? <><ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to time options</>
          : <>None of these work? Request a different time <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} /></>
        }
      </button>

      {showCustom && (
        <div className="card p-5 space-y-3 border-zinc-200 bg-zinc-50">
          <p className="text-sm font-medium text-zinc-800">Tell us when you're available</p>
          <p className="text-xs text-zinc-500">
            We'll fetch new slots that match your schedule and email them to you.
          </p>
          <textarea
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            rows={3}
            className="input resize-none text-sm"
            placeholder="e.g. Any day next week after 2pm EST, mornings work best, or Mon/Wed/Fri only..."
          />
          <button
            onClick={handleRescheduleRequest}
            disabled={isRescheduling || !customTime.trim()}
            className="btn-primary w-full justify-center"
          >
            {isRescheduling
              ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Sending request...</>
              : 'Send Availability Request'
            }
          </button>
        </div>
      )}

      {selected && !showCustom && (
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="btn-primary w-full justify-center py-3 text-base mt-2"
        >
          {isConfirming
            ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Confirming...</>
            : 'Confirm This Time'
          }
        </button>
      )}
    </div>
  )
}
