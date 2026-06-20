'use client'
import { useState } from 'react'
import { Plane, Utensils, Zap, ShoppingBag, Car, CheckCircle, Loader2, Save } from 'lucide-react'
import type { CalculatorFormData, CO2Breakdown } from '@/types'

const defaultForm: CalculatorFormData = {
  travel: { mode: 'car_petrol', distance: 0, passengers: 1, trips: 1 },
  food: { paneer_servings: 3, chicken_servings: 4, fish_servings: 2, dairy_liters: 4, eggs_per_week: 6, plant_based_percent: 20 },
  energy: { electricity_kwh: 200, gas_m3: 20, country: 'india', has_solar: false },
  shopping: { online_orders: 4, clothing_items: 2, has_phone_new: false, has_laptop_new: false },
  commute: { mode: 'car_petrol', km_per_day: 20, work_days: 22 },
}

const tabs = [
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'commute', label: 'Commute', icon: Car },
]

const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5"
const selectClass = inputClass + " bg-white"

function TravelTab({ data, onChange }: { data: CalculatorFormData['travel'], onChange: (d: CalculatorFormData['travel']) => void }) {
  const upd = (k: keyof typeof data, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Transport Mode</label>
        <select className={selectClass} value={data.mode} onChange={e => upd('mode', e.target.value)}>
          <option value="flight_short">Short-haul Flight (&lt;3h)</option>
          <option value="flight_long">Long-haul Flight (&gt;3h)</option>
          <option value="car_petrol">Car (Petrol)</option>
          <option value="car_diesel">Car (Diesel)</option>
          <option value="ev">Electric Vehicle</option>
          <option value="bus">Bus</option>
          <option value="train">Train</option>
          <option value="motorcycle">Motorcycle</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Distance (km)</label>
        <input className={inputClass} type="number" min={0} value={data.distance} onChange={e => upd('distance', +e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Number of Trips/Month</label>
        <input className={inputClass} type="number" min={1} value={data.trips} onChange={e => upd('trips', +e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Passengers (shared)</label>
        <input className={inputClass} type="number" min={1} value={data.passengers} onChange={e => upd('passengers', +e.target.value)} />
      </div>
    </div>
  )
}

function FoodTab({ data, onChange }: { data: CalculatorFormData['food'], onChange: (d: CalculatorFormData['food']) => void }) {
  const upd = (k: keyof typeof data, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><label className={labelClass}>Paneer servings/week</label><input className={inputClass} type="number" min={0} value={data.paneer_servings} onChange={e => upd('paneer_servings', +e.target.value)} /></div>
      <div><label className={labelClass}>Chicken servings/week</label><input className={inputClass} type="number" min={0} value={data.chicken_servings} onChange={e => upd('chicken_servings', +e.target.value)} /></div>
      <div><label className={labelClass}>Fish servings/week</label><input className={inputClass} type="number" min={0} value={data.fish_servings} onChange={e => upd('fish_servings', +e.target.value)} /></div>
      <div><label className={labelClass}>Dairy milk (liters/week)</label><input className={inputClass} type="number" min={0} value={data.dairy_liters} onChange={e => upd('dairy_liters', +e.target.value)} /></div>
      <div><label className={labelClass}>Eggs per week</label><input className={inputClass} type="number" min={0} value={data.eggs_per_week} onChange={e => upd('eggs_per_week', +e.target.value)} /></div>
      <div>
        <label className={labelClass}>Plant-based meals: {data.plant_based_percent}%</label>
        <input type="range" min={0} max={100} step={5} value={data.plant_based_percent} onChange={e => upd('plant_based_percent', +e.target.value)} className="w-full accent-emerald-600" />
      </div>
    </div>
  )
}

function EnergyTab({ data, onChange }: { data: CalculatorFormData['energy'], onChange: (d: CalculatorFormData['energy']) => void }) {
  const upd = (k: keyof typeof data, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><label className={labelClass}>Electricity (kWh/month)</label><input className={inputClass} type="number" min={0} value={data.electricity_kwh} onChange={e => upd('electricity_kwh', +e.target.value)} /></div>
      <div><label className={labelClass}>Natural Gas (m³/month)</label><input className={inputClass} type="number" min={0} value={data.gas_m3} onChange={e => upd('gas_m3', +e.target.value)} /></div>
      <div>
        <label className={labelClass}>Country / Grid</label>
        <select className={selectClass} value={data.country} onChange={e => upd('country', e.target.value)}>
          <option value="india">India</option>
          <option value="us">United States</option>
          <option value="eu">European Union</option>
          <option value="uk">United Kingdom</option>
        </select>
      </div>
      <div className="flex items-center gap-3 pt-6">
        <input type="checkbox" id="solar" checked={data.has_solar} onChange={e => upd('has_solar', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
        <label htmlFor="solar" className="text-sm text-slate-700">I have solar panels (-40% electricity)</label>
      </div>
    </div>
  )
}

function ShoppingTab({ data, onChange }: { data: CalculatorFormData['shopping'], onChange: (d: CalculatorFormData['shopping']) => void }) {
  const upd = (k: keyof typeof data, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><label className={labelClass}>Online orders/month</label><input className={inputClass} type="number" min={0} value={data.online_orders} onChange={e => upd('online_orders', +e.target.value)} /></div>
      <div><label className={labelClass}>New clothing items/year</label><input className={inputClass} type="number" min={0} value={data.clothing_items} onChange={e => upd('clothing_items', +e.target.value)} /></div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="phone" checked={data.has_phone_new} onChange={e => upd('has_phone_new', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
        <label htmlFor="phone" className="text-sm text-slate-700">Bought a new smartphone this year</label>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="laptop" checked={data.has_laptop_new} onChange={e => upd('has_laptop_new', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
        <label htmlFor="laptop" className="text-sm text-slate-700">Bought a new laptop this year</label>
      </div>
    </div>
  )
}

function CommuteTab({ data, onChange }: { data: CalculatorFormData['commute'], onChange: (d: CalculatorFormData['commute']) => void }) {
  const upd = (k: keyof typeof data, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Commute Mode</label>
        <select className={selectClass} value={data.mode} onChange={e => upd('mode', e.target.value)}>
          <option value="car_petrol">Car (Petrol)</option>
          <option value="car_diesel">Car (Diesel)</option>
          <option value="ev">Electric Vehicle</option>
          <option value="motorcycle">Motorcycle</option>
          <option value="bus">Bus</option>
          <option value="metro">Metro / Train</option>
          <option value="bicycle">Bicycle</option>
          <option value="walking">Walking</option>
        </select>
      </div>
      <div><label className={labelClass}>Distance each way (km/day)</label><input className={inputClass} type="number" min={0} value={data.km_per_day} onChange={e => upd('km_per_day', +e.target.value)} /></div>
      <div><label className={labelClass}>Working days/month</label><input className={inputClass} type="number" min={0} max={31} value={data.work_days} onChange={e => upd('work_days', +e.target.value)} /></div>
    </div>
  )
}

const COLORS_MAP: Record<string, string> = { travel: '#059669', food: '#f59e0b', energy: '#3b82f6', shopping: '#8b5cf6', commute: '#0d9488' }

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState('travel')
  const [form, setForm] = useState<CalculatorFormData>(defaultForm)
  const [result, setResult] = useState<CO2Breakdown | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateSection = <K extends keyof CalculatorFormData>(section: K, data: CalculatorFormData[K]) => {
    setForm(prev => ({ ...prev, [section]: data }))
  }

  const calculate = async () => {
    setCalculating(true)
    setSaved(false)
    const res = await fetch('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, save: false }),
    })
    const data = await res.json()
    setResult(data.breakdown)
    setCalculating(false)
  }

  const saveResult = async () => {
    setSaving(true)
    const res = await fetch('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, save: true }),
    })
    await res.json()
    setSaved(true)
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Carbon Calculator</h1>
        <p className="text-slate-500 text-sm mt-1">Fill each category to calculate your monthly carbon footprint</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-1 justify-center transition-all ${activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {activeTab === 'travel' && <TravelTab data={form.travel} onChange={d => updateSection('travel', d)} />}
        {activeTab === 'food' && <FoodTab data={form.food} onChange={d => updateSection('food', d)} />}
        {activeTab === 'energy' && <EnergyTab data={form.energy} onChange={d => updateSection('energy', d)} />}
        {activeTab === 'shopping' && <ShoppingTab data={form.shopping} onChange={d => updateSection('shopping', d)} />}
        {activeTab === 'commute' && <CommuteTab data={form.commute} onChange={d => updateSection('commute', d)} />}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={calculate} disabled={calculating} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {calculating ? 'Calculating...' : 'Calculate'}
        </button>
        {result && (
          <button onClick={saveResult} disabled={saving || saved} className="flex items-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 px-5 py-3 rounded-xl font-medium text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        )}
      </div>

      {/* Results */}
      {result && result.total_kg != null && !isNaN(result.total_kg) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Your Monthly Footprint</h2>
          <div className="text-4xl font-bold text-slate-900">{result.total_kg.toFixed(1)} <span className="text-lg text-slate-400 font-normal">kg CO₂e</span></div>
          <div className="space-y-2">
            {(['travel', 'food', 'energy', 'shopping', 'commute'] as const).map(cat => {
              const val = result[`${cat}_kg`]
              const pct = result.total_kg > 0 ? (val / result.total_kg * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-600">{cat}</span>
                    <span className="font-medium text-slate-800">{val.toFixed(1)} kg</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS_MAP[cat] }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className={`mt-2 px-4 py-3 rounded-xl text-sm font-medium ${result.total_kg < 100 ? 'bg-emerald-50 text-emerald-700' : result.total_kg < 300 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {result.total_kg < 100 ? '🌿 Excellent! Your footprint is well below average.' : result.total_kg < 300 ? '⚡ Moderate footprint. Small changes can make a big difference.' : '🔴 High footprint. Check your Insights for personalized reduction tips.'}
          </div>
        </div>
      )}
    </div>
  )
}
