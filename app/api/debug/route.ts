import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error, count } = await supabaseAdmin
    .from('applications')
    .select('id, full_name, status, ai_score', { count: 'exact' })
    .limit(5)

  return NextResponse.json({
    count,
    data,
    error: error?.message,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
