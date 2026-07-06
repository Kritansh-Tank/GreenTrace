/**
 * GreenTrace Insights API — EcoAgent Endpoint
 * ---------------------------------------------
 * POST /api/insights
 *   Body: { breakdown, goal_kg, entry_id?, question?, form_data? }
 *
 * Flow (agent mode):
 *   1. Check insights_cache for this (user_id, entry_id)
 *   2. Cache HIT  → return stored result instantly (no agent call)
 *   3. Cache MISS → run full ReAct agent → store in insights_cache → return
 *
 * Flow (chat mode):
 *   - `question` present → lightweight single-turn response (never cached)
 *
 * Security:
 *   - Requires authenticated Supabase session (401 if not logged in)
 *   - RLS on insights_cache ensures users only read/write their own rows
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runEcoAgent, runEcoAgentChat } from '@/lib/agent/ecoagent'
import type { CO2Breakdown } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const breakdown: Partial<CO2Breakdown> & { total_kg: number } = {
      travel_kg:   Number(body.breakdown?.travel_kg   ?? 0),
      food_kg:     Number(body.breakdown?.food_kg     ?? 0),
      energy_kg:   Number(body.breakdown?.energy_kg   ?? 0),
      shopping_kg: Number(body.breakdown?.shopping_kg ?? 0),
      commute_kg:  Number(body.breakdown?.commute_kg  ?? 0),
      total_kg:    Number(body.breakdown?.total_kg    ?? 0),
    }
    const goalKg   = Number(body.goal_kg ?? 0)
    const entryId  = typeof body.entry_id === 'string' ? body.entry_id : null
    const question = typeof body.question === 'string' ? body.question.trim() : null
    const formData = (body.form_data as Record<string, unknown>) ?? {}

    // ── Chat mode: lightweight single-turn, never cached ─────────────────────
    if (question) {
      const reply = await runEcoAgentChat(question, breakdown, goalKg)
      return NextResponse.json({ reply })
    }

    // ── Cache check: return instantly if we already have results ──────────────
    if (entryId) {
      const { data: cached } = await supabase
        .from('insights_cache')
        .select('tips, action_plan, trace, summary, total_potential_saving_kg, iterations')
        .eq('user_id', user.id)
        .eq('entry_id', entryId)
        .maybeSingle()

      if (cached) {
        console.log(`[EcoAgent] Cache HIT for entry ${entryId} — skipping agent run`)
        return NextResponse.json({
          tips:                      cached.tips,
          action_plan:               cached.action_plan,
          trace:                     cached.trace,
          total_potential_saving_kg: cached.total_potential_saving_kg,
          summary:                   cached.summary,
          iterations:                cached.iterations,
          cached:                    true,
        })
      }
    }

    // ── Agent mode: full ReAct loop ───────────────────────────────────────────
    console.log(`[EcoAgent] Cache MISS — running agent for entry ${entryId ?? 'unknown'}`)
    const result = await runEcoAgent(breakdown, formData, goalKg)

    // ── Store result in cache (upsert in case of race conditions) ─────────────
    if (entryId) {
      const { error: cacheErr } = await supabase
        .from('insights_cache')
        .upsert({
          user_id:                   user.id,
          entry_id:                  entryId,
          tips:                      result.tips,
          action_plan:               result.action_plan,
          trace:                     result.trace,
          summary:                   result.summary,
          total_potential_saving_kg: result.total_potential_saving_kg,
          iterations:                result.iterations,
        }, { onConflict: 'user_id,entry_id' })

      if (cacheErr) {
        // Non-fatal — log but don't fail the request
        console.warn('[EcoAgent] Cache write failed:', cacheErr.message)
      } else {
        console.log(`[EcoAgent] Cached result for entry ${entryId}`)
      }
    }

    return NextResponse.json({
      tips:                      result.tips,
      action_plan:               result.action_plan,
      trace:                     result.trace,
      total_potential_saving_kg: result.total_potential_saving_kg,
      summary:                   result.summary,
      iterations:                result.iterations,
      cached:                    false,
    })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[EcoAgent] Error:', msg)
    return NextResponse.json(
      { tips: [], action_plan: [], trace: [], error: 'Agent unavailable — please try again.' },
      { status: 200 }, // return 200 so the UI degrades gracefully
    )
  }
}
