import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateOfferLetter } from '@/lib/ai/screening'
import { sendOfferEmail } from '@/lib/email'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      applicationId,
      jobTitle,
      startDate,
      baseSalary,
      compensationStructure,
      equityBonus,
      reportingManager,
      customTerms,
    } = body

    if (!applicationId || !jobTitle || !startDate || !baseSalary || !reportingManager) {
      return NextResponse.json(
        { error: 'Missing required fields: applicationId, jobTitle, startDate, baseSalary, reportingManager' },
        { status: 400 }
      )
    }

    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Generate offer letter using Claude
    const letterContent = await generateOfferLetter({
      candidate_name: application.full_name,
      job_title: jobTitle,
      start_date: startDate,
      base_salary: baseSalary,
      compensation_structure: compensationStructure || null,
      equity_bonus: equityBonus || null,
      reporting_manager: reportingManager,
      custom_terms: customTerms || null,
      candidate_brief: application.ai_candidate_brief || null,
    })

    const signingToken = uuidv4().replace(/-/g, '')

    // Save offer letter (draft)
    const { data: offer, error } = await supabaseAdmin
      .from('offer_letters')
      .insert({
        application_id: applicationId,
        job_title: jobTitle,
        start_date: startDate,
        base_salary: baseSalary,
        compensation_structure: compensationStructure || null,
        equity_bonus: equityBonus || null,
        reporting_manager: reportingManager,
        custom_terms: customTerms || null,
        letter_content: letterContent,
        signing_token: signingToken,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('[Offer Generate]', error)
      return NextResponse.json({ error: 'Failed to save offer letter' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      offerId: offer.id,
      letterContent,
      signingToken,
      previewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/offer/${signingToken}`,
    })
  } catch (err) {
    console.error('[Offer Generate API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send offer to candidate
export async function PUT(request: NextRequest) {
  try {
    const { offerId } = await request.json()

    const { data: offer } = await supabaseAdmin
      .from('offer_letters')
      .select('*, application:applications(email, full_name)')
      .eq('id', offerId)
      .single()

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Send offer email
    await sendOfferEmail({
      to: offer.application.email,
      candidateName: offer.application.full_name,
      jobTitle: offer.job_title,
      signingToken: offer.signing_token,
    })

    // Update status to 'sent' and update application status
    await supabaseAdmin
      .from('offer_letters')
      .update({ status: 'sent' })
      .eq('id', offerId)

    await supabaseAdmin
      .from('applications')
      .update({ status: 'offer_sent' })
      .eq('id', offer.application_id)

    await supabaseAdmin.from('status_history').insert({
      application_id: offer.application_id,
      from_status: 'in_interview',
      to_status: 'offer_sent',
      changed_by: 'admin',
      note: `Offer letter sent for ${offer.job_title}`,
    })

    return NextResponse.json({ success: true, message: 'Offer sent to candidate' })
  } catch (err) {
    console.error('[Offer Send API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
