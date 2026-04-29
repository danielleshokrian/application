'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { FileText, Upload, Loader2, CheckCircle2, ChevronRight } from 'lucide-react'

interface Props {
  params: { jobId: string }
}

export default function ApplyPage({ params }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ applicationId: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
      setError('Invalid file type. Please upload a PDF or DOCX file.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
      e.target.value = ''
      return
    }

    setError(null)
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('job_id', params.jobId)

    if (!selectedFile) {
      setError('Please upload your resume.')
      setIsSubmitting(false)
      return
    }
    formData.set('resume', selectedFile)

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSuccess({ applicationId: data.applicationId })
    } catch {
      setError('Network error. Please check your connection and try again.')
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-5">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" strokeWidth={1} />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Application Submitted</h2>
          <p className="text-zinc-500 mb-2 leading-relaxed">
            We've received your application and sent a confirmation email.
          </p>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Our AI will review your resume and you'll hear from us within 2 business days if you're a strong match.
          </p>
          <div className="bg-zinc-50 rounded-xl p-3 text-xs text-zinc-400 font-mono mb-6">
            Application ID: {success.applicationId.slice(0, 8).toUpperCase()}
          </div>
          <Link href="/careers" className="btn-secondary">
            View other open roles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2 text-sm">
          <Link href="/" className="font-semibold text-zinc-900 tracking-tight">TalentAI</Link>
          <ChevronRight className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          <Link href="/careers" className="text-zinc-400 hover:text-zinc-700 transition-colors">Careers</Link>
          <ChevronRight className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          <span className="text-zinc-700">Apply</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Apply for This Role</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Your resume will be screened by our AI within minutes of submission.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-5">
            <h2 className="font-medium text-zinc-900">Personal Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label" htmlFor="full_name">Full Name *</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  className="input"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="label" htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="linkedin_url">LinkedIn Profile URL</label>
              <input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                className="input"
                placeholder="https://linkedin.com/in/janesmith"
              />
            </div>

            <div>
              <label className="label" htmlFor="portfolio_url">
                Portfolio / GitHub URL <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="portfolio_url"
                name="portfolio_url"
                type="url"
                className="input"
                placeholder="https://github.com/janesmith or https://janesmith.dev"
              />
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h2 className="font-medium text-zinc-900">Resume Upload</h2>

            <div>
              <label className="label">Resume / CV *</label>
              <div
                className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-zinc-400 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {selectedFile ? (
                  <div>
                    <div className="flex justify-center mb-3">
                      <FileText className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <p className="font-medium text-zinc-800">{selectedFile.name}</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </p>
                    <button
                      type="button"
                      className="text-xs text-zinc-500 hover:text-zinc-900 mt-2 underline underline-offset-2 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center mb-3">
                      <Upload className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                    </div>
                    <p className="font-medium text-zinc-600">Click to upload or drag & drop</p>
                    <p className="text-sm text-zinc-400 mt-1">PDF or DOCX — max 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedFile}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Submitting...</>
              : 'Submit Application'
            }
          </button>

          <p className="text-xs text-center text-zinc-400 leading-relaxed">
            By submitting, you agree to our use of AI to screen your application against the job requirements.
            Your data is processed securely and never shared with third parties.
          </p>
        </form>
      </main>
    </div>
  )
}
