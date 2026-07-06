'use client'
import { useState } from 'react'
import { Heart, Leaf, Sun, Flame, Loader2, CheckCircle } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PROJECTS = [
  { id: 'reforestation', name: 'Amazon Reforestation', description: 'Plant trees in the Amazon to absorb CO₂ and restore biodiversity.', icon: Leaf, kg_per_dollar: 5, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'solar', name: 'Solar Energy India', description: 'Fund solar panel installations in rural Indian communities.', icon: Sun, kg_per_dollar: 7, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'cookstove', name: 'Clean Cookstoves Africa', description: 'Replace wood-burning stoves to reduce emissions and improve health.', icon: Flame, kg_per_dollar: 10, color: 'text-orange-600 bg-orange-50 border-orange-200' },
]

const PRESETS = [5, 10, 25, 50]

export default function OffsetPage() {
  const [selectedProject, setSelectedProject] = useState('reforestation')
  const [amount, setAmount] = useState(10)
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const finalAmount = customAmount ? Number(customAmount) : amount
  const project = PROJECTS.find(p => p.id === selectedProject)!
  const kgOffset = finalAmount * project.kg_per_dollar

  const handleCheckout = async () => {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_usd: finalAmount, project_id: selectedProject }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Carbon Offset</h1>
        <p className="text-slate-500 text-sm mt-1">Donate to verified projects and offset your unavoidable emissions</p>
      </div>

      {/* Project selection */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800">Choose a Project</h2>
        {PROJECTS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p.id)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${selectedProject === p.id ? `border-emerald-400 bg-emerald-50` : 'border-slate-100 bg-white hover:border-slate-200'}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                <p.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{p.name}</span>
                  {selectedProject === p.id && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{p.description}</p>
                <span className="text-xs text-emerald-600 font-medium mt-1 block">{p.kg_per_dollar} kg CO₂ offset per $1</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Amount selection */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Donation Amount (USD)</h2>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(v => (
            <button key={v} onClick={() => { setAmount(v); setCustomAmount('') }} className={`py-2.5 rounded-xl text-sm font-semibold border ${amount === v && !customAmount ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              ${v}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input type="number" min={1} value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Enter amount" className="w-full pl-7 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        {/* Impact preview */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <Heart className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
            Your <strong>${finalAmount}</strong> donation offsets approximately <strong>{kgOffset} kg CO₂</strong> via {project.name}.
          </p>
        </div>

        <button
          id="stripe-checkout-btn"
          onClick={handleCheckout}
          disabled={loading || finalAmount < 1}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
          {loading ? 'Redirecting to Stripe...' : `Donate $${finalAmount} with Stripe`}
        </button>
        <p className="text-xs text-slate-400 text-center">Secured by Stripe. You&apos;ll be redirected to complete payment.</p>
      </div>
    </div>
  )
}
