import OpenAI from 'openai'

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY or OPENAI_API_KEY is not set')
    }
    _openai = new OpenAI({
      apiKey,
      baseURL: process.env.OPENROUTER_API_KEY
        ? 'https://openrouter.ai/api/v1'
        : 'https://api.openai.com/v1',
    })
  }
  return _openai
}
