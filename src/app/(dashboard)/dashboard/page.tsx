'use client'
import { useEffect, useState } from 'react'
import { TrendingDown, Globe, Leaf, BarChart3, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import type { FootprintEntry } from '@/types'
import { REFERENCE_VALUES } from '@/lib/emissionFactors'
import { format, parseISO } from 'date-fns'

const COLORS = ['#059669', '#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6']
const CATEGORIES = ['Travel', 'Food', 'Energy', 'Shopping', 'Commute']

export default function DashboardPage() {
  const [entries, setEntries] = useState<FootprintEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => {
      setEntries(d.entries ?? [])
      setLoading(false)
    })
  }, [])

  const latestEntry = entries[entries.length - 1]
  const totalKgThisMonth = latestEntry?.total_kg ?? 0
  const annualKg = totalKgThisMonth * 12
  const annualTonnes = annualKg / 1000

  const chartData = entries.slice(-6).map(e => ({
    month: format(parseISO(e.date), 'MMM'),
    total: e.total_kg,
    travel: e.travel_kg,
    food: e.food_kg,
    energy: e.energy_kg,
  }))

  const pieData = latestEntry ? [
    { name: 'Travel', value: latestEntry.travel_kg },
    { name: 'Food', value: latestEntry.food_kg },
    { name: 'Energy', value: latestEntry.energy_kg },
    { name: 'Shopping', value: latestEntry.shopping_kg },
    { name: 'Commute', value: latestEntry.commute_kg },
  ].filter(d => d.value > 0) : []

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  )

  if (entries.length === 0) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">No data yet</h2>
      <p className="text-slate-500 mb-6">Calculate your first footprint to see your dashboard.</p>
      <Link href="/calculator" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 hover:bg-emerald-700">
        Calculate Now <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )

  const comparison = (val: number, ref: number) => {
    const pct = ((val - ref) / ref * 100).toFixed(0)
    return Number(pct) > 0 ? `${pct}% above` : `${Math.abs(Number(pct))}% below`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your personal carbon footprint overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This Month', value: `${totalKgThisMonth.toFixed(1)} kg`, sub: 'CO₂e total', icon: Leaf, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Annual Est.', value: `${annualTonnes.toFixed(1)}t`, sub: 'CO₂e/year', icon: TrendingDown, color: 'text-teal-600 bg-teal-50' },
          { label: 'vs World Avg', value: comparison(annualTonnes, REFERENCE_VALUES.world_average), sub: `${REFERENCE_VALUES.world_average}t avg`, icon: Globe, color: 'text-blue-600 bg-blue-50' },
          { label: 'vs Paris Target', value: comparison(annualTonnes, REFERENCE_VALUES.paris_target), sub: `${REFERENCE_VALUES.paris_target}t target`, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label} · {s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-emerald-500" /> Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} unit=" kg" />
              <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)} kg`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-500" /> Breakdown</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)} kg`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-10">No data</p>}
        </div>
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Recent Logs</h2>
          <Link href="/calculator" className="text-emerald-600 text-sm font-medium hover:text-emerald-700">+ Add Entry</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {entries.slice(-5).reverse().map(e => (
            <div key={e.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
              <span className="text-sm text-slate-600">{format(parseISO(e.date), 'MMM d, yyyy')}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.total_kg < 100 ? 'bg-emerald-50 text-emerald-700' : e.total_kg < 300 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {e.total_kg < 100 ? 'Low' : e.total_kg < 300 ? 'Medium' : 'High'}
                </span>
                <span className="font-semibold text-slate-800">{e.total_kg.toFixed(1)} kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
