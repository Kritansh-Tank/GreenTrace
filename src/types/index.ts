export interface UserProfile {
  id: string
  name: string
  email: string
  country: string
  created_at: string
}

export interface FootprintEntry {
  id: string
  user_id: string
  date: string
  travel_kg: number
  food_kg: number
  energy_kg: number
  shopping_kg: number
  commute_kg: number
  total_kg: number
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  target_kg: number
  start_date: string
  end_date: string
  is_active: boolean
}

export interface UserBadge {
  id: string
  user_id: string
  badge_slug: string
  unlocked_at: string
}

export interface Badge {
  slug: string
  name: string
  description: string
  icon: string
  condition: string
}

export interface CalculatorFormData {
  travel: {
    mode: string
    distance: number
    passengers: number
    trips: number
  }
  food: {
    paneer_servings: number
    chicken_servings: number
    fish_servings: number
    dairy_liters: number
    eggs_per_week: number
    plant_based_percent: number
  }
  energy: {
    electricity_kwh: number
    gas_m3: number
    country: string
    has_solar: boolean
  }
  shopping: {
    online_orders: number
    clothing_items: number
    has_phone_new: boolean
    has_laptop_new: boolean
  }
  commute: {
    mode: string
    km_per_day: number
    work_days: number
  }
}

export interface CO2Breakdown {
  travel_kg: number
  food_kg: number
  energy_kg: number
  shopping_kg: number
  commute_kg: number
  total_kg: number
}

export interface InsightTip {
  title: string
  explanation: string
  saving_kg: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
}

/** A single step in the agent-generated Action Plan. */
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

/** A single step in the agent's ReAct reasoning trace (for UI transparency). */
export interface AgentTraceStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'answer'
  content: string
  tool_name?: string
  tool_args?: Record<string, unknown>
}

export interface RouteOption {
  mode: string
  distance_km: number
  duration_min: number
  co2_kg: number
  geometry?: any
}
