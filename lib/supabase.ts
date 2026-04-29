import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side Supabase (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase (uses service role — bypasses RLS)
// cache: 'no-store' prevents Next.js from caching Supabase REST responses,
// which would otherwise serve stale data even when force-dynamic is set.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) =>
      fetch(url, { ...options, cache: 'no-store' }),
  },
})

export type Database = {
  public: {
    Tables: {
      jobs: { Row: import('@/types').Job }
      applications: { Row: import('@/types').Application }
      interview_slots: { Row: import('@/types').InterviewSlot }
      interviews: { Row: import('@/types').Interview }
      offer_letters: { Row: import('@/types').OfferLetter }
      scheduling_tokens: { Row: import('@/types').SchedulingToken }
      status_history: { Row: import('@/types').StatusHistoryEntry }
    }
  }
}
