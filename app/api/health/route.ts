import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {}

  // Supabase connectivity
  const dbStart = Date.now()
  try {
    const { error } = await supabaseAdmin.from('applications').select('id').limit(1)
    checks.database = error
      ? { ok: false, detail: error.message }
      : { ok: true, latencyMs: Date.now() - dbStart }
  } catch (e) {
    checks.database = { ok: false, detail: String(e) }
  }

  // Required env vars
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']
  const missing = required.filter(k => !process.env[k])
  checks.env_vars = missing.length === 0
    ? { ok: true }
    : { ok: false, detail: `Missing: ${missing.join(', ')}` }

  // Slack configured
  checks.slack = {
    ok: !!process.env.SLACK_BOT_TOKEN,
    detail: process.env.SLACK_BOT_TOKEN ? undefined : 'SLACK_BOT_TOKEN not set (mock mode)',
  }

  const allOk = Object.values(checks).every(c => c.ok)

  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 }
  )
}
