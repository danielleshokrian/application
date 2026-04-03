import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOfferSignedAlertToAdmin } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  const { data: offer } = await supabaseAdmin
    .from('offer_letters')
    .select('*, application:applications(full_name, email)')
    .eq('signing_token', token)
    .single()

  if (!offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  return NextResponse.json({ offer })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, signatureData } = body

    if (!token || !signatureData) {
      return NextResponse.json(
        { error: 'token and signatureData required' },
        { status: 400 }
      )
    }

    const { data: offer } = await supabaseAdmin
      .from('offer_letters')
      .select('*, application:applications(full_name, email, id)')
      .eq('signing_token', token)
      .single()

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.status === 'signed') {
      return NextResponse.json({ error: 'Offer already signed' }, { status: 409 })
    }

    if (offer.status === 'draft') {
      return NextResponse.json({ error: 'Offer has not been officially sent yet' }, { status: 409 })
    }

    const signedAt = new Date().toISOString()
    const signerIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0'

    // Record signature
    await supabaseAdmin
      .from('offer_letters')
      .update({
        status: 'signed',
        signed_at: signedAt,
        signature_data: signatureData,
        signer_ip: signerIp,
      })
      .eq('signing_token', token)

    // Update application status
    await supabaseAdmin
      .from('applications')
      .update({ status: 'offer_signed' })
      .eq('id', offer.application_id)

    await supabaseAdmin.from('status_history').insert({
      application_id: offer.application_id,
      from_status: 'offer_sent',
      to_status: 'offer_signed',
      changed_by: 'candidate',
      note: `Offer signed at ${signedAt} from IP ${signerIp}`,
    })

    // Alert admin via email
    sendOfferSignedAlertToAdmin({
      candidateName: offer.application.full_name,
      jobTitle: offer.job_title,
      signedAt,
      applicationId: offer.application_id,
    }).catch(console.error)

    // Trigger Slack onboarding (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/slack/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: offer.application_id }),
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      signedAt,
      message: 'Offer signed successfully. Welcome to TalentAI!',
    })
  } catch (err) {
    console.error('[Offer Sign API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
