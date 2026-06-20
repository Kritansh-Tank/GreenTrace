import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

const OFFSET_PROJECTS = [
  { id: 'reforestation', name: 'Amazon Reforestation', kg_per_dollar: 5 },
  { id: 'solar', name: 'Solar Energy India', kg_per_dollar: 7 },
  { id: 'cookstove', name: 'Clean Cookstoves Africa', kg_per_dollar: 10 },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount_usd, project_id } = await req.json()
  const project = OFFSET_PROJECTS.find(p => p.id === project_id) ?? OFFSET_PROJECTS[0]
  const kg_offset = amount_usd * project.kg_per_dollar
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Carbon Offset — ${project.name}`,
          description: `Offsets ~${kg_offset} kg CO₂e via verified ${project.name} project`,
        },
        unit_amount: Math.round(amount_usd * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${origin}/offset/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/offset`,
    metadata: { user_id: user.id, kg_offset: kg_offset.toString(), project_id },
  })

  return NextResponse.json({ url: session.url })
}
