'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Send, Pencil, Check, ArrowLeft } from 'lucide-react'

interface Props {
  applicationId: string
  candidateName: string
  jobTitle: string
  existingOffer: {
    id: string
    status: string
    signing_token: string
    letter_content: string
    signed_at?: string | null
    job_title: string
    start_date: string
    base_salary: string
    reporting_manager: string
  } | null
}

export default function OfferGeneratorPanel({
  applicationId,
  candidateName,
  jobTitle,
  existingOffer,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'preview' | 'sent'>(
    existingOffer ? (existingOffer.status === 'sent' || existingOffer.status === 'signed' ? 'sent' : 'preview') : 'form'
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [offer, setOffer] = useState(existingOffer)
  const [previewContent, setPreviewContent] = useState(existingOffer?.letter_content || '')
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    jobTitle: existingOffer?.job_title || jobTitle,
    startDate: existingOffer?.start_date || '',
    baseSalary: existingOffer?.base_salary || '',
    compensationStructure: '',
    equityBonus: '',
    reportingManager: existingOffer?.reporting_manager || '',
    customTerms: '',
  })

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)

    const res = await fetch('/api/offers/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        jobTitle: form.jobTitle,
        startDate: form.startDate,
        baseSalary: form.baseSalary,
        compensationStructure: form.compensationStructure,
        equityBonus: form.equityBonus,
        reportingManager: form.reportingManager,
        customTerms: form.customTerms,
      }),
    })

    const data = await res.json()
    setIsGenerating(false)

    if (!res.ok) {
      setError(data.error || 'Failed to generate offer')
      return
    }

    setOffer({ ...data, id: data.offerId, status: 'draft', job_title: form.jobTitle, start_date: form.startDate, base_salary: form.baseSalary, reporting_manager: form.reportingManager })
    setPreviewContent(data.letterContent)
    setStep('preview')
  }

  const handleSend = async () => {
    if (!offer) return
    setIsSending(true)
    setError(null)

    const res = await fetch('/api/offers/generate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: offer.id, letterContent: previewContent }),
    })

    const data = await res.json()
    setIsSending(false)

    if (!res.ok) {
      setError(data.error || 'Failed to send offer')
      return
    }

    setStep('sent')
    setTimeout(() => router.refresh(), 500)
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-zinc-900 mb-4">Offer Letter</h2>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-100">
          {error}
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleGenerate} className="space-y-4">
          <p className="text-sm text-zinc-500">
            Fill in the offer details below. Claude will generate a complete professional offer letter.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Confirmed Job Title *</label>
              <input required value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})}
                className="input" placeholder="Senior AI Product Engineer" />
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input required type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                className="input" />
            </div>
            <div>
              <label className="label">Base Salary *</label>
              <input required value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})}
                className="input" placeholder="$140,000/year" />
            </div>
            <div>
              <label className="label">Reporting Manager *</label>
              <input required value={form.reportingManager} onChange={e => setForm({...form, reportingManager: e.target.value})}
                className="input" placeholder="Sarah Chen, VP Engineering" />
            </div>
            <div>
              <label className="label">Equity / Bonus</label>
              <input value={form.equityBonus} onChange={e => setForm({...form, equityBonus: e.target.value})}
                className="input" placeholder="0.1% equity cliff 1yr, 10% annual bonus" />
            </div>
            <div>
              <label className="label">Compensation Structure</label>
              <input value={form.compensationStructure} onChange={e => setForm({...form, compensationStructure: e.target.value})}
                className="input" placeholder="Annual salary, paid bi-weekly" />
            </div>
          </div>

          <div>
            <label className="label">Custom Terms / Notes</label>
            <textarea value={form.customTerms} onChange={e => setForm({...form, customTerms: e.target.value})}
              rows={2} className="input resize-none"
              placeholder="Remote-first, home office stipend, etc." />
          </div>

          <button type="submit" disabled={isGenerating} className="btn-primary">
            {isGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Generating with AI...</>
              : <><Sparkles className="h-4 w-4" strokeWidth={1.5} /> Generate Offer Letter</>
            }
          </button>
        </form>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-700">
              {isEditing ? 'Editing Letter' : 'Preview — Review before sending'}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(e => !e)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
              >
                {isEditing
                  ? <><Check className="h-3.5 w-3.5" strokeWidth={2} /> Done editing</>
                  : <><Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Edit letter</>
                }
              </button>
              <button onClick={() => setStep('form')} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Edit Details
              </button>
            </div>
          </div>
          <div className="bg-zinc-50 rounded-xl p-4 max-h-80 overflow-auto border border-zinc-100">
            {isEditing ? (
              <textarea
                className="w-full min-h-64 text-xs text-zinc-700 font-sans leading-relaxed bg-transparent resize-y outline-none"
                value={previewContent}
                onChange={e => setPreviewContent(e.target.value)}
                autoFocus
              />
            ) : (
              <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewContent}
              </pre>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSend} disabled={isSending || isEditing} className="btn-primary">
              {isSending
                ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Sending...</>
                : <><Send className="h-4 w-4" strokeWidth={1.5} /> Send to Candidate</>
              }
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            {isEditing
              ? 'Click "Done editing" to finish, then send.'
              : 'Sending will email the candidate a link to review and e-sign their offer.'}
          </p>
        </div>
      )}

      {step === 'sent' && offer && (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg text-sm ${
            offer.status === 'signed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-orange-50 text-orange-700 border border-orange-100'
          }`}>
            {offer.status === 'signed'
              ? `Offer signed by ${candidateName} on ${new Date(offer.signed_at!).toLocaleString()}`
              : 'Offer sent — awaiting candidate signature'}
          </div>

          {offer.signing_token && (
            <div className="text-xs text-zinc-500">
              Signing link:{' '}
              <a
                href={`${APP_URL}/offer/${offer.signing_token}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
              >
                View offer
              </a>
            </div>
          )}

          <details>
            <summary className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer transition-colors">View letter content</summary>
            <pre className="mt-2 text-xs text-zinc-600 bg-zinc-50 rounded-xl p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {previewContent || offer.letter_content}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
