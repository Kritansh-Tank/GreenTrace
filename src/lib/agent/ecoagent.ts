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

const SYSTEM_PROMPT = `You are EcoAgent, a carbon footprint reduction AI agent using ReAct (Reasoning + Acting).

Tool order:
1. analyze_footprint  — ALWAYS call first.
2. get_transport_alternatives — if commute/travel is top priority.
3. get_food_alternatives — if food is top priority.
4. get_energy_tips — if energy is top priority.
5. calculate_action_plan — ALWAYS call last.

Rules: Call analyze_footprint first. Call calculate_action_plan last. Call at most 2 domain tools between them. Never invent numbers.

After calculate_action_plan, respond with ONLY this JSON (no markdown):
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

  const MAX_ITERATIONS = 4  // Reduced to save tokens on free-tier TPM limits
  const trace: AgentTraceStep[] = []
  let actionPlanData: ReturnType<typeof import('@/lib/agent/tools').dispatchTool> | null = null

  // Build Groq tool schemas
  const tools = buildGroqTools()

  // Initial user message — provides all the raw context the agent needs
  const userMessage = `Please analyse my carbon footprint and create an Action Plan.

My monthly CO₂ breakdown:
- Travel:   ${breakdown.travel_kg ?? 0} kg
- Food:     ${breakdown.food_kg ?? 0} kg
- Energy:   ${breakdown.energy_kg ?? 0} kg
- Shopping: ${breakdown.shopping_kg ?? 0} kg
- Commute:  ${breakdown.commute_kg ?? 0} kg
- TOTAL:    ${breakdown.total_kg} kg/month
${goalKg > 0 ? `\nMy monthly reduction goal: ${goalKg} kg` : ''}

Additional context (use for tool arguments):
${JSON.stringify(formData, null, 2)}`

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

    // THINK: Call LLM — allow it to either use a tool or give a final answer
    const response = await groq.chat.completions.create({
      model: AGENT_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 1024,  // Capped to stay within 30k TPM free-tier budget
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
