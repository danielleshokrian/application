'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ScanSearch, Trash2, AlertTriangle } from 'lucide-react'

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
  const router = useRouter()
  const [newStatus, setNewStatus] = useState(application.status)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isRunningScreen, setIsRunningScreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

        <div className="border-t border-zinc-100 pt-3">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 text-sm font-medium text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} /> Delete Candidate
            </button>
          ) : (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 space-y-3">
              <div className="flex items-start gap-2 text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs leading-relaxed">
                  This will permanently delete <strong>{application.full_name}</strong> and all associated data — interviews, offers, and history. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setIsDeleting(true)
                    const res = await fetch('/api/admin/delete-candidate', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ applicationId: application.id }),
                    })
                    if (res.ok) {
                      router.push('/admin/candidates')
                    } else {
                      const data = await res.json()
                      setMessage({ type: 'error', text: data.error || 'Delete failed' })
                      setShowDeleteConfirm(false)
                      setIsDeleting(false)
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...</>
                    : 'Yes, delete'
                  }
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-3 py-2 bg-white border border-zinc-200 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
