import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { slackAPI } from '@/lib/slack-internal'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  const apiKey = process.env.ADMIN_API_KEY
  if (!apiKey) return true
  return request.headers.get('authorization') === `Bearer ${apiKey}`
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: { name: string; pass: boolean; detail?: string }[] = []

  // Check 1: Supabase connectivity
  try {
    const { error } = await supabaseAdmin.from('applications').select('id').limit(1)
    checks.push(error
      ? { name: 'Database', pass: false, detail: error.message }
      : { name: 'Database', pass: true }
    )
  } catch (e) {
    checks.push({ name: 'Database', pass: false, detail: String(e) })
  }

  // Check 2: Required env vars
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']
  const missing = required.filter(k => !process.env[k])
  checks.push(missing.length === 0
    ? { name: 'Environment variables', pass: true }
    : { name: 'Environment variables', pass: false, detail: `Missing: ${missing.join(', ')}` }
  )

  // Check 3: Anthropic API reachable
  try {
    const res = await fetch('https://api.anthropic.com', { method: 'HEAD' })
    checks.push({ name: 'Anthropic API reachable', pass: res.status < 500 })
  } catch (e) {
    checks.push({ name: 'Anthropic API reachable', pass: false, detail: String(e) })
  }

  // Check 4: Slack configured
  checks.push({
    name: 'Slack configured',
    pass: !!process.env.SLACK_BOT_TOKEN,
    detail: process.env.SLACK_BOT_TOKEN ? undefined : 'SLACK_BOT_TOKEN not set',
  })

  const allPassed = checks.every(c => c.pass)
  const timestamp = new Date().toUTCString()
  const channel = process.env.SLACK_HR_CHANNEL_ID ?? '#hiring'

  const resultLines = checks
    .map(c => `${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
    .join('\n')

  await slackAPI('chat.postMessage', {
    channel,
    text: allPassed ? `Deploy healthy — ${timestamp}` : `Deploy alert — ${timestamp}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: allPassed ? 'Deploy Healthy — All Checks Passed' : 'Deploy Alert — Smoke Test Failed',
        },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `\`\`\`${resultLines}\`\`\`` },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: timestamp }],
      },
    ],
  })

  return NextResponse.json({ ok: allPassed, checks, timestamp })
}
