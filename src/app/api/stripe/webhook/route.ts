import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const { user_id, project_id, kg_offset } = session.metadata ?? {}

    if (user_id && project_id && kg_offset) {
      try {
        const supabase = await createClient()
        await supabase.from('carbon_offsets').insert({
          user_id,
          project_id,
          amount_usd: session.amount_total / 100,
          kg_offset: parseFloat(kg_offset),
          stripe_session_id: session.id,
          paid_at: new Date().toISOString(),
        })
      } catch (e) {
        console.error('Failed to record offset in DB:', e)
      }
    }
  }

  return NextResponse.json({ received: true })
}
