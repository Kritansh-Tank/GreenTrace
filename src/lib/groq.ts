import Groq from 'groq-sdk'

/**
 * Groq SDK client — shared across all API routes.
 * Model: llama-3.1-8b-instant
 *   Meta Llama 3.1 8B — confirmed available on Groq free tier with 30,000 TPM.
 *   Fast, supports tool-calling, ideal for the EcoAgent's multi-step ReAct loop
 *   without hitting the low TPM cap of larger models on the free tier.
 */
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

/** Primary model used by the GreenTrace EcoAgent. */
export const AGENT_MODEL = 'llama-3.1-8b-instant'
