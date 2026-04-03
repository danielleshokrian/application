'use client'

import { useState } from 'react'

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

  if (confirmed) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Confirmed!</h2>
        <p className="text-gray-600 mb-4">
          You'll receive a calendar invite and confirmation email shortly.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p className="text-gray-500 mb-1">Meeting link:</p>
          <a
            href={confirmed.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-500 hover:underline font-medium"
          >
            {confirmed.meetingUrl}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
            onClick={() => setSelected(slot.id)}
            className={`w-full card p-4 text-left transition-all ${
              isSelected
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-300'
                : 'hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-sm text-gray-500">
                  {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' — '}
                  {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
                  <span className="ml-2 text-xs text-gray-400">45 min</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}

      <button
        onClick={() => setShowCustom(!showCustom)}
        className="w-full text-center text-sm text-brand-500 hover:text-brand-600 py-2"
      >
        None of these work? Request a different time →
      </button>

      {showCustom && (
        <div className="card p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Tell us your preferred time and we'll check with the interviewer.
          </p>
          <textarea
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="e.g. Any day next week after 2pm EST, or mornings work best..."
          />
          <button
            onClick={() => {
              // In production: POST to /api/schedule/custom-request
              alert('Your request has been noted. The interviewer will confirm shortly.')
              setShowCustom(false)
            }}
            className="btn-secondary w-full justify-center"
          >
            Send Request
          </button>
        </div>
      )}

      {selected && (
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="btn-primary w-full justify-center py-3 text-base mt-4"
        >
          {isConfirming ? '⟳ Confirming...' : 'Confirm This Time →'}
        </button>
      )}
    </div>
  )
}
