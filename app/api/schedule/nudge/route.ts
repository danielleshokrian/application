/**
 * Scheduling nudge API.
 * In production: called by a cron job every hour.
 * Checks for scheduling tokens that are:
 * - Not used
 * - Not expired
 * - Older than 48 hours
 * - Haven't had a nudge sent yet
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSchedulingNudge } from '@/lib/email'
import { subHours } from 'date-fns'

export async function POST(request: NextRequest) {
  // Simple auth check for cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = subHours(new Date(), 48).toISOString()

  const { data: tokens, error } = await supabaseAdmin
    .from('scheduling_tokens')
    .select('*, application:applications(email, full_name, job:jobs(title))')
    .eq('used', false)
    .is('nudge_sent_at', null)
    .lt('created_at', cutoff)
    .gt('expires_at', new Date().toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []
  for (const tokenRecord of tokens || []) {
    const app = tokenRecord.application
    if (!app) continue

    try {
      await sendSchedulingNudge({
        to: app.email,
        candidateName: app.full_name,
        jobTitle: app.job?.title || 'the role',
        schedulingToken: tokenRecord.token,
      })

      await supabaseAdmin
        .from('scheduling_tokens')
        .update({ nudge_sent_at: new Date().toISOString() })
        .eq('id', tokenRecord.id)

      results.push({ token: tokenRecord.token, status: 'nudge_sent' })
    } catch (err) {
      results.push({ token: tokenRecord.token, status: 'failed', error: String(err) })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
