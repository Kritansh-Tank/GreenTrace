'use client'
import { useState, useEffect } from 'react'
import { Lightbulb, TrendingDown, Loader2, MessageSquare, Send } from 'lucide-react'
import type { FootprintEntry, InsightTip } from '@/types'

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard: 'bg-red-50 text-red-700',
}

export default function InsightsPage() {
  const [tips, setTips] = useState<InsightTip[]>([])
  const [loading, setLoading] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [chat, setChat] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [latestEntry, setLatestEntry] = useState<FootprintEntry | null>(null)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => {
      const entries: FootprintEntry[] = d.entries ?? []
      if (entries.length > 0) {
        setHasData(true)
        setLatestEntry(entries[entries.length - 1])
        generateTips(entries[entries.length - 1])
      }
    })
  }, [])

  const generateTips = async (entry: FootprintEntry) => {
    setLoading(true)
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breakdown: entry, goal_kg: localStorage.getItem('cs_goal_kg') ?? 200 }),
    })
    const data = await res.json()
    setTips(data.tips ?? [])
    setLoading(false)
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const q = chatInput
    setChatInput('')
    setChat(prev => [...prev, { role: 'user', text: q }])
    setChatLoading(true)
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breakdown: latestEntry, goal_kg: 200, question: q }),
    })
    const data = await res.json()
    const aiText = data.tips?.map((t: InsightTip) => `**${t.title}**: ${t.explanation}`).join('\n\n') ?? 'Could not generate a response.'
    setChat(prev => [...prev, { role: 'ai', text: aiText }])
    setChatLoading(false)
  }

  if (!hasData) return (
    <div className="text-center py-20">
      <Lightbulb className="w-12 h-12 text-amber-400 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-slate-800 mb-2">No footprint data yet</h2>
      <p className="text-slate-500">Calculate your first footprint to get personalized AI insights.</p>
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Insights</h1>
        <p className="text-slate-500 text-sm mt-1">Personalized tips from EcoCoach, powered by Groq</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-slate-500 text-sm">EcoCoach is analyzing your footprint...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{tip.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[tip.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>{tip.difficulty}</span>
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />-{tip.saving_kg} kg/mo
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500">{tip.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* EcoCoach Chat */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-slate-800">Ask EcoCoach</span>
        </div>
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {chat.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Ask anything about reducing your carbon footprint...</p>}
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && <div className="flex justify-start"><div className="bg-slate-100 rounded-2xl px-4 py-2.5"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div></div>}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="How can I reduce my food emissions?" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={sendChat} disabled={chatLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
