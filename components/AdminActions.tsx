'use client'

import { useState } from 'react'
import { Loader2, ScanSearch } from 'lucide-react'

const STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'screened', label: 'Screened' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'in_interview', label: 'In Interview' },
  { value: 'offer_sent', label: 'Offer Sent' },
  { value: 'offer_signed', label: 'Offer Signed' },
  { value: 'rejected', label: 'Rejected' },
]

interface Props {
  application: {
    id: string
    status: string
    full_name: string
  }
}

export default function AdminActions({ application }: Props) {
  const [newStatus, setNewStatus] = useState(application.status)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isRunningScreen, setIsRunningScreen] = useState(false)

  const handleOverride = async () => {
    if (newStatus === application.status && !note) return
    setIsSubmitting(true)
    setMessage(null)

    const res = await fetch('/api/admin/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: application.id, newStatus, note }),
    })

    const data = await res.json()
    setIsSubmitting(false)

    if (res.ok) {
      setMessage({ type: 'success', text: `Status updated to "${newStatus}"` })
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setMessage({ type: 'error', text: data.error || 'Update failed' })
    }
  }

  const handleRescreen = async () => {
    setIsRunningScreen(true)
    setMessage(null)

    const res = await fetch('/api/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: application.id }),
    })

    const data = await res.json()
    setIsRunningScreen(false)

    if (res.ok) {
      setMessage({ type: 'success', text: `Re-screening complete. Score: ${data.score}/100 — reloading...` })
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setMessage({ type: 'error', text: data.error || 'Screening failed' })
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-zinc-900 mb-4">Admin Actions</h3>

      {message && (
        <div className={`mb-3 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="label">Override Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="input py-1.5"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Note (required for override)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="Reason for override..."
          />
        </div>

        <button
          onClick={handleOverride}
          disabled={isSubmitting || (newStatus === application.status && !note)}
          className="btn-primary w-full justify-center"
        >
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Updating...</>
            : 'Update Status'
          }
        </button>

        <div className="border-t border-zinc-100 pt-3">
          <button
            onClick={handleRescreen}
            disabled={isRunningScreen}
            className="btn-secondary w-full justify-center"
          >
            {isRunningScreen
              ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Running AI Screen...</>
              : <><ScanSearch className="h-4 w-4" strokeWidth={1.5} /> Re-run AI Screening</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
