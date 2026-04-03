import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ScheduleSelector from '@/components/ScheduleSelector'

async function getSchedulingData(token: string) {
  const { data: tokenRecord } = await supabaseAdmin
    .from('scheduling_tokens')
    .select('*, application:applications(full_name, email, job:jobs(title))')
    .eq('token', token)
    .single()

  if (!tokenRecord) return null

  const { data: slots } = await supabaseAdmin
    .from('interview_slots')
    .select('*')
    .eq('application_id', tokenRecord.application_id)
    .eq('status', 'tentative')
    .order('start_time', { ascending: true })

  return { tokenRecord, slots: slots || [] }
}

export default async function SchedulePage({ params }: { params: { token: string } }) {
  const data = await getSchedulingData(params.token)

  if (!data) notFound()

  const { tokenRecord, slots } = data
  const app = tokenRecord.application

  const isExpired = new Date(tokenRecord.expires_at) < new Date()
  const isUsed = tokenRecord.used

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <span className="font-bold text-xl text-brand-600">TalentAI</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {isUsed ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Scheduled</h1>
            <p className="text-gray-600">Your interview has already been confirmed. Check your email for the calendar invite.</p>
          </div>
        ) : isExpired ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-gray-600">This scheduling link has expired. Please contact us to get new options.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Schedule Your Interview
              </h1>
              <p className="text-gray-600">
                Hi {app?.full_name?.split(' ')[0]}! Select a time for your{' '}
                <strong>{app?.job?.title}</strong> interview.
              </p>
              <p className="text-sm text-gray-400 mt-1">All times are 45 minutes</p>
            </div>

            <ScheduleSelector
              token={params.token}
              slots={slots}
              applicationId={tokenRecord.application_id}
            />
          </>
        )}
      </main>
    </div>
  )
}
