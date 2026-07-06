# 🌿 GreenTrace

> **AI Agent Platform for Personal Carbon Footprint Reduction**

---

## User Interface

- Home
 
  ![Home](assets/home.png)

- Register
 
  ![Register](assets/register.png)

- Login
 
  ![Login](assets/login.png)

- Dashboard

  ![Dashboard](assets/dashboard.png)

- Calculator

  ![Calculator](assets/calculator.png)

- Goals

  ![Goals](assets/goals.png)

- Insights

  ![Insights](assets/insights.png)

- Travel

  ![Travel](assets/travel.png)

- Offset

  ![Offset](assets/offset.png)

---

## 🎯 Problem Statement

Every person contributes to climate change through daily choices — commuting, eating, heating, shopping. Yet most people have no idea *where* their emissions come from or *what to change first*. Generic advice doesn't work: "eat less meat" means nothing if your biggest impact is actually your daily car commute.

**GreenTrace solves this** by deploying an AI agent — EcoAgent — that *reasons* about your specific lifestyle data, calls specialised tools, and produces a personalised, week-by-week Action Plan ranked by CO₂ impact.

---

## 🤖 Why an Agent?

A single LLM prompt cannot solve this problem well. Effective recommendations require:
1. **Analysing** which category (food, commute, energy…) contributes most — that's a tool call
2. **Computing** specific alternatives for that category — another tool call
3. **Synthesising** a realistic, ranked plan — a third tool call

EcoAgent uses the **ReAct (Reasoning + Acting)** pattern: it thinks, selects a tool, observes the result, and repeats — exactly as a human expert would. This produces auditable, explainable outputs rather than hallucinated guesses.

---

## 🏗️ Architecture

```
User Browser
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│                  GreenTrace (Next.js 16)                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               EcoAgent  (ReAct Loop)                 │  │
│  │                                                      │  │
│  │   Think ──► Choose Tool ──► Execute ──► Observe      │  │
│  │      ▲                                    │          │  │
│  │      └────────────────────────────────────┘          │  │
│  │                    (up to 5 iterations)               │  │
│  │                                                      │  │
│  │  Tools available to the agent:                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │ • analyze_footprint      — rank categories   │   │  │
│  │  │ • get_transport_alt      — mode switching    │   │  │
│  │  │ • get_food_alternatives  — dietary swaps     │   │  │
│  │  │ • get_energy_tips        — home energy       │   │  │
│  │  │ • calculate_action_plan  — synthesise plan   │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              MCP Server  (/api/mcp)                │    │
│  │  JSON-RPC 2.0 · Bearer token auth                  │    │
│  │  Tools: calculate, analyze, transport, food, energy│    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────┐   ┌──────────────────────────┐   │
│  │   Carbon Calculator  │   │   Dashboard / Goals      │   │
│  │   (5 categories)     │   │   Eco Route Planner      │   │
│  │   IPCC AR6 factors   │   │   Carbon Offset (Stripe) │   │
│  └─────────────────────┘   └──────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
    Supabase DB                   Groq Cloud API
   (PostgreSQL + RLS)         (Llama 3.1 8B Instant)
```

### Agent Flow (step by step)

| Step | Agent action | Implementation |
|------|-------------|----------------|
| 1 | Receives user's CO₂ breakdown + goal | `/api/insights` POST |
| 2 | Calls `analyze_footprint` tool | `src/lib/agent/tools.ts` |
| 3 | Reads priority categories from observation | ReAct loop in `ecoagent.ts` |
| 4 | Calls **all 3** domain tools (transport + food + energy) | Code auto-collects all results |
| 5 | Calls `calculate_action_plan` — code injects all collected actions | Returns week-by-week plan |
| 6 | Produces final JSON (tips + action plan + trace) | UI renders 3 tabs |
| 7 | Result cached in `insights_cache` (Supabase) | Instant on revisit — no re-run |

---

## ✨ Key Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **Agent / Multi-agent system** | ReAct loop in `src/lib/agent/ecoagent.ts` with 5 composable tools |
| **MCP Server** | `src/app/api/mcp/route.ts` — JSON-RPC 2.0, tools/list + tools/call |
| **Security features** | Supabase RLS, Next.js auth middleware, MCP Bearer token, no secrets in client code |
| **Deployability** | Vercel deployment with health endpoint + UptimeRobot monitoring |

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **EcoAgent (ReAct)** | Multi-step AI agent with tool-calling, full reasoning trace visible to user |
| 🔌 **MCP Server** | `/api/mcp` exposes GreenTrace as a standardised tool server |
| 🧮 **Carbon Calculator** | Multi-domain footprint tracking (Travel, Food, Energy, Shopping, Commute) |
| 📊 **Dashboard** | Monthly trend charts, category breakdown, comparison vs global averages |
| 📋 **Action Plan** | Week-by-week step plan with completion checkboxes, persisted to Supabase |
| 🧠 **Agent Trace** | Transparent view of agent reasoning steps — builds user trust |
| ⚡ **Insights Cache** | Agent results cached in Supabase per entry — instant on revisit, no re-run |
| 🎯 **Goals & Roadmap** | Monthly targets, achievement badges, and AI-powered "How to reach goal" roadmap |
| 🗺️ **Eco Route Planner** | Compare CO₂ across Car, EV, Bus, Train, Flight with live map |
| 💚 **Carbon Offset** | Donate to verified projects via Stripe Checkout |
| 🔐 **Authentication** | Email/password auth with Supabase + Row Level Security |

---

## 🛠️ Tech Stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **AI Agent** — Groq Cloud API · `llama-3.1-8b-instant` — fast, tool-calling, 30k TPM free tier
- **Agent Pattern** — ReAct (Reason + Act) loop with automatic retry on rate limits, implemented in TypeScript
- **MCP** — Custom JSON-RPC 2.0 server at `/api/mcp`
- **Styling** — Tailwind CSS v4 + Lucide React icons
- **Auth & Database** — Supabase (PostgreSQL + Row Level Security)
- **Maps** — Leaflet.js + OpenRouteService API + Nominatim geocoding
- **Payments** — Stripe Checkout
- **Charts** — Recharts
- **Deployment** — Vercel

---

## 📁 Project Structure

```
greentrace/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/      # Overview charts & stats
│   │   │   ├── calculator/     # 5-tab CO₂ calculator
│   │   │   ├── goals/          # Targets & achievement badges
│   │   │   ├── insights/       # Agent output: Tips, Action Plan, Trace, Chat
│   │   │   ├── travel/         # Eco route planner + map
│   │   │   └── offset/         # Stripe carbon offset donations
│   │   └── api/
│   │       ├── insights/       # EcoAgent endpoint (ReAct loop + cache check)
│   │       ├── insights-cache/ # Lightweight cache read for Goals page
│   │       ├── mcp/            # MCP Server (JSON-RPC 2.0)
│   │       ├── calculator/     # CO₂ calculation + save to DB
│   │       ├── history/        # Fetch footprint entries
│   │       ├── health/         # Health check + Supabase keepalive (GET + HEAD)
│   │       └── stripe/         # Stripe checkout session
│   └── lib/
│       ├── agent/
│       │   ├── tools.ts        # Agent tool definitions + implementations
│       │   └── ecoagent.ts     # ReAct orchestrator loop
│       ├── supabase/           # Browser & server Supabase clients
│       ├── groq.ts             # Groq SDK client + model constant
│       ├── stripe.ts           # Stripe SDK client
│       ├── calculateCO2.ts     # Core emission calculation logic
│       └── emissionFactors.ts  # IPCC AR6 / EPA emission constants
├── supabase_schema.sql          # Full DB schema with RLS policies
└── .env.local                   # Environment variables (see setup below)
```

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/Kritansh-Tank/GreenTrace.git
cd GreenTrace
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Groq AI (get free key at console.groq.com)
GROQ_API_KEY=your_groq_api_key

# Stripe (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# OpenRouteService (optional — enables live route polylines)
NEXT_PUBLIC_ORS_API_KEY=your_ors_api_key

# MCP Server auth (optional — leave blank for open access in dev)
MCP_SECRET=your_mcp_secret_token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase Database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor → New Query**
3. Paste and run the contents of `supabase_schema.sql`

This creates all tables with RLS policies:
- `profiles` — user info (auto-populated on signup via trigger)
- `footprint_entries` — CO₂ logs with computed `total_kg`
- `goals` — monthly reduction targets
- `user_badges` — unlocked achievements
- `carbon_offsets` — Stripe payment records
- `insights_cache` — EcoAgent results cached per entry (avoids re-running the agent on every visit)

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔌 MCP Server Usage

The MCP server is at `POST /api/mcp`. It implements the [Model Context Protocol](https://modelcontextprotocol.io/) (JSON-RPC 2.0).

### List available tools

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Calculate a footprint

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "greentrace_calculate_footprint",
      "arguments": {
        "energy": { "electricity_kwh": 300, "gas_m3": 20, "country": "india", "has_solar": false },
        "commute": { "mode": "car_petrol", "km_per_day": 25, "work_days": 22 }
      }
    }
  }'
```

### With authentication (set MCP_SECRET in .env.local)

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_mcp_secret_token" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## 🌍 Emission Factors

CO₂ calculations use industry-standard factors from **IPCC AR6** and **EPA 2023**:

| Category | Source | Example |
|---|---|---|
| Transport | IPCC AR6 WGIII | Car petrol: 0.192 kg/km |
| Food | FAO / Oxford LEAP | Paneer: 8.5 kg CO₂/kg |
| Energy | IEA 2023 grid mix | India grid: 0.82 kg/kWh |
| Shopping | Carbon Trust | Smartphone: 70 kg/unit |

---

## 🔐 Security Features

| Feature | Implementation |
|---|---|
| **Row Level Security** | All Supabase tables have RLS — users only see their own data |
| **Auth Middleware** | `src/proxy.ts` protects all `/dashboard/*` and `/api/*` routes |
| **MCP Auth** | Optional Bearer token (`MCP_SECRET`) gates the MCP server |
| **No secrets in client** | All API keys are server-side only (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) |
| **Input validation** | All API routes validate and sanitise inputs before processing |

---

## ☁️ Deploy to Vercel

```bash
npx vercel
```

Add all `.env.local` variables in **Vercel → Project Settings → Environment Variables**.

Update `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL.

The included `vercel.json` sets the deployment region to **Mumbai (bom1)** and adds security headers automatically.

---

## 🩺 Health Monitoring

```
GET  /api/health  →  { status: "ok", db: "ok", timestamp: "...", service: "greentrace" }
HEAD /api/health  →  200 (no body, for UptimeRobot)
```

**UptimeRobot setup:**
1. Add new monitor → Type: **HTTP(s)**
2. URL: `https://your-app.vercel.app/api/health`
3. Monitoring interval: **5 minutes**

---

## 🧪 Stripe Test Cards

| Card | Number |
|---|---|
| ✅ Success | `4242 4242 4242 4242` |
| ❌ Declined | `4000 0000 0000 0002` |

Use any future expiry, any 3-digit CVC.

---

## 📄 License

MIT License - See [LICENSE](./LICENSE.md) file for details
