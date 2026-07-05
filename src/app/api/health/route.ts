import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shared Supabase keepalive ping.
 * Supabase free tier pauses after 7 days of no DB activity.
 * This lightweight query counts as activity and prevents that.
 */
async function pingDatabase(): Promise<'ok' | 'degraded'> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('footprint_entries')
      .select('id')
      .limit(1)
    return error ? 'degraded' : 'ok'
  } catch {
    return 'degraded'
  }
}

/** GET — full health response with JSON body (used by UptimeRobot + dashboards) */
export async function GET() {
  const db = await pingDatabase()
  return NextResponse.json(
    {
      status: db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'greentrace',
      db,
    },
    { status: 200 }, // always 200 so UptimeRobot doesn't alert on DB hiccups
  )
}

/**
 * HEAD — no response body, but DOES ping Supabase.
 * UptimeRobot can use either GET or HEAD — both keep the DB alive.
 */
export async function HEAD() {
  await pingDatabase()
  return new NextResponse(null, { status: 200 })
}

