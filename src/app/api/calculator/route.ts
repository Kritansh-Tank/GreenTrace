import { NextRequest, NextResponse } from 'next/server'
import { calculateCO2 } from '@/lib/calculateCO2'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const breakdown = calculateCO2(body)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && body.save) {
      await supabase.from('footprint_entries').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        travel_kg: breakdown.travel_kg,
        food_kg: breakdown.food_kg,
        energy_kg: breakdown.energy_kg,
        shopping_kg: breakdown.shopping_kg,
        commute_kg: breakdown.commute_kg,
      })
    }

    return NextResponse.json({ success: true, breakdown })
  } catch (e) {
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
