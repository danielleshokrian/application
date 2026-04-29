import { NextRequest, NextResponse } from 'next/server'
import { slackAPI } from '@/lib/slack-internal'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  const apiKey = process.env.ADMIN_API_KEY
  if (!apiKey) return true
  return request.headers.get('authorization') === `Bearer ${apiKey}`
}

interface CheckResult {
  name: string
  url: string
  status: number | null
  latencyMs: number
  pass: boolean
  detail?: string
}

async function probe(name: string, url: string, expectStatus: number): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const latencyMs = Date.now() - start
    const pass = res.status === expectStatus
    return { name, url, status: res.status, latencyMs, pass, detail: pass ? undefined : `Expected ${expectStatus}, got ${res.status}` }
  } catch (e) {
    return { name, url, status: null, latencyMs: Date.now() - start, pass: false, detail: String(e) }
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  if (!base) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not set' }, { status: 500 })
  }

  const checks = await Promise.all([
    probe('Health check', `${base}/api/health`, 200),
    probe('Applications list', `${base}/api/applications`, 200),
    probe('Offer sign (bad token → 404)', `${base}/api/offers/sign?token=smoke-test`, 404),
  ])

  const allPassed = checks.every(c => c.pass)
  const channel = process.env.SLACK_HR_CHANNEL_ID ?? '#hiring'
  const timestamp = new Date().toUTCString()

  const resultLines = checks.map(c =>
    `${c.pass ? 'PASS' : 'FAIL'} ${c.name} — ${c.status ?? 'no response'} (${c.latencyMs}ms)${c.detail ? ` — ${c.detail}` : ''}`
  ).join('\n')

  await slackAPI('chat.postMessage', {
    channel,
    text: allPassed ? `Deploy healthy — ${timestamp}` : `Deploy alert — smoke test failed — ${timestamp}`,
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

  return NextResponse.json({ ok: allPassed, checks, timestamp, debug: { base } })
}
