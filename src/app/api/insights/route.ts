/**
 * GreenTrace Insights API — EcoAgent Endpoint
 * ---------------------------------------------
 * Replaces the old single-LLM-call with a full ReAct agent run.
 *
 * POST /api/insights
 *   Body: { breakdown, goal_kg, question?, form_data? }
 *   - Without `question`: runs the full agent loop → returns { tips, action_plan, trace }
 *   - With `question`:    runs a lightweight chat turn  → returns { reply }
 *
 * Security:
 *   - Requires authenticated Supabase session (401 if not logged in)
 *   - Input is validated before being passed to the agent
 *   - No user data is logged to external services
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runEcoAgent, runEcoAgentChat } from '@/lib/agent/ecoagent'
import type { CO2Breakdown } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // ── Auth guard — only authenticated users may invoke the agent ────────────
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
    const goalKg    = Number(body.goal_kg ?? 0)
    const question  = typeof body.question === 'string' ? body.question.trim() : null
    // form_data carries the raw calculator inputs (used by transport/food tools)
    const formData  = (body.form_data as Record<string, unknown>) ?? {}

    // ── Chat mode: lightweight single-turn response ───────────────────────────
    if (question) {
      const reply = await runEcoAgentChat(question, breakdown, goalKg)
      return NextResponse.json({ reply })
    }

    // ── Agent mode: full ReAct loop → tips + action plan + trace ─────────────
    const result = await runEcoAgent(breakdown, formData, goalKg)

    return NextResponse.json({
      tips:                      result.tips,
      action_plan:               result.action_plan,
      trace:                     result.trace,
      total_potential_saving_kg: result.total_potential_saving_kg,
      summary:                   result.summary,
      iterations:                result.iterations,
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
