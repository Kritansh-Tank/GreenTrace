'use client'
import { useState, useEffect } from 'react'
import { Target, Flame, Trophy, Sprout, BarChart3, Bike, Sun, Leaf, Globe, ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'
import type { FootprintEntry, ActionPlanStep } from '@/types'

const BADGES = [
  { slug: 'first_step',      name: 'First Step',       description: 'Logged your first footprint',         icon: Sprout,   color: 'text-emerald-600 bg-emerald-50' },
  { slug: 'data_driven',     name: 'Data Driven',      description: '5 entries logged',                    icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
  { slug: 'green_commuter',  name: 'Green Commuter',   description: 'Commute CO₂ under 30 kg/month',       icon: Bike,     color: 'text-teal-600 bg-teal-50' },
  { slug: 'energy_saver',    name: 'Energy Saver',     description: 'Energy CO₂ under 50 kg/month',        icon: Sun,      color: 'text-amber-600 bg-amber-50' },
  { slug: 'plant_powered',   name: 'Plant Powered',    description: 'Food CO₂ under 50 kg/month',          icon: Leaf,     color: 'text-green-600 bg-green-50' },
  { slug: 'goal_getter',     name: 'Goal Getter',      description: 'Hit your monthly target',             icon: Target,   color: 'text-purple-600 bg-purple-50' },
  { slug: 'on_a_streak',     name: 'On a Streak',      description: '3+ entries logged',                   icon: Flame,    color: 'text-orange-600 bg-orange-50' },
  { slug: 'climate_champion',name: 'Climate Champion', description: 'Annual footprint under 2 tonnes',     icon: Globe,    color: 'text-rose-600 bg-rose-50' },
]

const DIFF_COLOR: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-100',
  Hard:   'bg-red-50 text-red-700 border border-red-100',
}

function checkBadges(entries: FootprintEntry[], targetKg: number) {
  const unlocked: string[] = []
  if (entries.length >= 1) unlocked.push('first_step')
  if (entries.length >= 5) unlocked.push('data_driven')
  if (entries.length >= 3) unlocked.push('on_a_streak')
  const latest = entries[entries.length - 1]
  if (latest) {
    if (latest.commute_kg < 30) unlocked.push('green_commuter')
    if (latest.energy_kg  < 50) unlocked.push('energy_saver')
    if (latest.food_kg    < 50) unlocked.push('plant_powered')
    if (targetKg > 0 && latest.total_kg <= targetKg) unlocked.push('goal_getter')
    if (latest.total_kg * 12 / 1000 < 2) unlocked.push('climate_champion')
  }
  return unlocked
}

export default function GoalsPage() {
  const [entries, setEntries]       = useState<FootprintEntry[]>([])
  const [targetKg, setTargetKg]     = useState(200)
  const [loading, setLoading]       = useState(true)
  const [actionPlan, setActionPlan] = useState<ActionPlanStep[]>([])
  const [latestEntryId, setLatestEntryId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('cs_goal_kg')
    if (saved) setTargetKg(Number(saved))

    fetch('/api/history').then(r => r.json()).then(async d => {
      const fetched: FootprintEntry[] = d.entries ?? []
      setEntries(fetched)

      // Fetch cached action plan for the latest entry (no agent call)
      if (fetched.length > 0) {
        const latest = fetched[fetched.length - 1]
        setLatestEntryId(latest.id ?? null)
        try {
          const cacheRes = await fetch(`/api/insights-cache?entry_id=${latest.id}`)
          if (cacheRes.ok) {
            const cacheData = await cacheRes.json()
            setActionPlan(cacheData.action_plan ?? [])
          }
        } catch { /* no cache yet — that's fine */ }
      }

      setLoading(false)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('cs_goal_kg', String(targetKg))
  }, [targetKg])

  const latest        = entries[entries.length - 1]
  const current       = latest?.total_kg ?? 0
  const gap           = Math.max(current - targetKg, 0)
  const progress      = targetKg > 0 ? Math.min((current / targetKg) * 100, 100) : 0
  const unlockedBadges = checkBadges(entries, targetKg)

  // Pick the steps from the cached plan that together cover the gap
  const sortedPlan = [...actionPlan].sort((a, b) => b.saving_kg - a.saving_kg)
  let cumulative = 0
  const roadmapSteps = sortedPlan.filter(step => {
    if (cumulative >= gap) return false
    cumulative += step.saving_kg
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Goals &amp; Achievements</h1>
        <p className="text-slate-500 text-sm mt-1">Set your monthly target and track your progress</p>
      </div>

      {/* Target setter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-purple-500" /> Monthly Target</h2>
        <div className="flex items-center gap-4">
          <input
            type="range" min={50} max={500} step={10} value={targetKg}
            onChange={e => setTargetKg(+e.target.value)}
            className="flex-1 accent-emerald-600"
          />
          <div className="text-xl font-bold text-slate-800 w-24 text-right">{targetKg} kg</div>
        </div>
        <div className="flex gap-2">
          {[100, 150, 200, 300].map(v => (
            <button key={v} onClick={() => setTargetKg(v)} className={`px-3 py-1 rounded-lg text-xs font-medium border ${targetKg === v ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{v} kg</button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Target saved automatically</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <h2 className="font-semibold text-slate-800">This Month&apos;s Progress</h2>
        <div className="flex justify-between text-sm text-slate-500 mb-1">
          <span>Current: <strong className="text-slate-800">{current.toFixed(1)} kg</strong></span>
          <span>Target: <strong className="text-slate-800">{targetKg} kg</strong></span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progress < 80 ? 'bg-emerald-500' : progress < 100 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={`text-sm font-medium ${progress >= 100 ? 'text-red-600' : 'text-emerald-600'}`}>
          {progress >= 100
            ? `⚠️ ${(current - targetKg).toFixed(0)} kg over target`
            : `✅ ${(targetKg - current).toFixed(0)} kg remaining to hit target`}
        </div>
      </div>

      {/* How to reach your goal */}
      {gap > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                🎯 How to reach your {targetKg} kg target
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                You need to cut <strong className="text-red-500">{gap.toFixed(0)} kg/month</strong>.
                {roadmapSteps.length > 0
                  ? ` These ${roadmapSteps.length} actions from your AI plan can close the gap:`
                  : ' Go to Insights to generate your personalised plan.'}
              </p>
            </div>
            <Link href="/insights" className="shrink-0 flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700">
              Full plan <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {roadmapSteps.length > 0 ? (
            <div className="space-y-2">
              {roadmapSteps.map((step, i) => {
                const running = roadmapSteps.slice(0, i + 1).reduce((s, x) => s + x.saving_kg, 0)
                const done = running >= gap
                return (
                  <div key={step.step} className={`flex items-start gap-3 p-3 rounded-xl border ${done && i === roadmapSteps.length - 1 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="mt-0.5 shrink-0">
                      {done && i === roadmapSteps.length - 1
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Circle className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-slate-800">{step.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[step.difficulty] ?? DIFF_COLOR.Medium}`}>
                          {step.difficulty}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{step.detail}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-emerald-600">−{step.saving_kg} kg</div>
                      <div className="text-xs text-slate-400">cumulative: {Math.min(running, gap).toFixed(0)} kg</div>
                    </div>
                  </div>
                )
              })}
              <div className="text-xs text-slate-400 text-center pt-1">
                Combined saving: <strong className="text-emerald-600">{Math.min(cumulative, gap).toFixed(0)} kg</strong> — enough to {cumulative >= gap ? 'hit' : 'approach'} your {targetKg} kg target ✅
              </div>
            </div>
          ) : latestEntryId ? (
            <Link href="/insights" className="flex items-center justify-between p-4 rounded-xl border border-dashed border-emerald-200 hover:bg-emerald-50 transition-colors group">
              <div>
                <p className="text-sm font-medium text-slate-700">Generate your AI Action Plan</p>
                <p className="text-xs text-slate-400 mt-0.5">EcoAgent will analyse your data and create a week-by-week roadmap</p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link href="/calculator" className="flex items-center justify-between p-4 rounded-xl border border-dashed border-slate-200 hover:bg-slate-50 transition-colors group">
              <div>
                <p className="text-sm font-medium text-slate-700">Calculate your footprint first</p>
                <p className="text-xs text-slate-400 mt-0.5">Save a calculation to get personalised recommendations</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BADGES.map(b => {
            const unlocked = unlockedBadges.includes(b.slug)
            return (
              <div key={b.slug} className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${unlocked ? 'border-slate-100 bg-white shadow-sm' : 'border-slate-100 bg-slate-50 badge-locked'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${unlocked ? b.color : 'text-slate-400 bg-slate-100'}`}>
                  <b.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{b.name}</span>
                <span className="text-xs text-slate-400 mt-0.5 leading-tight">{b.description}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
