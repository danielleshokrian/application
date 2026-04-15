import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import SignaturePad from '@/components/SignaturePad'
import { AlertTriangle, CheckCircle2, Check, Calendar } from 'lucide-react'

async function getOffer(token: string) {
  const { data } = await supabaseAdmin
    .from('offer_letters')
    .select('*, application:applications(full_name, email)')
    .eq('signing_token', token)
    .single()
  return data
}

export default async function OfferPage({ params }: { params: { token: string } }) {
  const offer = await getOffer(params.token)

  if (!offer) notFound()

  const isSigned = offer.status === 'signed'
  const isDraft = offer.status === 'draft'

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <span className="font-semibold text-zinc-900 tracking-tight">TalentAI</span>
          <span className="text-zinc-300 text-sm">—</span>
          <span className="text-sm text-zinc-400">Offer Letter</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {isDraft && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            This offer has not been officially sent yet. It is in draft status.
          </div>
        )}

        {isSigned && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-semibold">Offer Signed</p>
              <p className="text-sm mt-0.5 text-emerald-600">
                Signed on {new Date(offer.signed_at!).toLocaleString()} from IP {offer.signer_ip}
              </p>
            </div>
          </div>
        )}

        {/* Offer Letter Content */}
        <div className="card p-8 mb-6">
          <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 leading-relaxed">
            {offer.letter_content}
          </pre>
        </div>

        {/* Signature Section */}
        {!isSigned && !isDraft && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-2">Sign Your Offer</h2>
            <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
              By signing below, you accept this offer of employment. Your signature, IP address, and timestamp will be recorded.
            </p>
            <SignaturePad token={params.token} candidateName={offer.application?.full_name || ''} />
          </div>
        )}

        {isSigned && (
          <div className="card p-6">
            <h2 className="font-medium text-zinc-900 mb-3">What's Next</h2>
            <ul className="space-y-2.5 text-sm text-zinc-600">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={2} />
                You'll receive a Slack workspace invitation shortly
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={2} />
                Your manager will reach out to welcome you
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={2} />
                HR will contact you about onboarding paperwork
              </li>
              <li className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                Start date:{' '}
                <strong className="text-zinc-800">
                  {new Date(offer.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </strong>
              </li>
            </ul>
            <div className="mt-5 p-3 bg-zinc-50 rounded-xl text-sm text-zinc-600">
              Welcome to TalentAI — we're glad to have you on the team.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
