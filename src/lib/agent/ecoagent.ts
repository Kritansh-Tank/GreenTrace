/**
 * GreenTrace EcoAgent — ReAct Reasoning Loop
 * -------------------------------------------
 * Implements the ReAct (Reasoning + Acting) agent pattern:
 *
 *   Loop:
 *     1. THINK  — LLM reasons about the current observation
 *     2. ACT    — LLM selects a tool and provides arguments
 *     3. OBSERVE — Tool executes; result is appended to context
 *     4. Repeat until the LLM returns a final answer or max iterations reached
 *
 * This produces an auditable trace of every reasoning step and tool call,
 * which the UI surfaces to the user as "How the agent reasoned."
 *
 * Architecture:
 *   - EcoAgent is stateless per-request (no global mutable state)
 *   - Tool execution is synchronous (no async I/O in tools — see tools.ts)
 *   - The LLM (Groq Qwen3 32B) is the only async dependency
 *   - Max 5 iterations prevents runaway loops / infinite token spend
 */

import { groq, AGENT_MODEL } from '@/lib/groq'
import { buildGroqTools, dispatchTool } from '@/lib/agent/tools'
import type { CO2Breakdown } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Retry helper
// Groq free tier: 6,000 TPM. The agent may hit 429 mid-loop.
// This wrapper parses the "try again in Xs" hint from the error message
// and waits that long before retrying — up to 2 retries per call.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function groqWithRetry(params: Parameters<typeof groq.chat.completions.create>[0]): Promise<any> {
  const MAX_RETRIES = 2
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await groq.chat.completions.create(params)
    } catch (e: unknown) {
      lastError = e
      const msg = e instanceof Error ? e.message : String(e)
      // Only retry on rate-limit errors
      if (!msg.includes('429') && !msg.includes('rate_limit_exceeded')) throw e

      // Parse "Please try again in 18.93s" from Groq's error message
      const match = msg.match(/try again in ([\d.]+)s/i)
      const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 20000

      console.log(`[EcoAgent] Rate limited. Waiting ${waitMs}ms then retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
  throw lastError
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentTraceStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'answer'
  content: string
  tool_name?: string
  tool_args?: Record<string, unknown>
}

export interface AgentTip {
  title: string
  explanation: string
  saving_kg: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
}

export interface ActionPlanStep {
  step: number
  week: number
  title: string
  category: string
  saving_kg: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  detail: string
  cumulative_saving_kg: number
  completed?: boolean
}

export interface AgentResult {
  tips: AgentTip[]
  action_plan: ActionPlanStep[]
  trace: AgentTraceStep[]
  total_potential_saving_kg: number
  summary: string
  iterations: number
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt
// Instructs the LLM to behave as an agent, use tools, and produce
// a structured Action Plan rather than free-form text.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are EcoAgent, a carbon footprint reduction AI agent.

You MUST follow this exact tool sequence every time — no exceptions:
1. analyze_footprint      — call FIRST with the user's CO₂ numbers.
2. get_transport_alternatives — call ALWAYS with current_mode and km_per_day.
3. get_food_alternatives      — call ALWAYS (pass 0 for any unknown fields).
4. get_energy_tips            — call ALWAYS with electricity_kwh.
5. calculate_action_plan      — call LAST. Pass ALL actions from steps 2-4 combined.

Rules:
- You MUST call tools 1 through 5 in order. Never skip steps 2, 3, or 4.
- Only use numbers from tool results — never invent data.
- After step 5, respond with ONLY this JSON (no markdown fences):
{
  "tips": [{"title":"...","explanation":"...","saving_kg":0,"difficulty":"Easy|Medium|Hard","category":"..."}],
  "action_plan_summary": "..."
}
Limit tips to top 5 by saving_kg.`

// ─────────────────────────────────────────────────────────────────────────────
// runEcoAgent
// Main entry point — runs the full ReAct loop for a given user context.
// ─────────────────────────────────────────────────────────────────────────────

export async function runEcoAgent(
  breakdown: Partial<CO2Breakdown> & { total_kg: number },
  formData: Record<string, unknown>,
  goalKg: number,
): Promise<AgentResult> {

  const MAX_ITERATIONS = 6  // analyze + transport + food + energy + calculate + final answer
  const trace: AgentTraceStep[] = []
  let actionPlanData: ReturnType<typeof import('@/lib/agent/tools').dispatchTool> | null = null

  // Build Groq tool schemas
  const tools = buildGroqTools()

  // Compact user message with key fields the domain tools need as arguments
  const commuteMode   = (formData?.commute_mode   as string) ?? 'car_petrol'
  const kmPerDay      = (formData?.km_per_day      as number) ?? 20
  const electricityKwh= (formData?.electricity_kwh as number) ?? 200

  const userMessage = `Analyse my carbon footprint and create an Action Plan.
Monthly CO₂: Travel ${breakdown.travel_kg ?? 0}kg, Food ${breakdown.food_kg ?? 0}kg, Energy ${breakdown.energy_kg ?? 0}kg, Shopping ${breakdown.shopping_kg ?? 0}kg, Commute ${breakdown.commute_kg ?? 0}kg. Total: ${breakdown.total_kg}kg/month.${goalKg > 0 ? ` Goal: ${goalKg}kg reduction.` : ''}
Commute: mode=${commuteMode}, km_per_day=${kmPerDay}. Energy: electricity_kwh=${electricityKwh}.`

  // Conversation history — grows with each iteration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]

  let iterations = 0
  let finalAnswer = ''

  // ── ReAct Loop ──────────────────────────────────────────────────────────────
  while (iterations < MAX_ITERATIONS) {
    iterations++

    // THINK: Call LLM with automatic retry on 429
    const response = await groqWithRetry({
      model: AGENT_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 800,  // Lower = fewer tokens per call = stays under 6k TPM
    })

    const choice = response.choices[0]
    const message = choice.message

    // Append the assistant turn to history
    messages.push(message)

    // ── ACT: Tool call requested ─────────────────────────────────────────────
    if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length) {
      for (const call of message.tool_calls) {
        const toolName = call.function.name
        let toolArgs: Record<string, unknown> = {}
        try {
          toolArgs = JSON.parse(call.function.arguments || '{}')
        } catch {
          toolArgs = {}
        }

        // Record the tool call in the trace
        trace.push({
          type: 'tool_call',
          content: `Calling tool: ${toolName}`,
          tool_name: toolName,
          tool_args: toolArgs,
        })

        // OBSERVE: Execute the tool
        let toolResult: unknown
        try {
          toolResult = dispatchTool(toolName, toolArgs)
          // Save action plan data so we can return it directly
          if (toolName === 'calculate_action_plan') {
            actionPlanData = toolResult as typeof actionPlanData
          }
        } catch (e: unknown) {
          toolResult = { error: e instanceof Error ? e.message : 'Tool execution failed' }
        }

        const resultStr = JSON.stringify(toolResult)

        // Record the observation in the trace
        trace.push({
          type: 'tool_result',
          content: resultStr,
          tool_name: toolName,
        })

        // Feed the result back to the LLM
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: resultStr,
        })
      }

      // Continue the loop — LLM will process results and either call another tool or answer
      continue
    }

    // ── ANSWER: LLM produced a final text response ───────────────────────────
    finalAnswer = message.content ?? ''
    trace.push({ type: 'answer', content: finalAnswer })
    break
  }

  // ── Parse final JSON answer ──────────────────────────────────────────────────
  let tips: AgentTip[] = []
  let summaryText = ''

  try {
    const jsonMatch = finalAnswer.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      tips = parsed.tips ?? []
      summaryText = parsed.action_plan_summary ?? ''
    }
  } catch {
    // Fallback: extract any tip-like data from the action plan
    tips = []
  }

  // ── Extract Action Plan from tool results ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ap = actionPlanData as any
  const actionPlan: ActionPlanStep[] = ap?.action_plan ?? []
  const totalSaving: number = ap?.total_potential_saving_kg ?? 0
  const agentSummary: string = ap?.summary ?? summaryText

  // If no tips were parsed from the LLM's final answer, synthesise from the action plan
  if (tips.length === 0 && actionPlan.length > 0) {
    tips = actionPlan.slice(0, 5).map(step => ({
      title: step.title,
      explanation: step.detail,
      saving_kg: step.saving_kg,
      difficulty: step.difficulty,
      category: step.category,
    }))
  }

  return {
    tips,
    action_plan: actionPlan,
    trace,
    total_potential_saving_kg: totalSaving,
    summary: agentSummary,
    iterations,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// runEcoAgentChat
// Lighter-weight single-turn chat — uses the conversation history from the
// main agent run but only makes ONE LLM call (no tool loop).
// Used for follow-up questions in the EcoAgent chat panel.
// ─────────────────────────────────────────────────────────────────────────────

export async function runEcoAgentChat(
  question: string,
  breakdown: Partial<CO2Breakdown> & { total_kg: number },
  goalKg: number,
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: AGENT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are EcoAgent, a friendly carbon footprint reduction expert. ' +
          'Answer concisely and cite specific numbers from the user\'s footprint data where relevant. ' +
          'Keep responses under 100 words.',
      },
      {
        role: 'user',
        content:
          `My monthly footprint: Travel ${breakdown.travel_kg ?? 0} kg, ` +
          `Food ${breakdown.food_kg ?? 0} kg, Energy ${breakdown.energy_kg ?? 0} kg, ` +
          `Shopping ${breakdown.shopping_kg ?? 0} kg, Commute ${breakdown.commute_kg ?? 0} kg, ` +
          `Total ${breakdown.total_kg} kg. Goal: ${goalKg} kg/month.\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 150,  // Short answers keep TPM usage low
  })

  return response.choices[0].message.content ?? 'I could not generate a response — please try again.'
}
