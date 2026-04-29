import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { slackAPI } from '@/lib/slack-internal'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const apiKey = process.env.ADMIN_API_KEY
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (!apiKey) return true
  return auth === `Bearer ${apiKey}`
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [applicationsResult, interviewsResult, offersResult, activityResult] = await Promise.all([
    supabaseAdmin.from('applications').select('status, ai_score, created_at'),
    supabaseAdmin.from('interviews').select('id').eq('status', 'scheduled'),
    supabaseAdmin.from('offer_letters').select('id').eq('status', 'sent'),
    supabaseAdmin
      .from('status_history')
      .select('from_status, to_status, changed_by, application:applications(full_name)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
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

  const statusLabels: Record<string, string> = {
    applied: 'Applied',
    screened: 'Screened',
    shortlisted: 'Shortlisted',
    in_interview: 'In Interview',
    offer_sent: 'Offer Sent',
    offer_signed: 'Offer Signed',
    rejected: 'Rejected',
  }

  const funnelLines = Object.entries(statusLabels)
    .map(([k, label]) => `• ${label}: *${byStatus[k] ?? 0}*`)
    .join('\n')

  const activity = activityResult.data ?? []
  const activityLines = activity.length > 0
    ? activity.map(row => {
        const name = (row.application as { full_name?: string } | null)?.full_name ?? 'Unknown'
        return `• ${name}: ${row.from_status} → ${row.to_status}`
      }).join('\n')
    : '_No status changes in the last 24 hours_'

  const channel = process.env.SLACK_HR_CHANNEL_ID ?? '#hiring'
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  await slackAPI('chat.postMessage', {
    channel,
    text: `Daily hiring pipeline report — ${date}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Hiring Pipeline — ${date}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Total Candidates*\n${applications.length}` },
          { type: 'mrkdwn', text: `*New (Last 7 Days)*\n${newLast7Days}` },
          { type: 'mrkdwn', text: `*Avg AI Score*\n${avgScore != null ? `${avgScore}/100` : 'N/A'}` },
          { type: 'mrkdwn', text: `*Interviews Scheduled*\n${interviewsResult.data?.length ?? 0}` },
          { type: 'mrkdwn', text: `*Offers Pending Signature*\n${offersResult.data?.length ?? 0}` },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Pipeline Breakdown*\n${funnelLines}` },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Activity (Last 24h)*\n${activityLines}` },
      },
    ],
  })

  return NextResponse.json({ ok: true, candidates: applications.length, date })
}
