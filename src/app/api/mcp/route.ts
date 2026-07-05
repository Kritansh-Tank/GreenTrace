/**
 * GreenTrace MCP Server — Model Context Protocol Endpoint
 * --------------------------------------------------------
 * Implements the MCP JSON-RPC 2.0 protocol, exposing GreenTrace's capabilities
 * as standardised tools that any MCP-compatible client can invoke.
 *
 * Endpoint: POST /api/mcp
 *
 * Supported MCP methods:
 *   - initialize          : handshake / capability negotiation
 *   - tools/list          : returns the list of available tools
 *   - tools/call          : executes a named tool with provided arguments
 *
 * Available Tools:
 *   - greentrace_calculate_footprint  : calculate CO₂ from structured input
 *   - greentrace_analyze_footprint    : rank categories by emission priority
 *   - greentrace_compare_transport    : compare CO₂ across transport modes
 *   - greentrace_get_food_alternatives: dietary swap CO₂ savings
 *   - greentrace_get_energy_tips      : home energy reduction tips
 *
 * Security:
 *   - Requires Bearer token in Authorization header (MCP_SECRET env var)
 *   - All inputs are validated before execution
 *   - No user PII is processed or stored by this endpoint
 *
 * MCP Reference: https://modelcontextprotocol.io/specification
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateCO2 } from '@/lib/calculateCO2'
import { dispatchTool, AGENT_TOOLS } from '@/lib/agent/tools'
import type { CalculatorFormData } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// MCP JSON-RPC types (minimal subset we need)
// ─────────────────────────────────────────────────────────────────────────────

interface MCPRequest {
  jsonrpc: '2.0'
  id:      string | number | null
  method:  string
  params?: Record<string, unknown>
}

interface MCPResponse {
  jsonrpc: '2.0'
  id:      string | number | null
  result?: unknown
  error?:  { code: number; message: string }
}

function ok(id: MCPRequest['id'], result: unknown): NextResponse {
  const body: MCPResponse = { jsonrpc: '2.0', id, result }
  return NextResponse.json(body)
}

function err(id: MCPRequest['id'], code: number, message: string): NextResponse {
  const body: MCPResponse = { jsonrpc: '2.0', id, error: { code, message } }
  return NextResponse.json(body, { status: 200 }) // MCP errors use HTTP 200
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Tool definitions
// These wrap our agent tools plus a CO₂ calculator tool specific to MCP.
// ─────────────────────────────────────────────────────────────────────────────

const MCP_TOOLS = [
  // Calculator tool — unique to MCP (the agent tools don't include raw calculation)
  {
    name:        'greentrace_calculate_footprint',
    description: 'Calculate monthly CO₂ emissions from structured lifestyle inputs covering travel, food, energy, shopping, and commute. Returns a full breakdown in kg CO₂e.',
    inputSchema: {
      type: 'object',
      properties: {
        travel: {
          type: 'object',
          properties: {
            mode:       { type: 'string', description: 'car_petrol | car_diesel | ev | bus | train | motorcycle | flight_short | flight_long' },
            distance:   { type: 'number', description: 'Distance in km' },
            passengers: { type: 'number', description: 'Number of passengers sharing' },
            trips:      { type: 'number', description: 'Number of trips per month' },
          },
        },
        food: {
          type: 'object',
          properties: {
            paneer_servings:     { type: 'number' },
            chicken_servings:    { type: 'number' },
            fish_servings:       { type: 'number' },
            dairy_liters:        { type: 'number' },
            eggs_per_week:       { type: 'number' },
            plant_based_percent: { type: 'number', description: '0-100' },
          },
        },
        energy: {
          type: 'object',
          properties: {
            electricity_kwh: { type: 'number' },
            gas_m3:          { type: 'number' },
            country:         { type: 'string', description: 'india | us | eu | uk' },
            has_solar:       { type: 'boolean' },
          },
        },
        shopping: {
          type: 'object',
          properties: {
            online_orders:   { type: 'number' },
            clothing_items:  { type: 'number' },
            has_phone_new:   { type: 'boolean' },
            has_laptop_new:  { type: 'boolean' },
          },
        },
        commute: {
          type: 'object',
          properties: {
            mode:       { type: 'string' },
            km_per_day: { type: 'number' },
            work_days:  { type: 'number' },
          },
        },
      },
    },
  },
  // Re-expose agent tools under greentrace_ namespace
  ...AGENT_TOOLS
    .filter(t => t.name !== 'calculate_action_plan') // action plan needs multi-step context
    .map(t => ({
      name:        `greentrace_${t.name}`,
      description: t.description,
      inputSchema: t.parameters,
    })),
]

// ─────────────────────────────────────────────────────────────────────────────
// Tool dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function callMCPTool(name: string, args: Record<string, unknown>): unknown {
  if (name === 'greentrace_calculate_footprint') {
    // Build a full CalculatorFormData with defaults for any missing fields
    const formData: CalculatorFormData = {
      travel: {
        mode:       String(  (args.travel as Record<string,unknown>)?.mode       ?? 'car_petrol'),
        distance:   Number(  (args.travel as Record<string,unknown>)?.distance   ?? 0),
        passengers: Number(  (args.travel as Record<string,unknown>)?.passengers ?? 1),
        trips:      Number(  (args.travel as Record<string,unknown>)?.trips      ?? 1),
      },
      food: {
        paneer_servings:     Number((args.food as Record<string,unknown>)?.paneer_servings     ?? 0),
        chicken_servings:    Number((args.food as Record<string,unknown>)?.chicken_servings    ?? 0),
        fish_servings:       Number((args.food as Record<string,unknown>)?.fish_servings       ?? 0),
        dairy_liters:        Number((args.food as Record<string,unknown>)?.dairy_liters        ?? 0),
        eggs_per_week:       Number((args.food as Record<string,unknown>)?.eggs_per_week       ?? 0),
        plant_based_percent: Number((args.food as Record<string,unknown>)?.plant_based_percent ?? 0),
      },
      energy: {
        electricity_kwh: Number( (args.energy as Record<string,unknown>)?.electricity_kwh ?? 200),
        gas_m3:          Number( (args.energy as Record<string,unknown>)?.gas_m3          ?? 0),
        country:         String( (args.energy as Record<string,unknown>)?.country         ?? 'india'),
        has_solar:       Boolean((args.energy as Record<string,unknown>)?.has_solar       ?? false),
      },
      shopping: {
        online_orders:  Number( (args.shopping as Record<string,unknown>)?.online_orders  ?? 0),
        clothing_items: Number( (args.shopping as Record<string,unknown>)?.clothing_items ?? 0),
        has_phone_new:  Boolean((args.shopping as Record<string,unknown>)?.has_phone_new  ?? false),
        has_laptop_new: Boolean((args.shopping as Record<string,unknown>)?.has_laptop_new ?? false),
      },
      commute: {
        mode:       String((args.commute as Record<string,unknown>)?.mode       ?? 'car_petrol'),
        km_per_day: Number((args.commute as Record<string,unknown>)?.km_per_day ?? 20),
        work_days:  Number((args.commute as Record<string,unknown>)?.work_days  ?? 22),
      },
    }
    return calculateCO2(formData)
  }

  // Strip greentrace_ prefix and dispatch to agent tool
  const agentToolName = name.replace(/^greentrace_/, '')
  return dispatchTool(agentToolName, args)
}

// ─────────────────────────────────────────────────────────────────────────────
// Request handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Security: Bearer token auth ─────────────────────────────────────────────
  // Set MCP_SECRET in your .env.local. If not set, MCP access is open (dev only).
  const secret = process.env.MCP_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (token !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: MCPRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 },
    )
  }

  const { id, method, params } = body

  // ── MCP method dispatch ─────────────────────────────────────────────────────
  switch (method) {

    // Handshake — return server capabilities
    case 'initialize':
      return ok(id, {
        protocolVersion: '2024-11-05',
        capabilities:    { tools: {} },
        serverInfo:      { name: 'greentrace-mcp', version: '1.0.0' },
      })

    // List all available tools
    case 'tools/list':
      return ok(id, { tools: MCP_TOOLS })

    // Execute a tool
    case 'tools/call': {
      const toolName = params?.name as string | undefined
      const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>

      if (!toolName) {
        return err(id, -32602, 'Missing required parameter: name')
      }

      const knownNames = MCP_TOOLS.map(t => t.name)
      if (!knownNames.includes(toolName)) {
        return err(id, -32601, `Unknown tool: ${toolName}`)
      }

      try {
        const result = callMCPTool(toolName, toolArgs)
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Tool execution failed'
        return err(id, -32603, msg)
      }
    }

    default:
      return err(id, -32601, `Method not found: ${method}`)
  }
}

// MCP clients may send OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
