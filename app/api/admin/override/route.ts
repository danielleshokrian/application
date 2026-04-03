import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApplicationStatus } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { applicationId, newStatus, note } = await request.json()

    if (!applicationId || !newStatus) {
      return NextResponse.json(
        { error: 'applicationId and newStatus required' },
        { status: 400 }
      )
    }

    const validStatuses: ApplicationStatus[] = [
      'applied', 'screened', 'shortlisted', 'in_interview', 'offer_sent', 'offer_signed', 'rejected',
    ]

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: current } = await supabaseAdmin
      .from('applications')
      .select('status')
      .eq('id', applicationId)
      .single()

    await supabaseAdmin
      .from('applications')
      .update({
        status: newStatus,
        admin_override_note: note || null,
      })
      .eq('id', applicationId)

    await supabaseAdmin.from('status_history').insert({
      application_id: applicationId,
      from_status: current?.status || null,
      to_status: newStatus,
      changed_by: 'admin',
      note: note || 'Manual override by admin',
    })

    // If manually shortlisting, trigger research + scheduling
    if (newStatus === 'shortlisted' && current?.status !== 'shortlisted') {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      }).catch(console.error)
    }

    return NextResponse.json({ success: true, newStatus })
  } catch (err) {
    console.error('[Admin Override]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
