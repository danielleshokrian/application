import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const apiKey = process.env.ADMIN_API_KEY
  if (apiKey) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const [applicationsResult, interviewsResult, offersResult, activityResult] = await Promise.all([
    supabaseAdmin.from('applications').select('status, ai_score, created_at'),
    supabaseAdmin.from('interviews').select('id').eq('status', 'scheduled'),
    supabaseAdmin.from('offer_letters').select('id').eq('status', 'sent'),
    supabaseAdmin
      .from('status_history')
      .select('from_status, to_status, changed_by, note, created_at, application:applications(full_name)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const applications = applicationsResult.data ?? []

  const byStatus = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {})

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const newLast7Days = applications.filter(a => a.created_at >= sevenDaysAgo).length

  const scored = applications.filter(a => a.ai_score != null)
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((sum, a) => sum + (a.ai_score ?? 0), 0) / scored.length)
    : null

  const statuses = ['applied', 'screened', 'shortlisted', 'in_interview', 'offer_sent', 'offer_signed', 'rejected']
  const funnel = statuses.map(s => ({ status: s, count: byStatus[s] ?? 0 }))

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    pipeline: {
      total: applications.length,
      funnel,
      new_last_7_days: newLast7Days,
      avg_ai_score: avgScore,
      scored_candidates: scored.length,
    },
    active: {
      interviews_scheduled: interviewsResult.data?.length ?? 0,
      offers_pending_signature: offersResult.data?.length ?? 0,
    },
    recent_activity: activityResult.data ?? [],
  })
}
