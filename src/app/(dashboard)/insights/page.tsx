'use client'
/**
 * GreenTrace — AI Insights Page
 * ------------------------------
 * Displays the output of the EcoAgent ReAct loop:
 *   1. AI Tips tab     — top 5 tips sorted by CO₂ saving
 *   2. Action Plan tab — week-by-week plan with completion checkboxes
 *   3. Agent Trace tab — transparent view of the agent's reasoning steps
 *   4. EcoAgent chat panel — follow-up questions answered by the agent
 *
 * The agent trace is shown to build user trust and satisfies the competition's
 * "Agents: Why agents? How can agents uniquely help solve that problem?" criteria.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Lightbulb, TrendingDown, Loader2, MessageSquare, Send,
  ChevronDown, ChevronUp, CheckSquare, Square, Wrench,
  Brain, ListChecks, Zap, CheckCircle2, AlertCircle,
} from 'lucide-react'
import type { FootprintEntry, InsightTip, ActionPlanStep, AgentTraceStep } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-100',
  Hard:   'bg-red-50 text-red-700 border border-red-100',
}

const WEEK_COLORS = ['bg-blue-50 border-blue-200', 'bg-purple-50 border-purple-200', 'bg-teal-50 border-teal-200', 'bg-rose-50 border-rose-200']

const CAT_ICON: Record<string, string> = {
  travel: '✈️', food: '🥗', energy: '⚡', shopping: '🛍️', commute: '🚇',
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TipCard({ tip, i }: { tip: InsightTip; i: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 font-bold text-emerald-700 text-sm">
        {i + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
          <span className="font-semibold text-slate-800">{tip.title}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[tip.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>
              {tip.difficulty}
            </span>
            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-teal-100">
              <TrendingDown className="w-3 h-3" />−{tip.saving_kg} kg/mo
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-500">{tip.explanation}</p>
        {tip.category && (
          <span className="text-xs text-slate-400 mt-1 block">
            {CAT_ICON[tip.category] ?? '🌿'} {tip.category}
          </span>
        )}
      </div>
    </div>
  )
}

function ActionPlanCard({
  step, onToggle,
}: {
  step: ActionPlanStep & { completed: boolean }
  onToggle: () => void
}) {
  return (
    <div className={`rounded-2xl border p-5 flex gap-4 transition-all ${step.completed ? 'opacity-60' : ''}`}>
      <button onClick={onToggle} className="mt-0.5 shrink-0 text-emerald-600 hover:text-emerald-700">
        {step.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div>
            <span className={`font-semibold text-slate-800 ${step.completed ? 'line-through text-slate-400' : ''}`}>
              {step.title}
            </span>
            <span className="text-xs text-slate-400 ml-2">{CAT_ICON[step.category] ?? '🌿'} {step.category}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[step.difficulty] ?? 'bg-slate-100'}`}>
              {step.difficulty}
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
              −{step.saving_kg} kg/mo
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-500">{step.detail}</p>
        <p className="text-xs text-slate-400 mt-1.5">
          Cumulative saving: <strong className="text-emerald-600">{step.cumulative_saving_kg} kg</strong>
        </p>
      </div>
    </div>
  )
}

function TraceStep({ step, i }: { step: AgentTraceStep; i: number }) {
  const [open, setOpen] = useState(false)

  const icons = {
    thought:     <Brain className="w-4 h-4 text-purple-500" />,
    tool_call:   <Wrench className="w-4 h-4 text-blue-500" />,
    tool_result: <Zap className="w-4 h-4 text-amber-500" />,
    answer:      <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  }
  const labels = {
    thought:     'Thought',
    tool_call:   `Tool Call: ${step.tool_name ?? ''}`,
    tool_result: `Result: ${step.tool_name ?? ''}`,
    answer:      'Final Answer',
  }
  const bgColors = {
    thought:     'bg-purple-50 border-purple-100',
    tool_call:   'bg-blue-50 border-blue-100',
    tool_result: 'bg-amber-50 border-amber-100',
    answer:      'bg-emerald-50 border-emerald-100',
  }

  const hasDetail = step.type === 'tool_result' || step.type === 'answer'
  let preview = step.content
  try {
    const parsed = JSON.parse(step.content)
    preview = JSON.stringify(parsed, null, 2)
  } catch { /* not JSON */ }

  return (
    <div className={`rounded-xl border p-3.5 ${bgColors[step.type]}`}>
      <button
        className="flex items-center gap-2.5 w-full text-left"
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm shrink-0">
          {i + 1}
        </span>
        {icons[step.type]}
        <span className="text-sm font-medium text-slate-700 flex-1">{labels[step.type]}</span>
        {hasDetail && (
          open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {step.type === 'tool_call' && step.tool_args && (
        <div className="mt-2 pl-10">
          <pre className="text-xs text-slate-600 bg-white/70 rounded-lg p-2 overflow-x-auto">
            {JSON.stringify(step.tool_args, null, 2)}
          </pre>
        </div>
      )}
      {open && hasDetail && (
        <div className="mt-2 pl-10">
          <pre className="text-xs text-slate-600 bg-white/70 rounded-lg p-2 overflow-x-auto max-h-48">
            {preview}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [tips, setTips] = useState<InsightTip[]>([])
  const [actionPlan, setActionPlan] = useState<(ActionPlanStep & { completed: boolean })[]>([])
  const [trace, setTrace] = useState<AgentTraceStep[]>([])
  const [summary, setSummary] = useState('')
  const [totalSaving, setTotalSaving] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [allEntries, setAllEntries] = useState<FootprintEntry[]>([])        // all saved calculations
  const [selectedEntry, setSelectedEntry] = useState<FootprintEntry | null>(null) // currently analysed
  const [latestEntry, setLatestEntry] = useState<FootprintEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'tips' | 'plan' | 'trace'>('tips')

  // Chat state
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  // Prevents React StrictMode from firing the effect twice in dev,
  // which would trigger two agent API calls and cause flickering results.
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    fetch('/api/history').then(r => r.json()).then(d => {
      const entries: FootprintEntry[] = d.entries ?? []
      if (entries.length > 0) {
        setHasData(true)
        setAllEntries(entries)
        const latest = entries[entries.length - 1]
        setLatestEntry(latest)
        setSelectedEntry(latest)
        generateInsights(latest)
      }
    })
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat, chatLoading])

  const generateInsights = async (entry: FootprintEntry) => {
    setLoading(true)
    const goalKg = Number(localStorage.getItem('cs_goal_kg') ?? 200)

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id:  entry.id,
          breakdown: entry,
          goal_kg:   goalKg,
          // Pass key fields so EcoAgent domain tools get realistic arguments.
          // The entry stores the pre-computed kg values; we infer mode hints
          // from which categories are highest so the agent calls the right tools.
          form_data: {
            commute_mode:    entry.commute_kg  > 50  ? 'car_petrol' : 'public_transport',
            km_per_day:      entry.commute_kg  > 0   ? Math.round(entry.commute_kg / 0.21 / 22) : 15,
            electricity_kwh: entry.energy_kg   > 0   ? Math.round(entry.energy_kg  / 0.82)       : 200,
          },
        }),
      })
      const data = await res.json()
      setTips(data.tips ?? [])
      setSummary(data.summary ?? '')
      setTotalSaving(data.total_potential_saving_kg ?? 0)
      setTrace(data.trace ?? [])

      // Initialise action plan with completion state from localStorage
      const saved = JSON.parse(localStorage.getItem('gt_plan_completed') ?? '{}')
      const plan = (data.action_plan ?? []).map((s: ActionPlanStep) => ({
        ...s,
        completed: !!saved[`step_${s.step}`],
      }))
      setActionPlan(plan)
    } catch {
      setTips([])
    }
    setLoading(false)
  }

  const toggleStep = (stepNum: number) => {
    setActionPlan(prev => {
      const next = prev.map(s => s.step === stepNum ? { ...s, completed: !s.completed } : s)
      // Persist to localStorage
      const saved: Record<string, boolean> = {}
      next.forEach(s => { saved[`step_${s.step}`] = s.completed })
      localStorage.setItem('gt_plan_completed', JSON.stringify(saved))
      return next
    })
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const q = chatInput.trim()
    setChatInput('')
    setChat(prev => [...prev, { role: 'user', text: q }])
    setChatLoading(true)
    try {
      const goalKg = Number(localStorage.getItem('cs_goal_kg') ?? 200)
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdown: selectedEntry ?? latestEntry, goal_kg: goalKg, question: q }),
      })
      const data = await res.json()
      setChat(prev => [...prev, { role: 'ai', text: data.reply ?? 'No response.' }])
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Connection error — please try again.' }])
    }
    setChatLoading(false)
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!hasData) return (
    <div className="text-center py-20">
      <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-slate-800 mb-2">No footprint data yet</h2>
      <p className="text-slate-500">Calculate your first footprint to get a personalised Action Plan.</p>
    </div>
  )

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Insights</h1>
        <p className="text-slate-500 text-sm mt-1">Powered by EcoAgent · Groq Llama 3.1 8B</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <div className="text-center">
          <p className="text-slate-700 font-semibold">EcoAgent is reasoning…</p>
          <p className="text-slate-400 text-sm mt-1">Think → Call tools → Observe → Plan</p>
        </div>
      </div>
    </div>
  )

  const weekGroups = [1, 2, 3, 4].map(w => actionPlan.filter(s => s.week === w))
  const completedCount = actionPlan.filter(s => s.completed).length

  // ── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Insights</h1>
          <p className="text-slate-500 text-sm mt-1">Powered by EcoAgent · Groq Llama 3.1 8B · ReAct loop</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          {/* Entry info — dropdown if multiple, plain badge if single */}
          {selectedEntry && (
            allEntries.length > 1 ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Analyse entry:</label>
                <select
                  id="entry-selector"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                  value={selectedEntry?.id ?? ''}
                  onChange={e => {
                    const entry = allEntries.find(en => en.id === e.target.value)
                    if (entry && entry.id !== selectedEntry?.id) {
                      setSelectedEntry(entry)
                      setLatestEntry(entry)
                      setTips([])
                      setActionPlan([])
                      setTrace([])
                      setSummary('')
                      setTotalSaving(0)
                      setActiveTab('tips')
                      generateInsights(entry)
                    }
                  }}
                >
                  {[...allEntries].reverse().map(en => (
                    <option key={en.id} value={en.id}>
                      {new Date(en.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — {Number(en.total_kg).toFixed(0)} kg
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                📅 {new Date(selectedEntry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                <span className="ml-2 font-semibold text-slate-700">{Number(selectedEntry.total_kg).toFixed(0)} kg CO₂</span>
              </div>
            )
          )}
          {totalSaving > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-sm text-emerald-700 font-medium">
              💚 Up to <strong>{totalSaving.toFixed(1)} kg/month</strong> possible savings
            </div>
          )}
        </div>
      </div>

      {/* Summary banner */}
      {summary && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex gap-3 items-start">
          <Brain className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">{summary}</p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {([
          { id: 'tips',  label: 'AI Tips',      icon: Lightbulb,  count: tips.length },
          { id: 'plan',  label: 'Action Plan',  icon: ListChecks, count: actionPlan.length },
          { id: 'trace', label: 'Agent Trace',  icon: Brain,      count: trace.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className="ml-1 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: AI Tips ── */}
      {activeTab === 'tips' && (
        <div className="space-y-3">
          {tips.length === 0 ? (
            <p className="text-slate-400 text-center py-10">No tips generated yet.</p>
          ) : (
            tips.map((tip, i) => <TipCard key={i} tip={tip} i={i} />)
          )}
        </div>
      )}

      {/* ── Tab: Action Plan ── */}
      {activeTab === 'plan' && (
        <div className="space-y-5">
          {/* Progress bar */}
          {actionPlan.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-slate-700">Plan Progress</span>
                <span className="text-slate-500">{completedCount}/{actionPlan.length} steps</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${actionPlan.length > 0 ? (completedCount / actionPlan.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Week groups */}
          {weekGroups.map((weekSteps, wi) => weekSteps.length > 0 && (
            <div key={wi} className={`rounded-2xl border-2 ${WEEK_COLORS[wi]} p-5 space-y-3`}>
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Week {wi + 1}</h3>
              {weekSteps.map(step => (
                <ActionPlanCard key={step.step} step={step} onToggle={() => toggleStep(step.step)} />
              ))}
            </div>
          ))}

          {actionPlan.length === 0 && (
            <p className="text-slate-400 text-center py-10">No action plan generated yet. Run insights first.</p>
          )}
        </div>
      )}

      {/* ── Tab: Agent Trace ── */}
      {activeTab === 'trace' && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-500">
            <strong className="text-slate-700">How EcoAgent reasoned</strong> — each step below shows the agent's
            thought process: which tools it called, the tool outputs it observed, and how it synthesised your Action Plan.
          </div>
          {trace.length === 0 ? (
            <p className="text-slate-400 text-center py-10">No trace available.</p>
          ) : (
            trace.map((step, i) => <TraceStep key={i} step={step} i={i} />)
          )}
        </div>
      )}

      {/* ── EcoAgent Chat ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-slate-800">Ask EcoAgent</span>
          <span className="text-xs text-slate-400 ml-1">— follow-up questions</span>
        </div>
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {chat.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Ask anything about reducing your carbon footprint…
            </p>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-4 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="How can I reduce my food emissions?"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            id="ecoagent-chat-send"
            onClick={sendChat}
            disabled={chatLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white p-2.5 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  )
}
