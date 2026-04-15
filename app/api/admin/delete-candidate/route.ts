import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const { applicationId } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId required' }, { status: 400 })
    }

    // Verify the application exists before deleting
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select('id, full_name')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Delete related records in dependency order to avoid FK violations
    // interviews reference interview_slots, so delete interviews first
    await supabaseAdmin.from('interviews').delete().eq('application_id', applicationId)
    await supabaseAdmin.from('interview_slots').delete().eq('application_id', applicationId)
    await supabaseAdmin.from('scheduling_tokens').delete().eq('application_id', applicationId)
    await supabaseAdmin.from('offer_letters').delete().eq('application_id', applicationId)
    await supabaseAdmin.from('status_history').delete().eq('application_id', applicationId)

    const { error: deleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', applicationId)

    if (deleteError) {
      console.error('[Delete Candidate] Failed to delete application:', deleteError)
      return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 })
    }

    console.log(`[Delete Candidate] Deleted application ${applicationId} (${application.full_name})`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Delete Candidate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
