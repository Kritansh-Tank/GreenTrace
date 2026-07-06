/**
 * GET /api/insights-cache?entry_id=<uuid>
 * Lightweight read-only endpoint used by the Goals page to fetch the
 * cached action plan for a given entry without re-running the agent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const entryId = req.nextUrl.searchParams.get('entry_id')
    if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('insights_cache')
      .select('action_plan, tips, summary, total_potential_saving_kg')
      .eq('user_id', user.id)
      .eq('entry_id', entryId)
      .maybeSingle()

    if (error || !data) return NextResponse.json({ action_plan: [], tips: [] })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ action_plan: [], tips: [] })
  }
}
