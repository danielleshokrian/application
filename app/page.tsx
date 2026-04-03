import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-white p-8">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium mb-6">
          AI-Powered Hiring Pipeline
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TalentAI Hiring System
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          End-to-end AI-augmented hiring from job listing to first day on Slack.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/careers" className="btn-primary text-base px-6 py-3">
            View Open Roles →
          </Link>
          <Link href="/admin" className="btn-secondary text-base px-6 py-3">
            Admin Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
          {[
            { phase: '01', label: 'Career Portal', desc: 'Dynamic job listings + application intake' },
            { phase: '02', label: 'AI Screening', desc: 'Resume parsing, fit scoring, candidate research' },
            { phase: '03', label: 'Smart Scheduling', desc: 'Calendar orchestration with conflict prevention' },
            { phase: '04', label: 'Interview Notetaker', desc: 'Fireflies.ai transcript + summary storage' },
            { phase: '05', label: 'Offer Generation', desc: 'AI-drafted offer letters with e-signature' },
            { phase: '06', label: 'Slack Onboarding', desc: 'Personalized welcome on offer sign' },
          ].map((item) => (
            <div key={item.phase} className="card p-4">
              <div className="text-xs font-mono text-brand-500 mb-1">Phase {item.phase}</div>
              <div className="font-semibold text-sm text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
