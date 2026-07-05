import Link from 'next/link'
import { Leaf, ArrowRight, BarChart3, Lightbulb, Target, Map, Heart, TrendingDown, Zap, Car, Train, Bus } from 'lucide-react'

export const metadata = {
  title: 'GreenTrace — Know Your Footprint. Change Your Future.',
  description: 'Track, understand, and reduce your personal carbon footprint with an AI agent that reasons, plans, and acts on your behalf.',
}

const features = [
  { icon: BarChart3, label: 'Carbon Calculator', desc: 'Multi-domain tracking across travel, food, energy, shopping and commute — built on IPCC AR6 emission factors.' },
  { icon: Lightbulb, label: 'AI Agent Insights', desc: 'EcoAgent analyses your real data using a ReAct reasoning loop and generates a ranked, personalised Action Plan via Groq Llama 3.1 8B.' },
  { icon: Target, label: 'Goals & Badges', desc: 'Set monthly reduction targets, track progress, and unlock achievement badges as you hit milestones.' },
  { icon: Map, label: 'Eco Route Planner', desc: 'Compare CO₂ across Car, EV, Bus, Train and Flight for any route with live mapping via OpenRouteService.' },
  { icon: Heart, label: 'Carbon Offset', desc: 'Donate to verified reforestation and solar projects via Stripe Checkout to offset what you cannot eliminate.' },
  { icon: TrendingDown, label: 'Trend Dashboard', desc: 'Visualise progress month-on-month with charts comparing you against global and Paris Agreement averages.' },
]

const stats = [
  { value: '4.7t', label: 'Average Indian annual CO₂ footprint' },
  { value: '2t', label: 'Paris Agreement target per person' },
  { value: '57%', label: 'Reduction needed globally by 2030' },
  { value: '1B+', label: 'Tonnes saved if 1% of India acts' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Floating island navbar ── */}
      <header className="fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4 sm:px-6">
        <nav className="bg-white rounded-2xl shadow-lg px-6 h-14 flex items-center gap-6 w-full max-w-4xl">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-base text-gray-900">GreenTrace</span>
          </Link>

          <div className="flex-1 flex items-center justify-center gap-6">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="#insights" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">AI Insights</Link>
            <Link href="#routes" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Eco Routes</Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="btn-pill !text-sm !py-2 !pl-4 !pr-2.5">
              Get Started
              <span className="arrow-circle !w-6 !h-6">
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero card ── */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
        <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: '88vh' }}>
          {/* bg image */}
          <img
            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1800&q=80"
            alt="Green forest"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />

          <div className="relative z-10 flex flex-col justify-end h-full min-h-[88vh] p-10 sm:p-14 lg:p-16">
            <div className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.06] tracking-tight mb-5">
                Know Your Footprint.
                <br />Change Your Future.
              </h1>
              <p className="text-base sm:text-lg text-white/70 mb-10 leading-relaxed max-w-xl">
                Purpose-built to help individuals understand, track, and meaningfully reduce their carbon footprint through AI-powered insights and personalised actions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-pill">
                  Start Tracking Free
                  <span className="arrow-circle">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
                <Link href="/login"
                  className="flex items-center gap-2 text-white font-semibold text-base hover:text-green-300 transition-colors">
                  Learn More <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">{s.value}</div>
                <div className="text-sm text-gray-500 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-4 sm:px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="section-label">Platform Features</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
              Everything you need<br />to go net zero
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.label} className="bg-white border border-gray-200 rounded-2xl p-8">
                <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.label}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI section card ── */}
      <div id="insights" className="px-4 sm:px-6 pb-8">
        <div className="bg-gray-950 rounded-3xl overflow-hidden p-10 sm:p-14 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-label !text-green-400">AI-Powered Agentic Insights</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-5 mt-2">
                Meet your personal<br />EcoAgent
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                EcoAgent uses a ReAct reasoning loop — it thinks, selects tools, observes results, and plans — generating a personalised Action Plan ranked by CO₂ impact. Ask it anything in plain language.
              </p>
              <ul className="space-y-3 mb-10">
                {['Ranked by CO₂ saving potential', 'Tailored to your actual habits', 'Multi-step ReAct agent loop', 'Chat in plain English', 'Powered by Groq Llama 3.1 8B'].map(pt => (
                  <li key={pt} className="flex items-center gap-3 text-gray-300 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    </div>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn-pill">
                Try EcoAgent free
                <span className="arrow-circle">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            {/* Chat mockup */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">EcoAgent</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-500">Groq Llama 3.1 8B</span>
                  </div>
                </div>
              </div>
              {[
                { role: 'user', text: 'How can I reduce my food emissions?' },
                { role: 'ai', text: '[Tool: analyze_footprint] Your food category is 34 kg/month — your highest emitter. Reducing beef to 1 serving/week saves ~22 kg CO₂. I have added this to your Action Plan as Step 1.' },
                { role: 'user', text: 'What about my commute?' },
                { role: 'ai', text: '[Tool: get_transport_alternatives] Switching to Metro 3 days/week saves ~18 kg CO₂/month. Added as Step 2 — your Action Plan is ready.' },
              ].map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/8 text-gray-300 border border-white/10'
                    }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Eco Routes ── */}
      <section id="routes" className="px-4 sm:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Route comparison card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-2.5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Delhi → Mumbai · 1,400 km</div>
              {[
                { mode: 'Train', icon: Train, co2: 57.4 },
                { mode: 'Electric Car', icon: Zap, co2: 74.2 },
                { mode: 'Bus', icon: Bus, co2: 124.6 },
                { mode: 'Car (Petrol)', icon: Car, co2: 268.8 },
              ].map((r, i) => (
                <div key={r.mode} className={`flex items-center gap-4 p-3 rounded-xl ${i === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className={`text-sm font-semibold w-28 shrink-0 flex items-center gap-1.5 ${i === 0 ? 'text-green-700' : 'text-gray-700'}`}>
                    <r.icon className="w-3.5 h-3.5" />
                    {r.mode} {i === 0 && <span>🌿</span>}
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-gray-400'}`}
                      style={{ width: `${(r.co2 / 268.8) * 100}%` }} />
                  </div>
                  <div className={`text-sm font-bold w-16 text-right shrink-0 ${i === 0 ? 'text-green-700' : 'text-gray-600'}`}>
                    {r.co2} kg
                  </div>
                </div>
              ))}
            </div>

            <div>
              <span className="section-label">Eco Route Planner</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-5">
                Every journey,<br />a greener choice
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                CarbonSense fetches live route data and instantly shows you the CO₂ cost of every transport mode — so you choose consciously.
              </p>
              <Link href="/register" className="btn-pill">
                Plan a route
                <span className="arrow-circle">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA card ── */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="bg-green-600 rounded-3xl p-14 sm:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
          <div className="relative">
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              The planet needs you to act now
            </h2>
            <p className="text-green-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Calculate your footprint in under 5 minutes, get AI-powered tips, and start your journey to net zero today.
            </p>
            <Link href="/register" className="btn-pill !bg-white !text-green-700 inline-flex hover:!bg-gray-50">
              Create your free account
              <span className="arrow-circle !bg-green-600" style={{ background: '#16a34a' }}>
                <ArrowRight className="w-4 h-4" style={{ color: 'white' }} />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer card ── */}
      <div className="px-4 sm:px-6 pt-4 pb-6">
        <div className="bg-gray-950 rounded-3xl px-10 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">GreenTrace</span>
            </div>
            <p className="text-gray-500 text-sm">
              Emission factors from IPCC AR6 & EPA 2023
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/login" className="hover:text-green-400 transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-green-400 transition-colors">Register</Link>
            </div>
          </div>
          <div className="border-t border-white mt-8 pt-6 text-xs text-gray-600 text-center">
            © 2026 GreenTrace
          </div>
        </div>
      </div>

    </div>
  )
}
