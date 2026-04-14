'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      body: JSON.stringify({ offerId: offer.id }),
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
      <h2 className="font-semibold text-gray-900 mb-4">Offer Letter</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleGenerate} className="space-y-4">
          <p className="text-sm text-gray-500">
            Fill in the offer details below. Claude will generate a complete professional offer letter.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Confirmed Job Title *</label>
              <input required value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})}
                className="input" placeholder="Senior AI Product Engineer" />
            </div>
            <div>
              <label className="label text-xs">Start Date *</label>
              <input required type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                className="input" />
            </div>
            <div>
              <label className="label text-xs">Base Salary *</label>
              <input required value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})}
                className="input" placeholder="$140,000/year" />
            </div>
            <div>
              <label className="label text-xs">Reporting Manager *</label>
              <input required value={form.reportingManager} onChange={e => setForm({...form, reportingManager: e.target.value})}
                className="input" placeholder="Sarah Chen, VP Engineering" />
            </div>
            <div>
              <label className="label text-xs">Equity / Bonus</label>
              <input value={form.equityBonus} onChange={e => setForm({...form, equityBonus: e.target.value})}
                className="input" placeholder="0.1% equity cliff 1yr, 10% annual bonus" />
            </div>
            <div>
              <label className="label text-xs">Compensation Structure</label>
              <input value={form.compensationStructure} onChange={e => setForm({...form, compensationStructure: e.target.value})}
                className="input" placeholder="Annual salary, paid bi-weekly" />
            </div>
          </div>

          <div>
            <label className="label text-xs">Custom Terms / Notes</label>
            <textarea value={form.customTerms} onChange={e => setForm({...form, customTerms: e.target.value})}
              rows={2} className="input resize-none"
              placeholder="Remote-first, home office stipend, etc." />
          </div>

          <button type="submit" disabled={isGenerating} className="btn-primary">
            {isGenerating ? '⟳ Generating with AI...' : '✨ Generate Offer Letter'}
          </button>
        </form>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Preview — Review before sending</h3>
            <button onClick={() => setStep('form')} className="text-xs text-gray-500 hover:text-gray-700">
              ← Edit Details
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {previewContent}
            </pre>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSend} disabled={isSending} className="btn-primary">
              {isSending ? '⟳ Sending...' : '📨 Send to Candidate'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Sending will email the candidate a link to review and e-sign their offer.
          </p>
        </div>
      )}

      {step === 'sent' && offer && (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg text-sm ${
            offer.status === 'signed'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`}>
            {offer.status === 'signed'
              ? `✅ Offer signed by ${candidateName} on ${new Date(offer.signed_at!).toLocaleString()}`
              : '📨 Offer sent — awaiting candidate signature'}
          </div>

          {offer.signing_token && (
            <div className="text-xs text-gray-500">
              Signing link:{' '}
              <a
                href={`${APP_URL}/offer/${offer.signing_token}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-500 hover:underline"
              >
                View offer ↗
              </a>
            </div>
          )}

          <details>
            <summary className="text-xs text-brand-500 cursor-pointer">View letter content</summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {previewContent || offer.letter_content}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
