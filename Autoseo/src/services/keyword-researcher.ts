import { getOpenAI } from '@/lib/openai'

export interface ResearchKeywordsParams {
  niche: string
  seedKeywords: string[]
  language: string
  count?: number
}

export interface KeywordSuggestion {
  term: string
  estimatedVolume: number
  estimatedDifficulty: number
  intent: 'informational' | 'transactional' | 'navigational'
  suggestedTitle: string
}

export async function researchKeywords(
  params: ResearchKeywordsParams
): Promise<KeywordSuggestion[]> {
  const { niche, seedKeywords, language, count = 20 } = params

  const systemPrompt = `You are an expert SEO keyword researcher with deep knowledge of search engine optimization.
You specialize in the "${niche}" niche and understand search intent, keyword difficulty, and volume patterns.

Your task is to generate ${count} keyword suggestions based on the provided seed keywords.
Language: ${language}

For each keyword, provide:
- term: The keyword phrase (long-tail preferred for lower difficulty)
- estimatedVolume: Realistic monthly search volume estimate (number)
- estimatedDifficulty: SEO difficulty score from 1 to 100 (1 = easy, 100 = very hard)
- intent: One of "informational", "transactional", or "navigational"
- suggestedTitle: A compelling article title targeting this keyword

Guidelines for realistic data:
- Long-tail keywords (3-5 words) typically have 100-5000 volume and 10-40 difficulty
- Medium-tail keywords (2-3 words) typically have 1000-50000 volume and 30-70 difficulty
- Head terms (1-2 words) typically have 10000-500000 volume and 60-95 difficulty
- Include a mix of all three types, favoring long-tail
- Informational intent keywords should include "how to", "what is", "guide", "tips", etc.
- Transactional intent keywords should include "buy", "best", "review", "price", "compare", etc.
- Navigational intent keywords relate to specific brands or tools

Respond with valid JSON in this format:
{
  "keywords": [
    {
      "term": "keyword phrase",
      "estimatedVolume": 1500,
      "estimatedDifficulty": 25,
      "intent": "informational",
      "suggestedTitle": "Article title for this keyword"
    }
  ]
}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate ${count} keyword suggestions for the "${niche}" niche based on these seed keywords: ${seedKeywords.join(', ')}. Respond in ${language}.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from OpenAI')
  }

  const parsed = JSON.parse(content) as { keywords: KeywordSuggestion[] }

  // Validate and sanitize results
  return parsed.keywords.map((kw) => ({
    term: kw.term,
    estimatedVolume: Math.max(0, Math.round(kw.estimatedVolume)),
    estimatedDifficulty: Math.min(100, Math.max(1, Math.round(kw.estimatedDifficulty))),
    intent: ['informational', 'transactional', 'navigational'].includes(kw.intent)
      ? kw.intent
      : 'informational',
    suggestedTitle: kw.suggestedTitle,
  }))
}
