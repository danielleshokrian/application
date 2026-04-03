'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  params: { jobId: string }
}

export default function ApplyPage({ params }: Props) {
  const router = useRouter()
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-2">
            We've received your application and sent a confirmation email.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Our AI will review your resume and you'll hear from us within 2 business days if you're a strong match.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 font-mono mb-6">
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="font-bold text-xl text-brand-600">TalentAI</Link>
          <span className="text-gray-300">›</span>
          <Link href="/careers" className="text-sm text-gray-500 hover:text-gray-700">Careers</Link>
          <span className="text-gray-300">›</span>
          <span className="text-sm text-gray-700">Apply</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Apply for This Role</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Your resume will be screened by our AI within minutes of submission.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>

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
                Portfolio / GitHub URL <span className="text-gray-400 font-normal">(optional)</span>
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
            <h2 className="font-semibold text-gray-900">Resume Upload</h2>

            <div>
              <label className="label">Resume / CV *</label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {selectedFile ? (
                  <div>
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </p>
                    <button
                      type="button"
                      className="text-xs text-brand-500 mt-2 hover:underline"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-3">📎</div>
                    <p className="font-medium text-gray-700">Click to upload or drag & drop</p>
                    <p className="text-sm text-gray-500 mt-1">PDF or DOCX — max 5MB</p>
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
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Submitting...
              </span>
            ) : (
              'Submit Application →'
            )}
          </button>

          <p className="text-xs text-center text-gray-400">
            By submitting, you agree to our use of AI to screen your application against the job requirements.
            Your data is processed securely and never shared with third parties.
          </p>
        </form>
      </main>
    </div>
  )
}
