/**
 * GreenTrace Agent Tools
 * ----------------------
 * Defines the set of tools available to the EcoAgent's ReAct reasoning loop.
 * Each tool has:
 *   - name:        unique identifier the LLM uses to invoke it
 *   - description: natural-language explanation so the LLM knows when to use it
 *   - parameters:  JSON Schema describing required inputs
 *   - execute:     the actual implementation (pure TypeScript, no external I/O)
 *
 * Design note: Tools are intentionally pure (deterministic given the same input)
 * so the agent loop is testable and auditable without network calls.
 */

import { EMISSION_FACTORS, REFERENCE_VALUES } from '@/lib/emissionFactors'
import type { CO2Breakdown } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>  // JSON Schema object
  execute: (args: Record<string, unknown>) => unknown
}

export interface TransportAlternative {
  mode: string
  factor_kg_per_km: number
  monthly_saving_kg: number
  recommendation: string
}

export interface FoodAlternative {
  swap: string
  monthly_saving_kg: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

export interface ActionStep {
  step: number
  title: string
  category: string
  saving_kg: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  detail: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: analyze_footprint
// Identifies which categories are above-average and ranks them by impact.
// ─────────────────────────────────────────────────────────────────────────────

const analyzeFootprint: AgentTool = {
  name: 'analyze_footprint',
  description:
    'Analyses a user\'s monthly CO₂ breakdown to identify which categories are highest, ' +
    'compares them to global and Indian averages, and returns a ranked priority list. ' +
    'Call this first before any other tool.',
  parameters: {
    type: 'object',
    properties: {
      travel_kg:   { type: 'number', description: 'Monthly travel CO₂ in kg' },
      food_kg:     { type: 'number', description: 'Monthly food CO₂ in kg' },
      energy_kg:   { type: 'number', description: 'Monthly home energy CO₂ in kg' },
      shopping_kg: { type: 'number', description: 'Monthly shopping CO₂ in kg' },
      commute_kg:  { type: 'number', description: 'Monthly commute CO₂ in kg' },
      total_kg:    { type: 'number', description: 'Monthly total CO₂ in kg' },
    },
    required: ['total_kg'],
  },
  execute(args) {
    const breakdown = args as Partial<CO2Breakdown> & { total_kg: number }
    const categories = [
      { name: 'travel',   value: breakdown.travel_kg   ?? 0, benchmark: 40  },
      { name: 'food',     value: breakdown.food_kg     ?? 0, benchmark: 55  },
      { name: 'energy',   value: breakdown.energy_kg   ?? 0, benchmark: 130 },
      { name: 'shopping', value: breakdown.shopping_kg ?? 0, benchmark: 20  },
      { name: 'commute',  value: breakdown.commute_kg  ?? 0, benchmark: 35  },
    ]

    const ranked = [...categories]
      .sort((a, b) => b.value - a.value)
      .map((c, i) => ({
        rank: i + 1,
        category: c.name,
        monthly_kg: c.value,
        above_benchmark_by_kg: Math.max(0, c.value - c.benchmark),
        // As a percentage of the user's total footprint
        pct_of_total: breakdown.total_kg > 0
          ? Math.round((c.value / breakdown.total_kg) * 100)
          : 0,
      }))

    const annualTonnes = (breakdown.total_kg * 12) / 1000
    const vsWorldAvg   = ((annualTonnes - REFERENCE_VALUES.world_average) / REFERENCE_VALUES.world_average * 100).toFixed(0)
    const vsParis      = ((annualTonnes - REFERENCE_VALUES.paris_target)  / REFERENCE_VALUES.paris_target  * 100).toFixed(0)

    return {
      ranked_categories: ranked,
      annual_tonnes: annualTonnes.toFixed(2),
      vs_world_average_pct: vsWorldAvg,
      vs_paris_target_pct:  vsParis,
      top_priority: ranked[0]?.category ?? 'energy',
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_transport_alternatives
// Given a user's current commute mode and distance, returns CO₂ savings
// for switching to greener modes.
// ─────────────────────────────────────────────────────────────────────────────

const getTransportAlternatives: AgentTool = {
  name: 'get_transport_alternatives',
  description:
    'Given a commute mode (e.g. "car_petrol") and daily km, returns a list of ' +
    'alternative transport options with their monthly CO₂ savings. ' +
    'Call this when commute or travel is a high-priority category.',
  parameters: {
    type: 'object',
    properties: {
      current_mode: {
        type: 'string',
        description: 'Current transport mode: car_petrol | car_diesel | ev | motorcycle | bus | metro | train | bicycle | walking',
      },
      km_per_day:  { type: 'number', description: 'One-way km per day' },
      work_days:   { type: 'number', description: 'Working days per month (default 22)' },
    },
    required: ['current_mode', 'km_per_day'],
  },
  execute(args) {
    const mode    = (args.current_mode as string) ?? 'car_petrol'
    const km      = (args.km_per_day   as number) ?? 20
    const days    = (args.work_days    as number) ?? 22
    const monthly = km * 2 * days  // round-trip monthly km

    const currentFactor =
      EMISSION_FACTORS.commute[mode as keyof typeof EMISSION_FACTORS.commute] ?? 0.192
    const currentMonthly = currentFactor * monthly

    // All alternatives cheaper than the current mode
    const alternatives: TransportAlternative[] = []

    const modes: Array<{ id: keyof typeof EMISSION_FACTORS.commute; label: string }> = [
      { id: 'ev',        label: 'Electric Vehicle' },
      { id: 'bus',       label: 'Bus' },
      { id: 'metro',     label: 'Metro / Train' },
      { id: 'bicycle',   label: 'Bicycle (zero emission)' },
      { id: 'walking',   label: 'Walking (zero emission)' },
      { id: 'car_petrol',label: 'Car (Petrol)' },
      { id: 'motorcycle',label: 'Motorcycle' },
    ]

    for (const m of modes) {
      if (m.id === mode) continue
      const factor  = EMISSION_FACTORS.commute[m.id] ?? 0
      const monthly_cost = factor * monthly
      const saving = currentMonthly - monthly_cost
      if (saving > 0) {
        alternatives.push({
          mode: m.label,
          factor_kg_per_km: factor,
          monthly_saving_kg: Math.round(saving * 100) / 100,
          recommendation:
            saving > 40
              ? `High impact — saves ${saving.toFixed(1)} kg/month`
              : `Moderate impact — saves ${saving.toFixed(1)} kg/month`,
        })
      }
    }

    return {
      current_mode: mode,
      current_monthly_kg: Math.round(currentMonthly * 100) / 100,
      alternatives: alternatives.sort((a, b) => b.monthly_saving_kg - a.monthly_saving_kg),
      best_alternative: alternatives[0] ?? null,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_food_alternatives
// Returns high-impact dietary swaps based on the user's food consumption.
// ─────────────────────────────────────────────────────────────────────────────

const getFoodAlternatives: AgentTool = {
  name: 'get_food_alternatives',
  description:
    'Given a user\'s food data (servings per week), returns practical dietary ' +
    'swaps ordered by monthly CO₂ saving. Call this when food is a high-priority category.',
  parameters: {
    type: 'object',
    properties: {
      chicken_servings:    { type: 'number', description: 'Chicken servings per week' },
      paneer_servings:     { type: 'number', description: 'Paneer servings per week' },
      dairy_liters:        { type: 'number', description: 'Dairy milk liters per week' },
      eggs_per_week:       { type: 'number', description: 'Eggs consumed per week' },
      plant_based_percent: { type: 'number', description: 'Current plant-based meal percentage 0-100' },
    },
    required: [],
  },
  execute(args) {
    const chicken    = (args.chicken_servings    as number) ?? 0
    const paneer     = (args.paneer_servings     as number) ?? 0
    const dairy      = (args.dairy_liters        as number) ?? 0
    const eggs       = (args.eggs_per_week       as number) ?? 0
    const plantPct   = (args.plant_based_percent as number) ?? 0

    const swaps: FoodAlternative[] = []

    // Chicken → plant protein (saves ~60% of chicken emissions)
    if (chicken > 0) {
      const saving = chicken * 0.2 * EMISSION_FACTORS.food.chicken * 4.33 * 0.6
      swaps.push({
        swap: `Replace ${Math.ceil(chicken / 2)} chicken servings/week with legumes (lentils, chickpeas)`,
        monthly_saving_kg: Math.round(saving * 100) / 100,
        difficulty: 'Medium',
      })
    }

    // Paneer → tofu (saves ~70%)
    if (paneer > 0) {
      const saving = paneer * 0.2 * 8.5 * 4.33 * 0.7
      swaps.push({
        swap: `Swap ${Math.ceil(paneer / 2)} paneer servings/week with tofu`,
        monthly_saving_kg: Math.round(saving * 100) / 100,
        difficulty: 'Easy',
      })
    }

    // Dairy → plant milk (saves ~65%)
    if (dairy > 1) {
      const saving = dairy * EMISSION_FACTORS.food.dairy_milk * 4.33 * 0.65
      swaps.push({
        swap: 'Switch half of dairy milk to oat/soy milk',
        monthly_saving_kg: Math.round(saving * 100) / 100,
        difficulty: 'Easy',
      })
    }

    // Increase plant-based meals
    if (plantPct < 50) {
      const potential = (50 - plantPct) / 100 * 30  // rough estimate
      swaps.push({
        swap: `Increase plant-based meals from ${plantPct}% to 50% of diet`,
        monthly_saving_kg: Math.round(potential * 100) / 100,
        difficulty: 'Medium',
      })
    }

    // Eggs are relatively low-impact — only flag if very high
    if (eggs > 14) {
      const saving = (eggs - 7) * 0.06 * EMISSION_FACTORS.food.eggs * 4.33
      swaps.push({
        swap: 'Reduce egg consumption by half',
        monthly_saving_kg: Math.round(saving * 100) / 100,
        difficulty: 'Easy',
      })
    }

    return {
      swaps: swaps.sort((a, b) => b.monthly_saving_kg - a.monthly_saving_kg),
      total_potential_saving_kg: swaps.reduce((s, sw) => s + sw.monthly_saving_kg, 0),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_energy_tips
// Returns actionable home energy reduction tips based on usage data.
// ─────────────────────────────────────────────────────────────────────────────

const getEnergyTips: AgentTool = {
  name: 'get_energy_tips',
  description:
    'Given a user\'s home energy usage (electricity kWh, gas m³, solar status), ' +
    'returns prioritised tips to reduce their energy CO₂. ' +
    'Call this when energy is a high-priority category.',
  parameters: {
    type: 'object',
    properties: {
      electricity_kwh: { type: 'number', description: 'Monthly electricity in kWh' },
      gas_m3:          { type: 'number', description: 'Monthly gas in m³' },
      country:         { type: 'string', description: 'Country code for grid factor' },
      has_solar:       { type: 'boolean', description: 'Whether user has solar panels' },
    },
    required: ['electricity_kwh'],
  },
  execute(args) {
    const kwh    = (args.electricity_kwh as number)  ?? 200
    const gas    = (args.gas_m3         as number)   ?? 0
    const solar  = (args.has_solar      as boolean)  ?? false
    const country= (args.country        as string)   ?? 'india'

    const gridFactor =
      (EMISSION_FACTORS.energy[`electricity_${country}` as keyof typeof EMISSION_FACTORS.energy] as number)
      ?? EMISSION_FACTORS.energy.electricity_india

    const tips: { tip: string; monthly_saving_kg: number; difficulty: 'Easy' | 'Medium' | 'Hard' }[] = []

    if (!solar && kwh > 100) {
      const saving = kwh * (gridFactor as number) * 0.4
      tips.push({
        tip: 'Install solar panels (or join a community solar scheme) — reduces electricity CO₂ by ~40%',
        monthly_saving_kg: Math.round(saving * 100) / 100,
        difficulty: 'Hard',
      })
    }

    if (kwh > 150) {
      tips.push({
        tip: 'Switch to LED lighting and unplug idle devices — saves ~10% electricity',
        monthly_saving_kg: Math.round(kwh * (gridFactor as number) * 0.10 * 100) / 100,
        difficulty: 'Easy',
      })
      tips.push({
        tip: 'Set AC/heater thermostat 2°C closer to ambient — saves ~8% of HVAC energy',
        monthly_saving_kg: Math.round(kwh * (gridFactor as number) * 0.08 * 100) / 100,
        difficulty: 'Easy',
      })
    }

    if (gas > 10) {
      const gasSaving = gas * 0.5 * EMISSION_FACTORS.energy.natural_gas
      tips.push({
        tip: 'Reduce hot water temperature and insulate pipes — saves ~50% of gas usage',
        monthly_saving_kg: Math.round(gasSaving * 100) / 100,
        difficulty: 'Medium',
      })
    }

    return {
      current_electricity_kg: Math.round(kwh * (gridFactor as number) * 100) / 100,
      current_gas_kg: Math.round(gas * EMISSION_FACTORS.energy.natural_gas * 100) / 100,
      tips: tips.sort((a, b) => b.monthly_saving_kg - a.monthly_saving_kg),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: calculate_action_plan
// Synthesises tool outputs into a structured, step-by-step Action Plan.
// This is always the LAST tool called by the agent.
// ─────────────────────────────────────────────────────────────────────────────

const calculateActionPlan: AgentTool = {
  name: 'calculate_action_plan',
  description:
    'Synthesises the outputs from other tools into a structured Action Plan. ' +
    'Takes a list of candidate actions with their savings and returns a prioritised, ' +
    'week-by-week plan. Always call this as the FINAL tool to produce the agent output.',
  parameters: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        description: 'Array of candidate actions gathered from other tool outputs',
        items: {
          type: 'object',
          properties: {
            title:      { type: 'string' },
            category:   { type: 'string' },
            saving_kg:  { type: 'number' },
            difficulty: { type: 'string' },
            detail:     { type: 'string' },
          },
        },
      },
      goal_kg: { type: 'number', description: 'User\'s monthly CO₂ reduction goal in kg' },
    },
    required: ['actions'],
  },
  execute(args) {
    const actions = (args.actions as ActionStep[]) ?? []
    const goal    = (args.goal_kg as number) ?? 0

    // Sort: largest saving first, then easiest
    const difficultyOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 }
    const sorted = [...actions].sort((a, b) => {
      if (b.saving_kg !== a.saving_kg) return b.saving_kg - a.saving_kg
      return (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1)
    })

    // Assign week numbers (spread across 4 weeks)
    const plan: (ActionStep & { week: number; cumulative_saving_kg: number })[] = []
    let cumulative = 0
    sorted.slice(0, 6).forEach((action, i) => {
      cumulative += action.saving_kg
      plan.push({
        ...action,
        step: i + 1,
        week: Math.min(Math.floor(i / 2) + 1, 4),
        cumulative_saving_kg: Math.round(cumulative * 100) / 100,
      })
    })

    const totalSaving = plan.reduce((s, a) => s + a.saving_kg, 0)

    return {
      action_plan: plan,
      total_potential_saving_kg: Math.round(totalSaving * 100) / 100,
      goal_achievable: goal > 0 ? totalSaving >= goal : null,
      goal_kg: goal,
      summary: `${plan.length}-step plan across 4 weeks, saving up to ${totalSaving.toFixed(1)} kg CO₂/month`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry — all tools available to the EcoAgent
// ─────────────────────────────────────────────────────────────────────────────

export const AGENT_TOOLS: AgentTool[] = [
  analyzeFootprint,
  getTransportAlternatives,
  getFoodAlternatives,
  getEnergyTips,
  calculateActionPlan,
]

/** Build the Groq-compatible tool_choice schema array from our tool definitions. */
export function buildGroqTools() {
  return AGENT_TOOLS.map(t => ({
    type: 'function' as const,
    function: {
      name:        t.name,
      description: t.description,
      parameters:  t.parameters,
    },
  }))
}

/** Dispatch a tool call by name, executing it and returning the result. */
export function dispatchTool(name: string, args: Record<string, unknown>): unknown {
  const tool = AGENT_TOOLS.find(t => t.name === name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  return tool.execute(args)
}
