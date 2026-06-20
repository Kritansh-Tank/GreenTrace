import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { breakdown, goal_kg } = await req.json()

    const prompt = `The user's monthly carbon footprint breakdown (in kg CO₂e):
- Travel: ${breakdown.travel_kg ?? 0} kg
- Food & Diet: ${breakdown.food_kg ?? 0} kg
- Home Energy: ${breakdown.energy_kg ?? 0} kg
- Shopping: ${breakdown.shopping_kg ?? 0} kg
- Daily Commute: ${breakdown.commute_kg ?? 0} kg
- TOTAL: ${breakdown.total_kg ?? 0} kg/month
${goal_kg ? `- Monthly reduction target: ${goal_kg} kg` : ''}

Generate exactly 5 personalized, actionable tips to reduce their carbon footprint.
Sort by CO₂ impact (highest saving first).
For each tip return JSON with: title, explanation (1 sentence), saving_kg (estimated monthly saving as a number), difficulty ("Easy"|"Medium"|"Hard"), category ("travel"|"food"|"energy"|"shopping"|"commute").
Respond ONLY with a JSON array of 5 objects, no extra text.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are EcoCoach, a carbon footprint reduction expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const raw = completion.choices[0].message.content ?? '[]'
    let tips
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      tips = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      tips = []
    }

    return NextResponse.json({ tips })
  } catch (e: any) {
    console.error('Insights API error:', e?.message ?? e)
    return NextResponse.json({ tips: [], error: 'AI service unavailable' }, { status: 200 })
  }
}
