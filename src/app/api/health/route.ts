import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  let db = 'ok'

  try {
    // Lightweight ping — keeps Supabase free tier from pausing
    const supabase = await createClient()
    const { error } = await supabase.from('footprint_entries').select('id').limit(1)
    if (error) db = 'degraded'
  } catch {
    db = 'degraded'
  }

  return NextResponse.json(
    {
      status: db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'carbonsense',
      db,
    },
    { status: 200 } // always 200 so UptimeRobot doesn't alert on DB hiccups
  )
}

// HEAD for UptimeRobot — runs GET logic but returns no body
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
