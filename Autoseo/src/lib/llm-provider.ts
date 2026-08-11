import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// Multi-LLM Provider — supports OpenAI, OpenRouter, Anthropic Claude, Mistral, Gemini
// ---------------------------------------------------------------------------

export type LLMProvider = 'openai' | 'openrouter' | 'anthropic' | 'mistral' | 'gemini'

interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseURL: string
  defaultModel: string
}

const PROVIDER_CONFIGS: Record<LLMProvider, Omit<LLMConfig, 'apiKey'> & { envKey: string }> = {
  openrouter: {
    provider: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o',
  },
  openai: {
    provider: 'openai',
    envKey: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
  },
  anthropic: {
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6',
  },
  mistral: {
    provider: 'mistral',
    envKey: 'MISTRAL_API_KEY',
    baseURL: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
  },
  gemini: {
    provider: 'gemini',
    envKey: 'GEMINI_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.0-flash',
  },
}

// Order of preference for auto-detection
const PROVIDER_ORDER: LLMProvider[] = ['openrouter', 'openai', 'anthropic', 'mistral', 'gemini']

let _cachedClient: OpenAI | null = null
let _cachedProvider: LLMProvider | null = null

/**
 * Detect the available LLM provider from environment variables.
 * Returns the first provider with a configured API key.
 */
export function detectProvider(): LLMConfig | null {
  // Allow explicit provider selection
  const forced = process.env.LLM_PROVIDER as LLMProvider | undefined
  if (forced && PROVIDER_CONFIGS[forced]) {
    const config = PROVIDER_CONFIGS[forced]
    const apiKey = process.env[config.envKey]
    if (apiKey) {
      return { ...config, apiKey }
    }
  }

  // Auto-detect by checking env vars in priority order
  for (const provider of PROVIDER_ORDER) {
    const config = PROVIDER_CONFIGS[provider]
    const apiKey = process.env[config.envKey]
    if (apiKey) {
      return { ...config, apiKey }
    }
  }

  return null
}

/**
 * Get an OpenAI-compatible client for the detected LLM provider.
 * All providers expose an OpenAI-compatible API (OpenRouter, Mistral, Gemini all do).
 */
export function getLLMClient(): OpenAI {
  if (_cachedClient) return _cachedClient

  const config = detectProvider()
  if (!config) {
    throw new Error(
      'No LLM API key configured. Set one of: OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY'
    )
  }

  _cachedClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })
  _cachedProvider = config.provider

  console.log(`[llm] Using provider: ${config.provider} (model: ${config.defaultModel})`)
  return _cachedClient
}

/**
 * Get the default model for the current provider.
 * Can be overridden with LLM_MODEL env var.
 */
export function getDefaultModel(): string {
  const override = process.env.LLM_MODEL
  if (override) return override

  const config = detectProvider()
  return config?.defaultModel || 'gpt-4o'
}

/**
 * Get the current provider name.
 */
export function getCurrentProvider(): LLMProvider {
  if (_cachedProvider) return _cachedProvider
  const config = detectProvider()
  return config?.provider || 'openai'
}

/**
 * Generate a chat completion using the configured LLM provider.
 * This is the main entry point for all AI features.
 */
export async function chatCompletion(params: {
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
  model?: string
}): Promise<string> {
  const client = getLLMClient()
  const model = params.model || getDefaultModel()

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 4096,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error(`No content returned from ${model}`)
  }

  return content
}
