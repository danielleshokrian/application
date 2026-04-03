import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import SignaturePad from '@/components/SignaturePad'

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <span className="font-bold text-xl text-brand-600">TalentAI</span>
          <span className="text-sm text-gray-500 ml-3">— Offer Letter</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {isDraft && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            ⚠️ This offer has not been officially sent yet. It is in draft status.
          </div>
        )}

        {isSigned && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <p className="font-semibold">✅ Offer Signed</p>
            <p className="text-sm mt-1">
              Signed on {new Date(offer.signed_at!).toLocaleString()} from IP {offer.signer_ip}
            </p>
          </div>
        )}

        {/* Offer Letter Content */}
        <div className="card p-8 mb-6">
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
              {offer.letter_content}
            </pre>
          </div>
        </div>

        {/* Signature Section */}
        {!isSigned && !isDraft && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Sign Your Offer
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              By signing below, you accept this offer of employment. Your signature, IP address, and timestamp will be recorded.
            </p>
            <SignaturePad token={params.token} candidateName={offer.application?.full_name || ''} />
          </div>
        )}

        {isSigned && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-2">What's Next?</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ You'll receive a Slack workspace invitation shortly</li>
              <li>✅ Your manager will reach out to welcome you</li>
              <li>✅ HR will contact you about onboarding paperwork</li>
              <li>📅 Your start date: <strong>{new Date(offer.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong></li>
            </ul>
            <div className="mt-4 p-3 bg-brand-50 rounded-lg text-sm text-brand-700">
              Welcome to TalentAI! 🎉
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
