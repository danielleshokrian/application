import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Basic count
  const { data, error, count } = await supabaseAdmin
    .from('applications')
    .select('id, full_name, status, ai_score', { count: 'exact' })
    .limit(5)

  // Also test the exact query the candidates page uses (with join)
  const { data: withJoin, error: joinError } = await supabaseAdmin
    .from('applications')
    .select('id, full_name, status, job:jobs(id, title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(3)

  return NextResponse.json({
    count,
    data,
    error: error?.message,
    joinQuery: { data: withJoin, error: joinError?.message },
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
